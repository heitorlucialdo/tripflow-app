-- ============================================================
-- 011_privacidade_e_localizacao.sql
-- Ordem de aplicação num banco novo:
--   000_schema_completo -> 001_profiles_campos_extras -> 001_locations_ttl_rls
--   -> 010_colaboracao_viagem -> 011 (este)
-- Os antigos 001_profiles..009_indexes duplicavam o 000 e foram movidos
-- para supabase/legado/.
-- ============================================================


-- ── 1. Índices que só existiam nos arquivos legados ───────────

CREATE INDEX IF NOT EXISTS profiles_email_idx      ON profiles(email);
CREATE INDEX IF NOT EXISTS trips_destination_iata_idx ON trips(destination_iata) WHERE destination_iata IS NOT NULL;
CREATE INDEX IF NOT EXISTS checklist_place_idx     ON checklist_items(trip_id, place_name);
CREATE INDEX IF NOT EXISTS checklist_user_id_idx   ON checklist_items(user_id);
CREATE INDEX IF NOT EXISTS expenses_paid_by_idx    ON expenses(paid_by);
CREATE INDEX IF NOT EXISTS photos_uploader_id_idx  ON photos(uploader_id);


-- ── 2. Dados pessoais fora de profiles ────────────────────────
-- profiles é legível por todos os membros da viagem (inclusive convidados
-- anônimos). CPF, telefone e contato de emergência ficam numa tabela que
-- só o próprio dono lê.

CREATE TABLE IF NOT EXISTS profiles_private (
  id              uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  phone           text,
  cpf             text,
  emergency_email text,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_private_select_own" ON profiles_private;
DROP POLICY IF EXISTS "profiles_private_insert_own" ON profiles_private;
DROP POLICY IF EXISTS "profiles_private_update_own" ON profiles_private;

CREATE POLICY "profiles_private_select_own" ON profiles_private
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_private_insert_own" ON profiles_private
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_private_update_own" ON profiles_private
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS profiles_private_updated_at ON profiles_private;
CREATE TRIGGER profiles_private_updated_at
  BEFORE UPDATE ON profiles_private
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO profiles_private (id, phone, cpf, emergency_email)
SELECT id, phone, cpf, emergency_email FROM profiles
WHERE phone IS NOT NULL OR cpf IS NOT NULL OR emergency_email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

ALTER TABLE profiles
  DROP COLUMN IF EXISTS phone,
  DROP COLUMN IF EXISTS cpf,
  DROP COLUMN IF EXISTS emergency_email;


-- ── 3. Avatares ───────────────────────────────────────────────
-- Leitura pública (a foto aparece para o grupo); escrita só na própria pasta.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_read_all"    ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_own"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own"  ON storage.objects;

CREATE POLICY "avatars_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ── 4. Localização compartilhada: opt-in com prazo ────────────
-- As coordenadas chegam cifradas (AES-256-GCM no cliente) com a chave da
-- viagem, que só membros leem. share_until define até quando o membro
-- aparece no mapa; depois disso a linha some para os outros.

CREATE TABLE IF NOT EXISTS trip_secrets (
  trip_id      uuid        PRIMARY KEY REFERENCES trips(id) ON DELETE CASCADE,
  location_key text        NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'base64'),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trip_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trip_secrets_select" ON trip_secrets;
CREATE POLICY "trip_secrets_select" ON trip_secrets
  FOR SELECT USING (is_trip_member(trip_id));

-- Viagens já existentes e as próximas ganham chave automaticamente.
INSERT INTO trip_secrets (trip_id) SELECT id FROM trips ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION create_trip_secret()
RETURNS trigger AS $$
BEGIN
  INSERT INTO trip_secrets (trip_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS on_trip_created_secret ON trips;
CREATE TRIGGER on_trip_created_secret
  AFTER INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION create_trip_secret();

-- lat_enc / lng_enc guardam "iv.cifra" em base64, um IV por coordenada.
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS share_until timestamptz NOT NULL DEFAULT now();

DROP POLICY IF EXISTS "locations_select" ON locations;
DROP POLICY IF EXISTS "locations_insert" ON locations;
DROP POLICY IF EXISTS "locations_update" ON locations;
DROP POLICY IF EXISTS "locations_delete" ON locations;

-- O dono sempre vê a própria linha (para poder encerrar o compartilhamento);
-- os outros só enquanto está dentro do prazo e foi atualizada há menos de 10 min.
CREATE POLICY "locations_select" ON locations
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      is_trip_member(trip_id)
      AND share_until > now()
      AND updated_at > now() - interval '10 minutes'
    )
  );

CREATE POLICY "locations_insert" ON locations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND is_trip_member(trip_id)
    AND share_until <= now() + interval '24 hours'
  );

CREATE POLICY "locations_update" ON locations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_trip_member(trip_id)
    AND share_until <= now() + interval '24 hours'
  );

CREATE POLICY "locations_delete" ON locations
  FOR DELETE USING (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
  END IF;
END $$;


-- ── 5. Permissões da Data API ─────────────────────────────────
-- O projeto foi criado sem "grant API access automatically". O RLS continua
-- decidindo quais linhas cada usuário vê; isto só libera o acesso às tabelas.
-- Convidados por link usam login anônimo, que também é o papel authenticated.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION invite_preview(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invite(uuid)  TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
