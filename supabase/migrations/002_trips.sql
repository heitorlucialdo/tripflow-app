-- ============================================================
-- 002_trips.sql
-- Viagens — qualquer origem → qualquer destino
-- ============================================================

CREATE TABLE trips (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  origin              text        NOT NULL,
  destination         text        NOT NULL,
  origin_iata         text,
  destination_iata    text,
  start_date          date        NOT NULL,
  end_date            date        NOT NULL,
  cover_image_url     text,
  created_by          uuid        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trips_dates_check CHECK (end_date >= start_date),
  CONSTRAINT trips_iata_format CHECK (
    origin_iata IS NULL OR (length(origin_iata) = 3 AND origin_iata = upper(origin_iata))
  ),
  CONSTRAINT trips_iata_dest_format CHECK (
    destination_iata IS NULL OR (length(destination_iata) = 3 AND destination_iata = upper(destination_iata))
  )
);

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Só membros da trip veem a trip
CREATE POLICY "trips_select" ON trips
  FOR SELECT USING (
    id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Qualquer usuário autenticado cria uma trip
CREATE POLICY "trips_insert" ON trips
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Só o criador (admin) edita a trip
CREATE POLICY "trips_update" ON trips
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Só o criador deleta (soft delete preferível no futuro)
CREATE POLICY "trips_delete" ON trips
  FOR DELETE USING (auth.uid() = created_by);
