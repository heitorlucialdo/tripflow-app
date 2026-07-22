-- ============================================================
-- 004_invites.sql
-- Convites por link — token único, uso único, expira em 48h
-- ============================================================

CREATE TABLE invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  token       uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  used_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Token só pode ser marcado como usado uma vez
  CONSTRAINT invites_used_consistency CHECK (
    (used_at IS NULL AND used_by IS NULL) OR
    (used_at IS NOT NULL AND used_by IS NOT NULL)
  )
);

CREATE INDEX invites_token_idx ON invites(token);
CREATE INDEX invites_trip_id_idx ON invites(trip_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Admin da trip vê os convites que gerou
CREATE POLICY "invites_select" ON invites
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Apenas admin cria convites
CREATE POLICY "invites_insert" ON invites
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND trip_id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Apenas admin cancela convite não usado
CREATE POLICY "invites_delete" ON invites
  FOR DELETE USING (
    used_at IS NULL
    AND trip_id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── Função de aceitação de convite (SECURITY DEFINER) ────────
-- Roda com privilégios do sistema, não do usuário
-- Garante atomicidade: validar + usar + adicionar membro em uma transação
CREATE OR REPLACE FUNCTION accept_invite(p_token uuid)
RETURNS jsonb AS $$
DECLARE
  v_invite  invites%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  -- Usuário precisa estar autenticado
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Busca o convite com lock para evitar uso simultâneo (race condition)
  SELECT * INTO v_invite
  FROM invites
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'token_already_used');
  END IF;

  -- Verifica se usuário já é membro da trip
  IF EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = v_invite.trip_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('error', 'already_member', 'trip_id', v_invite.trip_id);
  END IF;

  -- Marca convite como usado
  UPDATE invites
  SET used_at = now(), used_by = v_user_id
  WHERE id = v_invite.id;

  -- Adiciona usuário como membro da trip
  INSERT INTO trip_members (trip_id, user_id, role)
  VALUES (v_invite.trip_id, v_user_id, 'member');

  RETURN jsonb_build_object('success', true, 'trip_id', v_invite.trip_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
