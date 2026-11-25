-- TripFlow: migrations 010 a 013 em sequência.
-- Pode rodar mais de uma vez: tudo em uma transação, e cada política é recriada.
-- Supabase > SQL Editor > New query > colar tudo > Run.

BEGIN;

-- ════════════════ 010_colaboracao_viagem.sql ════════════════
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

DROP POLICY IF EXISTS "trip_members_insert" ON trip_members;
CREATE POLICY "trip_members_insert" ON trip_members
  FOR INSERT WITH CHECK (is_trip_admin(trip_id));

DROP POLICY IF EXISTS "trip_members_update" ON trip_members;
CREATE POLICY "trip_members_update" ON trip_members
  FOR UPDATE USING (is_trip_admin(trip_id));

DROP POLICY IF EXISTS "trip_members_delete" ON trip_members;
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

DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (
    auth.uid() IN (paid_by, created_by) OR is_trip_admin(trip_id)
  )
  WITH CHECK (is_trip_member(trip_id, paid_by));

DROP POLICY IF EXISTS "expenses_delete" ON expenses;
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

DROP POLICY IF EXISTS "settlements_select" ON settlements;
CREATE POLICY "settlements_select" ON settlements
  FOR SELECT USING (is_trip_member(trip_id));

DROP POLICY IF EXISTS "settlements_insert" ON settlements;
CREATE POLICY "settlements_insert" ON settlements
  FOR INSERT WITH CHECK (
    auth.uid() = from_user
    AND is_trip_member(trip_id)
    AND is_trip_member(trip_id, to_user)
    AND confirmed_at IS NULL
  );

DROP POLICY IF EXISTS "settlements_update" ON settlements;
CREATE POLICY "settlements_update" ON settlements
  FOR UPDATE USING (auth.uid() = to_user)
  WITH CHECK (auth.uid() = to_user);

DROP POLICY IF EXISTS "settlements_delete" ON settlements;
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

DROP POLICY IF EXISTS "itinerary_select" ON itinerary_items;
CREATE POLICY "itinerary_select" ON itinerary_items
  FOR SELECT USING (is_trip_member(trip_id));

DROP POLICY IF EXISTS "itinerary_insert" ON itinerary_items;
CREATE POLICY "itinerary_insert" ON itinerary_items
  FOR INSERT WITH CHECK (is_trip_member(trip_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "itinerary_update" ON itinerary_items;
CREATE POLICY "itinerary_update" ON itinerary_items
  FOR UPDATE USING (is_trip_member(trip_id)) WITH CHECK (is_trip_member(trip_id));

DROP POLICY IF EXISTS "itinerary_delete" ON itinerary_items;
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

DROP POLICY IF EXISTS "budget_select" ON budget_items;
CREATE POLICY "budget_select" ON budget_items
  FOR SELECT USING (is_trip_member(trip_id));

DROP POLICY IF EXISTS "budget_insert" ON budget_items;
CREATE POLICY "budget_insert" ON budget_items
  FOR INSERT WITH CHECK (is_trip_member(trip_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "budget_update" ON budget_items;
CREATE POLICY "budget_update" ON budget_items
  FOR UPDATE USING (is_trip_member(trip_id)) WITH CHECK (is_trip_member(trip_id));

DROP POLICY IF EXISTS "budget_delete" ON budget_items;
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

-- ════════════════ 011_privacidade_e_localizacao.sql ════════════════
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
DROP POLICY IF EXISTS "profiles_private_insert_own" ON profiles_private;
CREATE POLICY "profiles_private_insert_own" ON profiles_private
  FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_private_update_own" ON profiles_private;
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
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
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
DROP POLICY IF EXISTS "locations_select" ON locations;
CREATE POLICY "locations_select" ON locations
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      is_trip_member(trip_id)
      AND share_until > now()
      AND updated_at > now() - interval '10 minutes'
    )
  );

DROP POLICY IF EXISTS "locations_insert" ON locations;
CREATE POLICY "locations_insert" ON locations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND is_trip_member(trip_id)
    AND share_until <= now() + interval '24 hours'
  );

DROP POLICY IF EXISTS "locations_update" ON locations;
CREATE POLICY "locations_update" ON locations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_trip_member(trip_id)
    AND share_until <= now() + interval '24 hours'
  );

DROP POLICY IF EXISTS "locations_delete" ON locations;
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

-- ════════════════ 012_avatars_sem_listagem.sql ════════════════
-- O bucket avatars é público: as fotos abrem pela URL pública sem passar pelo RLS.
-- A política de leitura ampla só servia para permitir LISTAR todos os arquivos,
-- o que expõe os ids de todos os usuários. Leitura via API fica restrita à própria
-- pasta (necessária para o upload com upsert do Perfil).

DROP POLICY IF EXISTS "avatars_read_all" ON storage.objects;
DROP POLICY IF EXISTS "avatars_read_own" ON storage.objects;

CREATE POLICY "avatars_read_own" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ════════════════ 013_roteiro_ia_votacao.sql ════════════════
-- Roteiro gerado por IA, rota no globo e votação dos passeios pelo grupo

-- ── 1. Viagem: coordenadas da rota e preferências do roteiro ──
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS origin_lat       double precision,
  ADD COLUMN IF NOT EXISTS origin_lng       double precision,
  ADD COLUMN IF NOT EXISTS destination_lat  double precision,
  ADD COLUMN IF NOT EXISTS destination_lng  double precision,
  ADD COLUMN IF NOT EXISTS lodging          text,
  ADD COLUMN IF NOT EXISTS hours_per_day    smallint NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS tier             text;

DO $$ BEGIN
  ALTER TABLE trips ADD CONSTRAINT trips_hours_per_day_range CHECK (hours_per_day BETWEEN 1 AND 18);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE trips ADD CONSTRAINT trips_tier_valid
    CHECK (tier IS NULL OR tier IN ('economico', 'medio', 'premium', 'personalizado'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Itens do roteiro: categoria, preço e duração ──
ALTER TABLE itinerary_items
  ADD COLUMN IF NOT EXISTS category      text NOT NULL DEFAULT 'passeio',
  ADD COLUMN IF NOT EXISTS cost_level    smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS duration_min  smallint,
  ADD COLUMN IF NOT EXISTS image_url     text;

DO $$ BEGIN
  ALTER TABLE itinerary_items ADD CONSTRAINT itinerary_category_valid
    CHECK (category IN ('passeio', 'restaurante', 'bar', 'balada', 'cafe', 'transporte'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE itinerary_items ADD CONSTRAINT itinerary_cost_range CHECK (cost_level BETWEEN 0 AND 3);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Votos: cada membro diz se vai, não vai ou vai em outro passeio ──
CREATE TABLE IF NOT EXISTS itinerary_votes (
  item_id      uuid        NOT NULL REFERENCES itinerary_items(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  trip_id      uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  choice       text        NOT NULL,
  alt_item_id  uuid        REFERENCES itinerary_items(id) ON DELETE SET NULL,
  note         text,
  updated_at   timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (item_id, user_id),
  CONSTRAINT vote_choice_valid CHECK (choice IN ('vou', 'nao_vou', 'outro')),
  CONSTRAINT vote_note_size CHECK (note IS NULL OR length(note) <= 200)
);

CREATE INDEX IF NOT EXISTS itinerary_votes_trip_idx ON itinerary_votes(trip_id);

-- trip_id é derivado do item para ninguém votar num item de outra viagem
CREATE OR REPLACE FUNCTION itinerary_votes_fill_trip() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT trip_id INTO NEW.trip_id FROM itinerary_items WHERE id = NEW.item_id;
  IF NEW.trip_id IS NULL THEN RAISE EXCEPTION 'item inexistente'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS itinerary_votes_fill_trip ON itinerary_votes;
CREATE TRIGGER itinerary_votes_fill_trip
  BEFORE INSERT OR UPDATE ON itinerary_votes
  FOR EACH ROW EXECUTE FUNCTION itinerary_votes_fill_trip();

ALTER TABLE itinerary_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "votes_select" ON itinerary_votes;
CREATE POLICY "votes_select" ON itinerary_votes
  FOR SELECT USING (is_trip_member(trip_id));

DROP POLICY IF EXISTS "votes_insert" ON itinerary_votes;
CREATE POLICY "votes_insert" ON itinerary_votes
  FOR INSERT WITH CHECK (user_id = auth.uid() AND is_trip_member(trip_id));

DROP POLICY IF EXISTS "votes_update" ON itinerary_votes;
CREATE POLICY "votes_update" ON itinerary_votes
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND is_trip_member(trip_id));

DROP POLICY IF EXISTS "votes_delete" ON itinerary_votes;
CREATE POLICY "votes_delete" ON itinerary_votes
  FOR DELETE USING (user_id = auth.uid());

-- ── 4. Realtime: votos e roteiro atualizam ao vivo para o grupo ──
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['itinerary_votes', 'itinerary_items'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
