-- ============================================================
-- 009_indexes.sql
-- Índices de performance — rodados por último, após todas as tabelas
-- ============================================================

-- profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- trips
CREATE INDEX IF NOT EXISTS trips_created_by_idx ON trips(created_by);
CREATE INDEX IF NOT EXISTS trips_start_date_idx ON trips(start_date);
CREATE INDEX IF NOT EXISTS trips_destination_iata_idx ON trips(destination_iata)
  WHERE destination_iata IS NOT NULL;

-- invites
CREATE INDEX IF NOT EXISTS invites_expires_at_idx ON invites(expires_at)
  WHERE used_at IS NULL; -- índice parcial: só convites ainda válidos

-- photos
CREATE INDEX IF NOT EXISTS photos_taken_at_idx ON photos(trip_id, taken_at DESC);

-- expenses
CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(trip_id, date DESC);

-- checklist_items
CREATE INDEX IF NOT EXISTS checklist_place_idx ON checklist_items(trip_id, place_name);
