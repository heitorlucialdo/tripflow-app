-- ============================================================
-- SCHEMA COMPLETO — Viagem App
-- Rodar tudo de uma vez no SQL Editor do Supabase
-- Ordem: tabelas → triggers → RLS → políticas → funções → índices
-- ============================================================


-- ── 1. TABELAS ───────────────────────────────────────────────

CREATE TABLE profiles (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  avatar_url text,
  email      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trips (
  id               uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text  NOT NULL,
  origin           text  NOT NULL,
  destination      text  NOT NULL,
  origin_iata      text,
  destination_iata text,
  start_date       date  NOT NULL,
  end_date         date  NOT NULL,
  cover_image_url  text,
  created_by       uuid  NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trips_dates_check CHECK (end_date >= start_date),
  CONSTRAINT trips_iata_origin_format CHECK (
    origin_iata IS NULL OR (length(origin_iata) = 3 AND origin_iata = upper(origin_iata))
  ),
  CONSTRAINT trips_iata_dest_format CHECK (
    destination_iata IS NULL OR (length(destination_iata) = 3 AND destination_iata = upper(destination_iata))
  )
);

CREATE TABLE trip_members (
  trip_id   uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (trip_id, user_id),
  CONSTRAINT trip_members_role_check CHECK (role IN ('admin', 'member'))
);

CREATE TABLE invites (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  token      uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  used_by    uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT invites_used_consistency CHECK (
    (used_at IS NULL AND used_by IS NULL) OR
    (used_at IS NOT NULL AND used_by IS NOT NULL)
  )
);

CREATE TABLE photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  uploader_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  caption      text,
  taken_at     timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE photo_likes (
  photo_id   uuid        NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (photo_id, user_id)
);

CREATE TABLE expenses (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid          NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  description  text          NOT NULL,
  amount       numeric(10,2) NOT NULL,
  category     text          NOT NULL DEFAULT 'Outros',
  paid_by      uuid          NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  participants uuid[]        NOT NULL,
  date         date          NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT expenses_amount_positive CHECK (amount > 0),
  CONSTRAINT expenses_category_check CHECK (
    category IN ('Comida','Atração','Transporte','Hospedagem','Compras','Bebida','Outros')
  ),
  CONSTRAINT expenses_participants_not_empty CHECK (array_length(participants, 1) > 0)
);

CREATE TABLE checklist_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_name text        NOT NULL,
  checked_at timestamptz,

  UNIQUE (trip_id, user_id, place_name)
);

CREATE TABLE locations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat_enc    text        NOT NULL,
  lng_enc    text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (trip_id, user_id)
);


-- ── 2. FUNÇÕES E TRIGGERS ────────────────────────────────────

-- updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Cria profile automaticamente quando usuário faz signup Google
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ao criar trip, adiciona criador como admin automaticamente
CREATE OR REPLACE FUNCTION add_trip_creator_as_admin()
RETURNS trigger AS $$
BEGIN
  INSERT INTO trip_members (trip_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION add_trip_creator_as_admin();

-- Atualiza updated_at de locations a cada upsert
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

-- Apaga localizações com mais de 5 minutos (chamada pelo pg_cron)
CREATE OR REPLACE FUNCTION delete_stale_locations()
RETURNS void AS $$
BEGIN
  DELETE FROM locations WHERE updated_at < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 3. HABILITAR RLS ─────────────────────────────────────────

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations      ENABLE ROW LEVEL SECURITY;


-- ── 4. POLÍTICAS RLS ─────────────────────────────────────────
-- Todas as tabelas já existem aqui, sem referências pendentes

-- profiles
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_trip_members" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT tm.user_id FROM trip_members tm
      WHERE tm.trip_id IN (
        SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- trips
CREATE POLICY "trips_select" ON trips
  FOR SELECT USING (
    id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "trips_insert" ON trips
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trips_update" ON trips
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trips_delete" ON trips
  FOR DELETE USING (auth.uid() = created_by);

-- trip_members
CREATE POLICY "trip_members_select" ON trip_members
  FOR SELECT USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "trip_members_insert" ON trip_members
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "trip_members_update" ON trip_members
  FOR UPDATE USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "trip_members_delete" ON trip_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- invites
CREATE POLICY "invites_select" ON invites
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "invites_insert" ON invites
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "invites_delete" ON invites
  FOR DELETE USING (
    used_at IS NULL
    AND trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- photos
CREATE POLICY "photos_select" ON photos
  FOR SELECT USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "photos_insert" ON photos
  FOR INSERT WITH CHECK (
    auth.uid() = uploader_id
    AND trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "photos_delete" ON photos
  FOR DELETE USING (
    auth.uid() = uploader_id
    OR trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- photo_likes
CREATE POLICY "photo_likes_select" ON photo_likes
  FOR SELECT USING (
    photo_id IN (
      SELECT id FROM photos
      WHERE trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "photo_likes_insert" ON photo_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND photo_id IN (
      SELECT id FROM photos
      WHERE trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "photo_likes_delete" ON photo_likes
  FOR DELETE USING (auth.uid() = user_id);

-- expenses
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (
    auth.uid() = paid_by
    AND trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (
    auth.uid() = paid_by
    OR trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (
    auth.uid() = paid_by
    OR trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- checklist_items
CREATE POLICY "checklist_select" ON checklist_items
  FOR SELECT USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "checklist_insert" ON checklist_items
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "checklist_update" ON checklist_items
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checklist_delete" ON checklist_items
  FOR DELETE USING (auth.uid() = user_id);

-- locations
CREATE POLICY "locations_select" ON locations
  FOR SELECT USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "locations_insert" ON locations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "locations_update" ON locations
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
  );

CREATE POLICY "locations_delete" ON locations
  FOR DELETE USING (auth.uid() = user_id);


-- ── 5. FUNÇÃO DE CONVITE (aceitar link) ──────────────────────

CREATE OR REPLACE FUNCTION accept_invite(p_token uuid)
RETURNS jsonb AS $$
DECLARE
  v_invite  invites%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

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

  IF EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = v_invite.trip_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('error', 'already_member', 'trip_id', v_invite.trip_id);
  END IF;

  UPDATE invites
  SET used_at = now(), used_by = v_user_id
  WHERE id = v_invite.id;

  INSERT INTO trip_members (trip_id, user_id, role)
  VALUES (v_invite.trip_id, v_user_id, 'member');

  RETURN jsonb_build_object('success', true, 'trip_id', v_invite.trip_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ── 6. ÍNDICES DE PERFORMANCE ────────────────────────────────

CREATE INDEX trip_members_user_id_idx    ON trip_members(user_id);
CREATE INDEX trips_created_by_idx        ON trips(created_by);
CREATE INDEX trips_start_date_idx        ON trips(start_date);
CREATE INDEX invites_token_idx           ON invites(token);
CREATE INDEX invites_trip_id_idx         ON invites(trip_id);
CREATE INDEX invites_expires_at_idx      ON invites(expires_at) WHERE used_at IS NULL;
CREATE INDEX photos_trip_id_idx          ON photos(trip_id);
CREATE INDEX photos_taken_at_idx         ON photos(trip_id, taken_at DESC);
CREATE INDEX expenses_trip_id_idx        ON expenses(trip_id);
CREATE INDEX expenses_date_idx           ON expenses(trip_id, date DESC);
CREATE INDEX checklist_trip_id_idx       ON checklist_items(trip_id);
CREATE INDEX locations_trip_id_idx       ON locations(trip_id);
