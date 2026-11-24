-- ============================================================
-- 010_colaboracao_viagem.sql
-- Viagens reais em grupo: convite por link, gastos com acerto por Pix,
-- roteiro colaborativo e orçamento por pessoa.
-- Rodar no SQL Editor do Supabase depois do 000_schema_completo.sql.
-- ============================================================


-- ── 1. Funções auxiliares de pertencimento ────────────────────
-- SECURITY DEFINER evita "infinite recursion detected in policy" quando a
-- política de trip_members consulta a própria trip_members.

CREATE OR REPLACE FUNCTION is_trip_member(p_trip_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = p_trip_id AND user_id = p_user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_trip_admin(p_trip_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = p_trip_id AND user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ── 2. trip_members e trips sem recursão ──────────────────────

DROP POLICY IF EXISTS "trip_members_select" ON trip_members;
DROP POLICY IF EXISTS "trip_members_insert" ON trip_members;
DROP POLICY IF EXISTS "trip_members_update" ON trip_members;
DROP POLICY IF EXISTS "trip_members_delete" ON trip_members;

CREATE POLICY "trip_members_select" ON trip_members
  FOR SELECT USING (is_trip_member(trip_id));

CREATE POLICY "trip_members_insert" ON trip_members
  FOR INSERT WITH CHECK (is_trip_admin(trip_id));

CREATE POLICY "trip_members_update" ON trip_members
  FOR UPDATE USING (is_trip_admin(trip_id));

CREATE POLICY "trip_members_delete" ON trip_members
  FOR DELETE USING (auth.uid() = user_id OR is_trip_admin(trip_id));

-- O INSERT ... RETURNING da criação roda antes do trigger que adiciona o
-- criador como membro; sem esta política o app não recebe a trip criada.
DROP POLICY IF EXISTS "trips_select_creator" ON trips;
CREATE POLICY "trips_select_creator" ON trips
  FOR SELECT USING (auth.uid() = created_by);


-- ── 3. Perfil: chave Pix e usuários convidados sem e-mail ─────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix_key text;

-- Convidados entram por login anônimo (sem e-mail); o trigger original
-- falharia no NOT NULL de profiles.email.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Viajante'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ── 4. Convites reutilizáveis (link para o grupo do WhatsApp) ─

ALTER TABLE invites ADD COLUMN IF NOT EXISTS multi_use boolean NOT NULL DEFAULT false;

-- Prévia pública do convite: quem recebe o link ainda não é membro e
-- não passaria pelas políticas de trips.
CREATE OR REPLACE FUNCTION invite_preview(p_token uuid)
RETURNS jsonb AS $$
DECLARE
  v_invite invites%ROWTYPE;
  v_trip   trips%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM invites WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;
  IF NOT v_invite.multi_use AND v_invite.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'token_already_used');
  END IF;

  SELECT * INTO v_trip FROM trips WHERE id = v_invite.trip_id;

  RETURN jsonb_build_object(
    'trip_id',     v_trip.id,
    'name',        v_trip.name,
    'origin',      v_trip.origin,
    'destination', v_trip.destination,
    'start_date',  v_trip.start_date,
    'end_date',    v_trip.end_date,
    'members', (
      SELECT COALESCE(jsonb_agg(COALESCE(NULLIF(p.nickname, ''), split_part(p.name, ' ', 1))), '[]'::jsonb)
      FROM trip_members tm JOIN profiles p ON p.id = tm.user_id
      WHERE tm.trip_id = v_trip.id
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION accept_invite(p_token uuid)
RETURNS jsonb AS $$
DECLARE
  v_invite  invites%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invite FROM invites WHERE token = p_token FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'token_expired');
  END IF;
  IF NOT v_invite.multi_use AND v_invite.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'token_already_used');
  END IF;

  IF is_trip_member(v_invite.trip_id, v_user_id) THEN
    RETURN jsonb_build_object('error', 'already_member', 'trip_id', v_invite.trip_id);
  END IF;

  UPDATE invites SET used_at = now(), used_by = v_user_id WHERE id = v_invite.id;

  INSERT INTO trip_members (trip_id, user_id, role)
  VALUES (v_invite.trip_id, v_user_id, 'member');

  RETURN jsonb_build_object('success', true, 'trip_id', v_invite.trip_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ── 5. Gastos: qualquer membro lança, pagador precisa ser do grupo ─

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid();

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (
    is_trip_member(trip_id)
    AND is_trip_member(trip_id, paid_by)
    AND created_by = auth.uid()
  );

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (
    auth.uid() IN (paid_by, created_by) OR is_trip_admin(trip_id)
  )
  WITH CHECK (is_trip_member(trip_id, paid_by));

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (
    auth.uid() IN (paid_by, created_by) OR is_trip_admin(trip_id)
  );


-- ── 6. Acertos (pagamentos entre membros) ─────────────────────
-- Quem pagou registra; quem recebeu confirma. Só acertos confirmados
-- entram no saldo.

CREATE TABLE IF NOT EXISTS settlements (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid          NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_user    uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user      uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount       numeric(10,2) NOT NULL,
  confirmed_at timestamptz,
  created_at   timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT settlements_amount_positive CHECK (amount > 0),
  CONSTRAINT settlements_distinct_users CHECK (from_user <> to_user)
);

CREATE INDEX IF NOT EXISTS settlements_trip_id_idx ON settlements(trip_id);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements_select" ON settlements
  FOR SELECT USING (is_trip_member(trip_id));

CREATE POLICY "settlements_insert" ON settlements
  FOR INSERT WITH CHECK (
    auth.uid() = from_user
    AND is_trip_member(trip_id)
    AND is_trip_member(trip_id, to_user)
    AND confirmed_at IS NULL
  );

CREATE POLICY "settlements_update" ON settlements
  FOR UPDATE USING (auth.uid() = to_user)
  WITH CHECK (auth.uid() = to_user);

CREATE POLICY "settlements_delete" ON settlements
  FOR DELETE USING (
    (auth.uid() = from_user AND confirmed_at IS NULL) OR auth.uid() = to_user
  );


-- ── 7. Roteiro colaborativo ───────────────────────────────────

CREATE TABLE IF NOT EXISTS itinerary_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day        date        NOT NULL,
  position   integer     NOT NULL DEFAULT 0,
  title      text        NOT NULL,
  start_time time,
  notes      text,
  address    text,
  lat        double precision,
  lng        double precision,
  created_by uuid        REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT itinerary_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT itinerary_coords_pair CHECK ((lat IS NULL) = (lng IS NULL))
);

CREATE INDEX IF NOT EXISTS itinerary_items_trip_day_idx ON itinerary_items(trip_id, day, position);

ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "itinerary_select" ON itinerary_items
  FOR SELECT USING (is_trip_member(trip_id));

CREATE POLICY "itinerary_insert" ON itinerary_items
  FOR INSERT WITH CHECK (is_trip_member(trip_id) AND created_by = auth.uid());

CREATE POLICY "itinerary_update" ON itinerary_items
  FOR UPDATE USING (is_trip_member(trip_id)) WITH CHECK (is_trip_member(trip_id));

CREATE POLICY "itinerary_delete" ON itinerary_items
  FOR DELETE USING (is_trip_member(trip_id));


-- ── 8. Orçamento por pessoa ───────────────────────────────────
-- split = 'group': valor total dividido entre os membros (ex.: casa)
-- split = 'person': valor que cada membro paga (ex.: ingresso)

CREATE TABLE IF NOT EXISTS budget_items (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid          NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category   text          NOT NULL DEFAULT 'Outros',
  title      text          NOT NULL,
  amount     numeric(10,2) NOT NULL,
  split      text          NOT NULL DEFAULT 'group',
  status     text          NOT NULL DEFAULT 'idea',
  url        text,
  created_by uuid          REFERENCES profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT budget_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT budget_split_check CHECK (split IN ('group', 'person')),
  CONSTRAINT budget_status_check CHECK (status IN ('idea', 'booked')),
  CONSTRAINT budget_category_check CHECK (
    category IN ('Hospedagem','Transporte','Passeios','Alimentação','Outros')
  ),
  CONSTRAINT budget_url_http CHECK (url IS NULL OR url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS budget_items_trip_id_idx ON budget_items(trip_id);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_select" ON budget_items
  FOR SELECT USING (is_trip_member(trip_id));

CREATE POLICY "budget_insert" ON budget_items
  FOR INSERT WITH CHECK (is_trip_member(trip_id) AND created_by = auth.uid());

CREATE POLICY "budget_update" ON budget_items
  FOR UPDATE USING (is_trip_member(trip_id)) WITH CHECK (is_trip_member(trip_id));

CREATE POLICY "budget_delete" ON budget_items
  FOR DELETE USING (is_trip_member(trip_id));


-- ── 9. Realtime ───────────────────────────────────────────────

-- Adiciona uma a uma, pulando as que já estão na publicação (ADD TABLE
-- falha se a tabela já foi adicionada antes pelo painel).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['expenses', 'settlements', 'itinerary_items', 'budget_items', 'trip_members'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
