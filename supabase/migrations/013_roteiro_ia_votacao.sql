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
