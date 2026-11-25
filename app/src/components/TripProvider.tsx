import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { TripContext, DEMO_TRIP_ID, TRIP_COLUMNS, type NewTrip, type Trip, type TripMember, type TripPatch } from "../lib/trip-context";

// Só guarda qual viagem a pessoa estava vendo neste aparelho; os dados
// da viagem em si ficam no Supabase.
const ACTIVE_KEY = "tripflow-active-trip";

function readActive(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

function writeActive(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch { /* armazenamento indisponível */ }
}

interface MemberRow {
  user_id: string;
  role: "admin" | "member";
  profiles: { name: string; nickname: string | null; avatar_url: string | null; pix_key: string | null } | null;
}

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [trips, setTrips]       = useState<Trip[]>([]);
  const [activeId, setActiveId] = useState<string | null>(readActive);
  const [members, setMembers]   = useState<TripMember[]>([]);
  const [loading, setLoading]   = useState(true);

  const reloadTrips = useCallback(async () => {
    if (!user) { setTrips([]); setLoading(false); return; }
    const { data } = await supabase
      .from("trips")
      .select(TRIP_COLUMNS)
      .order("start_date", { ascending: false });
    setTrips((data ?? []) as Trip[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { reloadTrips(); }, [reloadTrips]);

  const demoMode = activeId === DEMO_TRIP_ID;

  // Sem escolha válida guardada (ex.: viagem apagada), abre a mais recente
  // em vez de cair na demo.
  const activeTrip = useMemo(
    () => demoMode ? null : trips.find(t => t.id === activeId) ?? trips[0] ?? null,
    [trips, activeId, demoMode],
  );

  const loadMembers = useCallback(async (tripId: string) => {
    const { data } = await supabase
      .from("trip_members")
      .select("user_id, role, profiles(name, nickname, avatar_url, pix_key)")
      .eq("trip_id", tripId)
      .order("joined_at");
    const rows = (data ?? []) as unknown as MemberRow[];
    setMembers(rows.map(r => ({
      user_id:    r.user_id,
      role:       r.role,
      name:       r.profiles?.name ?? "Viajante",
      nickname:   r.profiles?.nickname ?? null,
      avatar_url: r.profiles?.avatar_url ?? null,
      pix_key:    r.profiles?.pix_key ?? null,
    })));
  }, []);

  useEffect(() => {
    if (!activeTrip) { setMembers([]); return; }
    const tripId = activeTrip.id;
    loadMembers(tripId);

    const channel = supabase
      .channel(`trip_members:${tripId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_members", filter: `trip_id=eq.${tripId}` }, () => { loadMembers(tripId); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTrip, loadMembers]);

  const selectTrip = useCallback((id: string | null) => {
    writeActive(id);
    setActiveId(id);
  }, []);

  const createTrip = useCallback(async (input: NewTrip): Promise<Trip> => {
    if (!user) throw new Error("Entre na sua conta para criar uma viagem.");
    const { data, error } = await supabase
      .from("trips")
      .insert({ ...input, created_by: user.id })
      .select(TRIP_COLUMNS)
      .single();
    if (error || !data) throw new Error("Não foi possível criar a viagem.");
    const trip = data as Trip;
    setTrips(prev => [trip, ...prev]);
    selectTrip(trip.id);
    return trip;
  }, [user, selectTrip]);

  const updateTrip = useCallback(async (id: string, patch: TripPatch) => {
    const { error } = await supabase.from("trips").update(patch).eq("id", id);
    if (error) throw new Error("Não foi possível salvar a viagem.");
    setTrips(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const isAdmin = Boolean(user && members.some(m => m.user_id === user.id && m.role === "admin"));

  const value = useMemo(() => ({
    trips, activeTrip, members, isAdmin, loading, demoMode, selectTrip, createTrip, updateTrip, reloadTrips,
  }), [trips, activeTrip, members, isAdmin, loading, demoMode, selectTrip, createTrip, updateTrip, reloadTrips]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}
