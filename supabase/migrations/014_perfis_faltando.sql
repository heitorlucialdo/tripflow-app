-- Contas criadas antes do trigger de perfil existir ficaram sem linha em profiles,
-- e aí não conseguem criar viagem (trips.created_by aponta para profiles).

-- Garante que o trigger existe para as próximas contas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Cria o perfil de quem já tem conta e ficou sem
INSERT INTO profiles (id, name, avatar_url, email)
SELECT
  u.id,
  COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), NULLIF(u.raw_user_meta_data->>'name', ''), 'Viajante'),
  u.raw_user_meta_data->>'avatar_url',
  COALESCE(u.email, '')
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;
