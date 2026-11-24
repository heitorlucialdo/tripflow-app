-- ============================================================
-- 006_expenses.sql
-- Gastos compartilhados com divisão entre membros da trip
-- ============================================================

CREATE TABLE expenses (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  description  text        NOT NULL,
  amount       numeric(10,2) NOT NULL,
  category     text        NOT NULL DEFAULT 'Outros',
  paid_by      uuid        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  participants uuid[]      NOT NULL, -- array de profile ids que dividem o gasto
  date         date        NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT expenses_amount_positive CHECK (amount > 0),
  CONSTRAINT expenses_category_check CHECK (
    category IN ('Comida', 'Atração', 'Transporte', 'Hospedagem', 'Compras', 'Bebida', 'Outros')
  ),
  CONSTRAINT expenses_participants_not_empty CHECK (array_length(participants, 1) > 0)
);

CREATE INDEX expenses_trip_id_idx ON expenses(trip_id);
CREATE INDEX expenses_paid_by_idx ON expenses(paid_by);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Só membros da trip veem os gastos
CREATE POLICY "expenses_select" ON expenses
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Só membros da trip lançam gastos
CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT WITH CHECK (
    auth.uid() = paid_by
    AND trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid()
    )
  );

-- Quem lançou ou admin da trip edita
CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE USING (
    auth.uid() = paid_by
    OR trip_id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Quem lançou ou admin deleta
CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE USING (
    auth.uid() = paid_by
    OR trip_id IN (
      SELECT trip_id FROM trip_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
