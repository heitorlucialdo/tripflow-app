-- O bucket avatars é público: as fotos abrem pela URL pública sem passar pelo RLS.
-- A política de leitura ampla só servia para permitir LISTAR todos os arquivos,
-- o que expõe os ids de todos os usuários. Leitura via API fica restrita à própria
-- pasta (necessária para o upload com upsert do Perfil).

DROP POLICY IF EXISTS "avatars_read_all" ON storage.objects;
DROP POLICY IF EXISTS "avatars_read_own" ON storage.objects;

CREATE POLICY "avatars_read_own" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
