import { createClient } from "@supabase/supabase-js";

// Só valida o token de login (auth.getUser), o que a chave pública já permite.
// A service key só é necessária se um dia o backend precisar ignorar o RLS.
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!process.env.SUPABASE_URL || !key) {
  throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY em backend/.env");
}

export const supabaseAdmin = createClient(process.env.SUPABASE_URL, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
