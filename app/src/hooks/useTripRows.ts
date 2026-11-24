import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Order {
  column: string;
  ascending?: boolean;
}

// Carrega as linhas de uma tabela da viagem e recarrega a cada mudança
// vinda do Supabase Realtime, para todo o grupo ver na hora.
export function useTripRows<T>(table: string, tripId: string | null, order: Order[] = []) {
  const [rows, setRows]       = useState<T[]>([]);
  const [loading, setLoading] = useState(Boolean(tripId));
  const [error, setError]     = useState<string | null>(null);
  const orderKey = JSON.stringify(order);

  const reload = useCallback(async () => {
    if (!tripId) { setRows([]); setLoading(false); return; }
    let query = supabase.from(table).select("*").eq("trip_id", tripId);
    for (const o of JSON.parse(orderKey) as Order[]) {
      query = query.order(o.column, { ascending: o.ascending ?? true });
    }
    const { data, error: err } = await query;
    if (err) setError("Não foi possível carregar os dados.");
    else { setRows((data ?? []) as T[]); setError(null); }
    setLoading(false);
  }, [table, tripId, orderKey]);

  useEffect(() => {
    setLoading(Boolean(tripId));
    reload();
    if (!tripId) return;

    // Nome único por execução: o Supabase reaproveita um canal de mesmo nome
    // ainda fechando e recusa novos listeners nele.
    const channel = supabase
      .channel(`${table}:${tripId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `trip_id=eq.${tripId}` }, () => { reload(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, tripId, reload]);

  return { rows, loading, error, reload };
}
