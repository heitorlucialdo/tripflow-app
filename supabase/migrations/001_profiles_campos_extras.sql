-- Migration 001 — Campos extras em profiles
-- Rodar no SQL Editor do Supabase

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nickname       text,
  ADD COLUMN IF NOT EXISTS phone          text,
  ADD COLUMN IF NOT EXISTS cpf            text,
  ADD COLUMN IF NOT EXISTS emergency_email text;

-- Índice para busca por apelido (usado no modo ao vivo e grupo)
CREATE INDEX IF NOT EXISTS profiles_nickname_idx ON profiles (nickname);

-- Bucket para fotos de perfil (executar separado se já existir)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- Política de storage: usuário só sobe para sua própria pasta
-- CREATE POLICY "avatars_upload_own"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CREATE POLICY "avatars_read_all"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');
