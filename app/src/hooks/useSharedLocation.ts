import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { useTripRows } from "./useTripRows";
import { importTripKey, encryptCoord, decryptCoord } from "../lib/geo-crypto";

interface LocationRow {
  user_id: string;
  lat_enc: string;
  lng_enc: string;
  share_until: string;
  updated_at: string;
}

export interface MemberPosition {
  userId: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

const MIN_INTERVAL_MS = 30_000;
// A política do banco esconde posições sem atualização há 10 min; o reenvio
// mantém a pessoa visível mesmo parada.
const HEARTBEAT_MS = 120_000;

export function useSharedLocation(tripId: string) {
  const { user } = useAuth();
  const me = user?.id ?? null;

  const [key, setKey]                 = useState<CryptoKey | null>(null);
  const [shareUntil, setShareUntil]   = useState<Date | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [others, setOthers]           = useState<MemberPosition[]>([]);
  const [myPosition, setMyPosition]   = useState<{ lat: number; lng: number } | null>(null);

  const watchRef     = useRef<number | null>(null);
  const lastSentRef  = useRef(0);
  const lastPosRef   = useRef<{ lat: number; lng: number } | null>(null);
  const untilRef     = useRef<Date | null>(null);

  const { rows } = useTripRows<LocationRow>("locations", tripId);

  useEffect(() => {
    let cancelled = false;
    supabase.from("trip_secrets").select("location_key").eq("trip_id", tripId).maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return;
        if (!data?.location_key) { setError("Localização indisponível nesta viagem."); return; }
        setKey(await importTripKey(data.location_key));
      });
    return () => { cancelled = true; };
  }, [tripId]);

  const upload = useCallback(async (pos: { lat: number; lng: number }) => {
    if (!key || !me || !untilRef.current) return;
    lastSentRef.current = Date.now();
    const [lat_enc, lng_enc] = await Promise.all([encryptCoord(key, pos.lat), encryptCoord(key, pos.lng)]);
    const { error: err } = await supabase.from("locations").upsert(
      { trip_id: tripId, user_id: me, lat_enc, lng_enc, share_until: untilRef.current.toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "trip_id,user_id" },
    );
    if (err) setError("Não foi possível enviar sua localização.");
  }, [key, me, tripId]);

  const stopWatch = useCallback(() => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
  }, []);

  const startWatch = useCallback(() => {
    if (!("geolocation" in navigator)) { setError("Este aparelho não informa localização."); return; }
    stopWatch();
    watchRef.current = navigator.geolocation.watchPosition(
      p => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        lastPosRef.current = pos;
        setMyPosition(pos);
        setError(null);
        if (Date.now() - lastSentRef.current >= MIN_INTERVAL_MS) upload(pos);
      },
      err => {
        setError(err.code === err.PERMISSION_DENIED
          ? "Permissão de localização negada. Libere nas configurações do navegador."
          : "Não consegui obter sua localização agora.");
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 },
    );
  }, [stopWatch, upload]);

  const stop = useCallback(async () => {
    stopWatch();
    untilRef.current = null;
    setShareUntil(null);
    setMyPosition(null);
    lastPosRef.current = null;
    if (me) await supabase.from("locations").delete().eq("trip_id", tripId).eq("user_id", me);
  }, [me, stopWatch, tripId]);

  const start = useCallback((until: Date) => {
    untilRef.current = until;
    lastSentRef.current = 0;
    setShareUntil(until);
    startWatch();
  }, [startWatch]);

  // Retoma o compartilhamento que ainda está no prazo (ex.: app reaberto).
  useEffect(() => {
    if (!me || !key || untilRef.current) return;
    const mine = rows.find(r => r.user_id === me);
    if (mine && new Date(mine.share_until) > new Date()) start(new Date(mine.share_until));
  }, [rows, me, key, start]);

  // Encerra sozinho no fim do prazo e mantém a posição viva enquanto isso.
  useEffect(() => {
    if (!shareUntil) return;
    const end = setTimeout(() => { stop(); }, Math.max(shareUntil.getTime() - Date.now(), 0));
    const beat = setInterval(() => { if (lastPosRef.current) upload(lastPosRef.current); }, HEARTBEAT_MS);
    return () => { clearTimeout(end); clearInterval(beat); };
  }, [shareUntil, stop, upload]);

  useEffect(() => () => stopWatch(), [stopWatch]);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const now = Date.now();
    Promise.all(rows
      .filter(r => r.user_id !== me && new Date(r.share_until).getTime() > now)
      .map(async r => {
        const [lat, lng] = await Promise.all([decryptCoord(key, r.lat_enc), decryptCoord(key, r.lng_enc)]);
        return lat === null || lng === null ? null : { userId: r.user_id, lat, lng, updatedAt: r.updated_at };
      }))
      .then(list => { if (!cancelled) setOthers(list.filter((p): p is MemberPosition => p !== null)); });
    return () => { cancelled = true; };
  }, [rows, key, me]);

  return { ready: Boolean(key), sharing: Boolean(shareUntil), shareUntil, myPosition, others, error, start, stop };
}
