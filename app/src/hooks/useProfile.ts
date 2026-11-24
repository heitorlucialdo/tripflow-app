import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  email: string;
  nickname: string | null;
  pix_key: string | null;
  phone: string | null;
  cpf: string | null;
  emergency_email: string | null;
}

type PublicFields  = Pick<Profile, "name" | "avatar_url" | "nickname" | "pix_key">;
type PrivateFields = Pick<Profile, "phone" | "cpf" | "emergency_email">;
type EditableFields = Partial<PublicFields & PrivateFields>;

// CPF, telefone e contato de emergência ficam em profiles_private, que só o
// dono lê; profiles é visível para todos os membros das viagens.
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    Promise.all([
      supabase.from("profiles").select("id, name, avatar_url, email, nickname, pix_key").eq("id", user.id).single(),
      supabase.from("profiles_private").select("phone, cpf, emergency_email").eq("id", user.id).maybeSingle(),
    ]).then(([pub, priv]) => {
      if (pub.data) {
        setProfile({
          ...pub.data,
          phone:           priv.data?.phone ?? null,
          cpf:             priv.data?.cpf ?? null,
          emergency_email: priv.data?.emergency_email ?? null,
        });
      }
      setLoading(false);
    });
  }, [user]);

  async function saveProfile(fields: EditableFields) {
    if (!user) return;

    const { phone, cpf, emergency_email, ...publicFields } = fields;
    const privateFields: Partial<PrivateFields> = Object.fromEntries(
      Object.entries({ phone, cpf, emergency_email }).filter(([, v]) => v !== undefined),
    );

    if (Object.keys(publicFields).length > 0) {
      const { error } = await supabase.from("profiles").update(publicFields).eq("id", user.id);
      if (error) return error;
    }
    if (Object.keys(privateFields).length > 0) {
      const { error } = await supabase
        .from("profiles_private")
        .upsert({ id: user.id, ...privateFields });
      if (error) return error;
    }

    setProfile(prev => prev ? { ...prev, ...fields } : prev);
    return null;
  }

  return { profile, loading, saveProfile };
}
