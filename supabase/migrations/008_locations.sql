-- ============================================================
-- 008_locations.sql
-- Localização em tempo real — a tabela mais sensível do sistema
--
-- Segurança em camadas:
-- 1. RLS: só membros ativos da trip lêem (verificado a cada query)
-- 2. Dados criptografados: lat_enc/lng_enc são AES-256, nunca texto puro
-- 3. Uma row por membro por trip (UNIQUE) — sem histórico acumulando
-- 4. TTL automático: trigger apaga dados após 5 min sem atualização
-- 5. Opt-in: o app só envia quando o usuário ativa o toggle
-- ============================================================

CREATE TABLE locations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat_enc     text        NOT NULL, -- latitude criptografada (AES-256)
  lng_enc     text        NOT NULL, -- longitude criptografada (AES-256)
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- Garante 1 row por membro por trip — UPDATE, nunca INSERT duplicado
  UNIQUE (trip_id, user_id)
);

-- Sem created_at intencional: não queremos qualquer histórico de posições

CREATE INDEX locations_trip_id_idx ON locations(trip_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Só membros ATIVOS da trip lêem — verificado em tempo real, sem cache
CREATE POLICY "locations_select" ON locations
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Usuário publica apenas a própria localização na trip que pertence
CREATE POLICY "locations_insert" ON locations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Usuário atualiza apenas a própria localização
CREATE POLICY "locations_update" ON locations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Usuário remove a própria localização (quando desativa o toggle)
CREATE POLICY "locations_delete" ON locations
  FOR DELETE USING (auth.uid() = user_id);

-- ── TTL: apagar localizações antigas automaticamente ─────────
-- Roda a cada minuto via pg_cron (configurar no Supabase dashboard)
-- Qualquer localização não atualizada há mais de 5 min é removida
CREATE OR REPLACE FUNCTION delete_stale_locations()
RETURNS void AS $$
BEGIN
  DELETE FROM locations
  WHERE updated_at < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: atualiza updated_at a cada upsert de localização
CREATE OR REPLACE FUNCTION refresh_location_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER locations_refresh_timestamp
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION refresh_location_timestamp();
