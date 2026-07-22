-- ============================================================
-- 003_trip_members.sql
-- Membros de cada trip — tabela mais crítica de segurança
-- Toda RLS das outras tabelas deriva desta
-- ============================================================

CREATE TABLE trip_members (
  trip_id   uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (trip_id, user_id),
  CONSTRAINT trip_members_role_check CHECK (role IN ('admin', 'member'))
);

-- Índice para a query mais frequente: "quais trips este usuário pertence?"
CREATE INDEX trip_members_user_id_idx ON trip_members(user_id);

-- ── Trigger: ao criar uma trip, inserir o criador como admin ─
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

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;

-- Membro vê todos os outros membros da mesma trip
CREATE POLICY "trip_members_select" ON trip_members
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Apenas admin da trip adiciona membros
CREATE POLICY "trip_members_insert" ON trip_members
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Apenas admin da trip atualiza role de membro
CREATE POLICY "trip_members_update" ON trip_members
  FOR UPDATE USING (
    trip_id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Admin remove membro OU membro sai por conta própria
CREATE POLICY "trip_members_delete" ON trip_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR
    trip_id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── Política de profiles que depende de trip_members ─────────
-- Adicionada aqui pois trip_members precisa existir antes
CREATE POLICY "profiles_select_trip_members" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT tm.user_id
      FROM trip_members tm
      WHERE tm.trip_id IN (
        SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
      )
    )
  );
