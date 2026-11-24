import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  email: string;
  nickname: string | null;
  phone: string | null;
  cpf: string | null;
  emergency_email: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [user]);

  async function saveProfile(fields: Partial<Omit<Profile, "id" | "email">>) {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...fields } : prev);
    }
    return error;
  }

  return { profile, loading, saveProfile };
}
