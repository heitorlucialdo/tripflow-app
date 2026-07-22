-- ============================================================
-- 007_checklist.sql
-- Checklist de lugares visitados por trip
-- Cada membro marca independentemente
-- ============================================================

CREATE TABLE checklist_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_name  text        NOT NULL,
  checked_at  timestamptz, -- null = não visitado, preenchido = visitado

  -- Cada usuário tem seu próprio estado por lugar por trip
  UNIQUE (trip_id, user_id, place_name)
);

CREATE INDEX checklist_trip_id_idx ON checklist_items(trip_id);
CREATE INDEX checklist_user_id_idx ON checklist_items(user_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Membros da trip veem o checklist de todos os membros
CREATE POLICY "checklist_select" ON checklist_items
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Membro insere e atualiza apenas o próprio estado
CREATE POLICY "checklist_insert" ON checklist_items
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "checklist_update" ON checklist_items
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checklist_delete" ON checklist_items
  FOR DELETE USING (auth.uid() = user_id);
