-- ============================================================
-- 005_photos.sql
-- Fotos compartilhadas da trip — armazenadas no Supabase Storage
-- ============================================================

CREATE TABLE photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  uploader_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text        NOT NULL, -- ex: trip-photos/{trip_id}/{photo_id}.jpg
  caption      text,
  taken_at     timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX photos_trip_id_idx ON photos(trip_id);
CREATE INDEX photos_uploader_id_idx ON photos(uploader_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Só membros da trip veem as fotos
CREATE POLICY "photos_select" ON photos
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Só membros da trip fazem upload
CREATE POLICY "photos_insert" ON photos
  FOR INSERT WITH CHECK (
    auth.uid() = uploader_id
    AND trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Uploader ou admin da trip deleta a foto
CREATE POLICY "photos_delete" ON photos
  FOR DELETE USING (
    auth.uid() = uploader_id
    OR trip_id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── Tabela de curtidas ────────────────────────────────────────
CREATE TABLE photo_likes (
  photo_id   uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (photo_id, user_id)
);

ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

-- Só membros da trip veem curtidas de fotos da trip
CREATE POLICY "photo_likes_select" ON photo_likes
  FOR SELECT USING (
    photo_id IN (
      SELECT id FROM photos
      WHERE trip_id IN (
        SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
      )
    )
  );

-- Membro curte foto da própria trip
CREATE POLICY "photo_likes_insert" ON photo_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND photo_id IN (
      SELECT id FROM photos
      WHERE trip_id IN (
        SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
      )
    )
  );

-- Usuário remove própria curtida
CREATE POLICY "photo_likes_delete" ON photo_likes
  FOR DELETE USING (auth.uid() = user_id);
