-- Substitui a política de leitura de locations para ignorar dados antigos
-- Qualquer localização não atualizada há mais de 5 min fica invisível
-- Não precisa de pg_cron nem de deletar fisicamente

DROP POLICY IF EXISTS "locations_select" ON locations;

CREATE POLICY "locations_select" ON locations
  FOR SELECT USING (
    trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
    AND updated_at > now() - interval '5 minutes'
  );
