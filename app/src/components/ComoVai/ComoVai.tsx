import { useMemo } from "react";
import { Sheet } from "../Sheet/Sheet";
import sheet from "../Sheet/Sheet.module.css";
import styles from "./ComoVai.module.css";
import { useTrip } from "../../hooks/useTrip";
import { useAuth } from "../../hooks/useAuth";
import { useTripRows } from "../../hooks/useTripRows";
import { formatDay, memberLabel, parseDay, toDayString, tripDays, type Trip } from "../../lib/trip-context";
import { calcularSaldos, brl } from "../../lib/saldos";
import type { ItineraryItem } from "../RoteiroViagem/RoteiroViagem";

interface ExpenseRow { amount: number | string; paid_by: string; participants: string[] }
interface SettlementRow { from_user: string; to_user: string; amount: number | string; confirmed_at: string | null }
interface BudgetRow { amount: number | string; split: "group" | "person"; status: "idea" | "booked" }

type Destino = "gastos" | "home" | "orcamento";

const DAY_MS = 86_400_000;

function tripStatus(trip: Trip, today: string): string {
  const days = tripDays(trip);
  if (today < trip.start_date) {
    const n = Math.round((parseDay(trip.start_date).getTime() - parseDay(today).getTime()) / DAY_MS);
    return n === 1 ? "Começa amanhã" : `Faltam ${n} dias`;
  }
  if (today > trip.end_date) {
    const n = Math.round((parseDay(today).getTime() - parseDay(trip.end_date).getTime()) / DAY_MS);
    return n === 1 ? "Terminou ontem" : `Terminou há ${n} dias`;
  }
  return `Dia ${days.indexOf(today) + 1} de ${days.length}`;
}

export function ComoVai({ onClose, onGo, onOpenViagens }: {
  onClose: () => void;
  onGo: (destino: Destino) => void;
  onOpenViagens: () => void;
}) {
  const { activeTrip } = useTrip();

  if (!activeTrip) {
    return (
      <Sheet title="Como vai a viagem" onClose={onClose}>
        <div className={sheet.section}>
          <p className={sheet.hint}>O resumo aparece quando você está numa viagem real com o seu grupo.</p>
          <button className={sheet.primaryBtn} onClick={() => { onClose(); onOpenViagens(); }}>Criar ou escolher viagem</button>
        </div>
      </Sheet>
    );
  }
  return <Resumo trip={activeTrip} onClose={onClose} onGo={onGo} />;
}

function Resumo({ trip, onClose, onGo }: { trip: Trip; onClose: () => void; onGo: (d: Destino) => void }) {
  const { user } = useAuth();
  const { members } = useTrip();
  const me = user?.id ?? "";
  const today = toDayString(new Date());

  const expenses    = useTripRows<ExpenseRow>("expenses", trip.id);
  const settlements = useTripRows<SettlementRow>("settlements", trip.id);
  const budget      = useTripRows<BudgetRow>("budget_items", trip.id);
  const itinerary   = useTripRows<ItineraryItem>("itinerary_items", trip.id, [
    { column: "day" }, { column: "position" },
  ]);

  const loading = expenses.loading || settlements.loading || budget.loading || itinerary.loading;
  const failed  = expenses.error || settlements.error || budget.error || itinerary.error;

  const resumo = useMemo(() => {
    const people = Math.max(members.length, 1);
    const total = expenses.rows.reduce((s, e) => s + Number(e.amount), 0);
    const saldo = calcularSaldos(
      members.map(m => m.user_id),
      expenses.rows.map(e => ({ valor: Number(e.amount), pagadorId: e.paid_by, participantes: e.participants })),
      settlements.rows.map(s => ({ from: s.from_user, to: s.to_user, amount: Number(s.amount), confirmed: Boolean(s.confirmed_at) })),
    );
    const minhaParte = expenses.rows
      .filter(e => e.participants.includes(me))
      .reduce((s, e) => s + Number(e.amount) / e.participants.length, 0);
    const planejado = budget.rows.reduce((s, b) => s + (b.split === "group" ? Number(b.amount) / people : Number(b.amount)), 0);
    const aConfirmar = settlements.rows.filter(s => s.to_user === me && !s.confirmed_at);
    const proximo = itinerary.rows.find(i => i.day >= today);
    return { total, meuSaldo: saldo[me] ?? 0, minhaParte, planejado, aConfirmar, proximo };
  }, [members, expenses.rows, settlements.rows, budget.rows, itinerary.rows, me, today]);

  const nome = (id: string) => {
    const m = members.find(x => x.user_id === id);
    return m ? memberLabel(m) : "alguém";
  };

  function go(d: Destino) { onClose(); onGo(d); }

  return (
    <Sheet title="Como vai a viagem" onClose={onClose}>
      <div className={sheet.section}>
        <div className={styles.status}>
          <span className={styles.statusMain}>{tripStatus(trip, today)}</span>
          <span className={sheet.itemMeta}>
            {trip.destination} · {formatDay(trip.start_date)} a {formatDay(trip.end_date)} · {members.length} pessoa{members.length === 1 ? "" : "s"}
          </span>
        </div>

        {failed && <p className={sheet.error} role="alert">Não foi possível carregar tudo. Feche e abra de novo.</p>}

        {loading ? (
          <div className={styles.grid} aria-busy="true">
            {[0, 1, 2, 3].map(i => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              <button className={styles.tile} onClick={() => go("gastos")}>
                <span className={styles.tileLabel}>Seu saldo</span>
                <span className={`${styles.tileValue} ${resumo.meuSaldo > 0.01 ? styles.good : resumo.meuSaldo < -0.01 ? styles.bad : ""}`}>
                  {Math.abs(resumo.meuSaldo) < 0.01 ? "Quite" : brl(Math.abs(resumo.meuSaldo))}
                </span>
                <span className={styles.tileHint}>
                  {resumo.meuSaldo > 0.01 ? "a receber" : resumo.meuSaldo < -0.01 ? "você deve" : "ninguém te deve"}
                </span>
              </button>

              <button className={styles.tile} onClick={() => go("gastos")}>
                <span className={styles.tileLabel}>Gasto do grupo</span>
                <span className={styles.tileValue}>{brl(resumo.total)}</span>
                <span className={styles.tileHint}>sua parte: {brl(resumo.minhaParte)}</span>
              </button>

              <button className={styles.tile} onClick={() => go("orcamento")}>
                <span className={styles.tileLabel}>Orçamento por pessoa</span>
                <span className={styles.tileValue}>{resumo.planejado > 0 ? brl(resumo.planejado) : "Sem plano"}</span>
                <span className={styles.tileHint}>
                  {resumo.planejado > 0
                    ? resumo.minhaParte > resumo.planejado
                      ? `${brl(resumo.minhaParte - resumo.planejado)} acima`
                      : `${Math.round((resumo.minhaParte / resumo.planejado) * 100)}% usado`
                    : "monte no Orçamento"}
                </span>
              </button>

              <button className={styles.tile} onClick={() => go("home")}>
                <span className={styles.tileLabel}>Próximo no roteiro</span>
                <span className={styles.tileText}>{resumo.proximo ? resumo.proximo.title : "Nada pela frente"}</span>
                <span className={styles.tileHint}>
                  {resumo.proximo
                    ? `${formatDay(resumo.proximo.day, { weekday: "short", day: "2-digit", month: "2-digit" })}${resumo.proximo.start_time ? ` · ${resumo.proximo.start_time.slice(0, 5)}` : ""}`
                    : "adicione atividades"}
                </span>
              </button>
            </div>

            {resumo.aConfirmar.length > 0 && (
              <div className={styles.alert} role="status">
                <strong>Pagamentos para você confirmar</strong>
                {resumo.aConfirmar.map((s, i) => (
                  <span key={i}>{nome(s.from_user)} avisou que pagou {brl(Number(s.amount))}</span>
                ))}
                <button className={sheet.secondaryBtn} onClick={() => go("gastos")}>Abrir gastos</button>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
