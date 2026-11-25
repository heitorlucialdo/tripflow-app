import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTrip } from "../hooks/useTrip";
import { useTripRows } from "../hooks/useTripRows";
import { supabase } from "../lib/supabase";
import { buildPixPayload } from "../lib/pix";
import { formatDay, memberLabel, toDayString, type Trip } from "../lib/trip-context";
import type { ExpenseDraft } from "../lib/api";
import { LancamentoRapido } from "./LancamentoRapido/LancamentoRapido";
import { calcularSaldos, simplificar, brl } from "../lib/saldos";

const CATEGORIAS = ["Comida", "Atração", "Transporte", "Hospedagem", "Compras", "Bebida", "Outros"];

interface Person {
  id: string;
  label: string;
  pixKey: string | null;
}

interface ExpenseItem {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  pagadorId: string;
  participantes: string[];
  data: string;
  canRemove: boolean;
}

interface SettlementItem {
  id: string;
  from: string;
  to: string;
  amount: number;
  confirmed: boolean;
}

interface NewExpense {
  descricao: string;
  valor: number;
  categoria: string;
  pagadorId: string;
  participantes: string[];
  data: string;
}

interface SettlementActions {
  pay: (to: string, amount: number) => Promise<void>;
  confirm: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
}

// ─── Tela de gastos (mesma interface para a viagem demo e a viagem real) ──────

interface ViewProps {
  people: Person[];
  gastos: ExpenseItem[];
  acertos?: SettlementItem[];
  me?: string | null;
  pixDescription?: string;
  onAdd: (g: NewExpense) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
  actions?: SettlementActions;
  renderQuickEntry?: (fill: (d: ExpenseDraft) => void) => ReactNode;
}

function GastosView({ people, gastos, acertos = [], me = null, pixDescription, onAdd, onRemove, actions, renderQuickEntry }: ViewProps) {
  const ids = people.map(p => p.id);
  const [tab, setTab]               = useState<"lista" | "novo" | "divisao">("lista");
  const [descricao, setDescricao]   = useState("");
  const [valor, setValor]           = useState("");
  const [categoria, setCategoria]   = useState(CATEGORIAS[0]);
  const [pagador, setPagador]       = useState(me && ids.includes(me) ? me : ids[0] ?? "");
  const [participantes, setPartic]  = useState<string[]>(ids);
  const [data, setData]             = useState(toDayString(new Date()));
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [pixOpen, setPixOpen]       = useState<string | null>(null);
  const [copied, setCopied]         = useState<string | null>(null);

  const nome = (id: string) => people.find(p => p.id === id)?.label ?? "Ex-membro";

  function fillFromDraft(d: ExpenseDraft) {
    setDescricao(d.descricao);
    setValor(String(d.valor));
    setCategoria(CATEGORIAS.includes(d.categoria) ? d.categoria : "Outros");
    if (ids.includes(d.pago_por)) setPagador(d.pago_por);
    const parts = d.participantes.filter(p => ids.includes(p));
    setPartic(parts.length > 0 ? parts : ids);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.data)) setData(d.data);
    setError(null);
    setTab("novo");
  }

  async function addGasto() {
    const v = parseFloat(valor.replace(",", "."));
    if (!descricao.trim() || !(v > 0) || participantes.length === 0 || !pagador) return;
    setSaving(true); setError(null);
    try {
      await onAdd({ descricao: descricao.trim(), valor: Math.round(v * 100) / 100, categoria, pagadorId: pagador, participantes, data });
      setDescricao(""); setValor(""); setPartic(ids);
      setTab("lista");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function run(fn: () => Promise<void> | void) {
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Algo deu errado."); }
  }

  async function copy(code: string, key: string) {
    await navigator.clipboard.writeText(code);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const total = gastos.reduce((s, g) => s + g.valor, 0);
  const porPessoa = people.length > 0 ? total / people.length : 0;
  const transfers = simplificar(calcularSaldos(people.map(p => p.id), gastos, acertos));
  const pendentes = acertos.filter(a => !a.confirmed);
  const valorNum = parseFloat(valor.replace(",", "."));

  return (
    <section className="gastos-section">
      <div className="gastos-header">
        <div>
          <h2 className="gastos-title">Divisão de Gastos</h2>
          <p className="gastos-desc">Controle quanto cada um gastou e acerte por Pix</p>
        </div>
      </div>

      {renderQuickEntry?.(fillFromDraft)}

      <div className="gastos-resumo-bar">
        <div className="gastos-resumo-item">
          <span className="gastos-resumo-num">{brl(total)}</span>
          <span className="gastos-resumo-label">Total gasto</span>
        </div>
        <div className="gastos-resumo-div" />
        <div className="gastos-resumo-item">
          <span className="gastos-resumo-num">{brl(porPessoa)}</span>
          <span className="gastos-resumo-label">Por pessoa</span>
        </div>
        <div className="gastos-resumo-div" />
        <div className="gastos-resumo-item">
          <span className="gastos-resumo-num">{gastos.length}</span>
          <span className="gastos-resumo-label">Lançamentos</span>
        </div>
      </div>

      <div className="gastos-tabs">
        <button className={`gastos-tab ${tab === "lista" ? "active" : ""}`}   onClick={() => setTab("lista")}>Lista</button>
        <button className={`gastos-tab ${tab === "novo" ? "active" : ""}`}    onClick={() => setTab("novo")}>Novo</button>
        <button className={`gastos-tab ${tab === "divisao" ? "active" : ""}`} onClick={() => setTab("divisao")}>Quem deve</button>
      </div>

      {error && <p className="gastos-vazio" style={{ color: "var(--sunset)" }}>{error}</p>}

      {tab === "lista" && (
        <div className="gastos-lista">
          {gastos.length === 0 && <p className="gastos-vazio">Nenhum gasto ainda. Adicione o primeiro!</p>}
          {gastos.map(g => (
            <div key={g.id} className="gasto-item">
              {/* A caixa comporta só a inicial; o nome da categoria vai na linha de detalhes. */}
              <div className="gasto-cat" aria-hidden="true">{g.categoria.charAt(0)}</div>
              <div className="gasto-info">
                <span className="gasto-desc">{g.descricao}</span>
                <span className="gasto-meta">
                  {g.categoria} · {g.data} · Pago por {nome(g.pagadorId)} · {g.participantes.length} {g.participantes.length === 1 ? "pessoa" : "pessoas"}
                </span>
              </div>
              <div className="gasto-right">
                <span className="gasto-valor">{brl(g.valor)}</span>
                {g.canRemove && (
                  <button className="gasto-del" onClick={() => run(() => onRemove(g.id))} title="Remover" aria-label="Remover gasto">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "novo" && (
        <div className="gasto-form">
          <label className="gasto-label">
            Descrição
            <input className="gasto-input" placeholder="Ex: Almoço no Parque Lage" value={descricao}
              onChange={e => setDescricao(e.target.value)} maxLength={120} />
          </label>

          <div className="gasto-row">
            <label className="gasto-label" style={{ flex: 1 }}>
              Valor (R$)
              <input className="gasto-input" type="number" min="0" step="0.01" inputMode="decimal"
                placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} />
            </label>
            <label className="gasto-label" style={{ flex: 1 }}>
              Categoria
              <select className="gasto-input" value={categoria} onChange={e => setCategoria(e.target.value)}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="gasto-row">
            <label className="gasto-label" style={{ flex: 1 }}>
              Quem pagou?
              <select className="gasto-input" value={pagador} onChange={e => setPagador(e.target.value)}>
                {people.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label className="gasto-label" style={{ flex: 1 }}>
              Data
              <input className="gasto-input" type="date" value={data} onChange={e => setData(e.target.value)} />
            </label>
          </div>

          <div className="gasto-label">
            Dividir entre:
            <div className="gasto-participantes">
              {people.map(p => (
                <label key={p.id} className={`gasto-check-label ${participantes.includes(p.id) ? "checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={participantes.includes(p.id)}
                    onChange={() => setPartic(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <button className="gasto-btn-add" onClick={addGasto}
            disabled={saving || !descricao.trim() || !(valorNum > 0) || participantes.length === 0 || !pagador}>
            {saving ? "Salvando..." : "✓ Adicionar gasto"}
          </button>
        </div>
      )}

      {tab === "divisao" && (
        <div className="divisao-wrap">
          {transfers.length === 0 && gastos.length === 0 && <p className="gastos-vazio">Adicione gastos para ver a divisão.</p>}
          {transfers.length === 0 && gastos.length > 0 && (
            <div className="divisao-ok">
              <span className="divisao-ok-icon">🎉</span>
              <p>Tudo quitado! Ninguém deve nada a ninguém.</p>
            </div>
          )}

          {transfers.length > 0 && (
            <>
              <p className="divisao-hint">Para quitar todas as contas, basta fazer as transferências abaixo:</p>
              {transfers.map(t => {
                const key = `${t.de}-${t.para}`;
                const credor = people.find(p => p.id === t.para);
                const pendente = pendentes.find(a => a.from === t.de && a.to === t.para);
                const pix = credor?.pixKey
                  ? buildPixPayload({ key: credor.pixKey, receiverName: credor.label, amount: t.valor, description: pixDescription })
                  : null;
                const souDevedor = Boolean(actions && me === t.de);

                return (
                  <div key={key} className="divisao-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap" }}>
                      <span className="divisao-de">{nome(t.de)}</span>
                      <span className="divisao-arrow">→</span>
                      <span className="divisao-para">{nome(t.para)}</span>
                      <span className="divisao-val">{brl(t.valor)}</span>
                    </div>

                    {pendente && (
                      <p className="divisao-hint">
                        {nome(t.de)} avisou que pagou {brl(pendente.amount)} · aguardando {nome(t.para)} confirmar
                      </p>
                    )}

                    {souDevedor && !pendente && (
                      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                        {pix
                          ? <button className="gastos-tab active" style={{ flex: 1 }} onClick={() => setPixOpen(pixOpen === key ? null : key)}>
                              Pagar com Pix
                            </button>
                          : <span className="divisao-hint" style={{ flex: 1 }}>{nome(t.para)} ainda não cadastrou chave Pix no perfil.</span>}
                        <button className="gastos-tab" style={{ flex: 1 }} onClick={() => run(() => actions!.pay(t.para, t.valor))}>
                          Já paguei
                        </button>
                      </div>
                    )}

                    {souDevedor && pix && pixOpen === key && !pendente && (
                      <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
                        <p className="divisao-hint">Copie o código e cole na área Pix do seu banco (Pix copia e cola). O valor já vai preenchido.</p>
                        <code style={{ fontSize: ".72rem", wordBreak: "break-all", padding: ".6rem", borderRadius: 10, background: "var(--surface-2)", color: "var(--ink-2)" }}>
                          {pix}
                        </code>
                        <button className="gasto-btn-add" onClick={() => copy(pix, key)}>
                          {copied === key ? "Código copiado!" : "Copiar código Pix"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {actions && pendentes.length > 0 && (
            <div className="divisao-por-pessoa">
              <h3 className="divisao-sub">Pagamentos aguardando confirmação</h3>
              {pendentes.map(a => (
                <div key={a.id} className="divisao-pessoa-row" style={{ flexWrap: "wrap" }}>
                  <span className="divisao-pessoa-nome">{nome(a.from)} → {nome(a.to)}</span>
                  <span className="divisao-pessoa-meta">{brl(a.amount)}</span>
                  {me === a.to && (
                    <span style={{ display: "flex", gap: ".4rem" }}>
                      <button className="gastos-tab active" onClick={() => run(() => actions.confirm(a.id))}>Recebi</button>
                      <button className="gastos-tab" onClick={() => run(() => actions.cancel(a.id))}>Não recebi</button>
                    </span>
                  )}
                  {me === a.from && (
                    <button className="gastos-tab" onClick={() => run(() => actions.cancel(a.id))}>Desfazer</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {gastos.length > 0 && (
            <div className="divisao-por-pessoa">
              <h3 className="divisao-sub">Gasto total por pessoa</h3>
              {people.map(p => {
                const pagou = gastos.filter(g => g.pagadorId === p.id).reduce((s, g) => s + g.valor, 0);
                const consumiu = gastos
                  .filter(g => g.participantes.includes(p.id))
                  .reduce((s, g) => s + g.valor / g.participantes.length, 0);
                const saldo = pagou - consumiu;
                return (
                  <div key={p.id} className="divisao-pessoa-row">
                    <span className="divisao-pessoa-nome">{p.label}</span>
                    <span className="divisao-pessoa-meta">pagou {brl(pagou)} · consumiu {brl(consumiu)}</span>
                    <span className={`divisao-pessoa-saldo ${saldo >= 0 ? "positivo" : "negativo"}`}>
                      {saldo >= 0 ? `+${brl(saldo)}` : `-${brl(Math.abs(saldo))}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Viagem demo: amigos fixos, dados só neste aparelho ───────────────────────

const AMIGOS = ["Heitor Oliveira", "Paulo Exato", "Ana Julia", "Ludmilla Bastos"];
const DEMO_KEY = "rj2025-gastos";
const DEMO_PEOPLE: Person[] = AMIGOS.map(a => ({ id: a, label: a, pixKey: null }));

interface DemoGasto {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  pagador: string;
  participantes: string[];
  data: string;
}

function loadDemo(): DemoGasto[] {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]") as DemoGasto[]; } catch { return []; }
}

function DemoGastos() {
  const [gastos, setGastos] = useState<DemoGasto[]>(loadDemo);

  useEffect(() => {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(gastos)); } catch { /* armazenamento indisponível */ }
  }, [gastos]);

  return (
    <GastosView
      people={DEMO_PEOPLE}
      gastos={gastos.map(g => ({
        id: g.id, descricao: g.descricao, valor: g.valor, categoria: g.categoria,
        pagadorId: g.pagador, participantes: g.participantes, data: g.data, canRemove: true,
      }))}
      onAdd={g => setGastos(prev => [{
        id: Date.now().toString(),
        descricao: g.descricao,
        valor: g.valor,
        categoria: g.categoria,
        pagador: g.pagadorId,
        participantes: g.participantes,
        data: formatDay(g.data, { day: "2-digit", month: "2-digit", year: "numeric" }),
      }, ...prev])}
      onRemove={id => setGastos(prev => prev.filter(g => g.id !== id))}
    />
  );
}

// ─── Viagem real: Supabase com atualização em tempo real ──────────────────────

interface ExpenseRow {
  id: string;
  description: string;
  amount: number | string;
  category: string;
  paid_by: string;
  participants: string[];
  date: string;
  created_by: string | null;
}

interface SettlementRow {
  id: string;
  from_user: string;
  to_user: string;
  amount: number | string;
  confirmed_at: string | null;
}

function TripGastos({ trip }: { trip: Trip }) {
  const { user } = useAuth();
  const { members, isAdmin } = useTrip();
  const me = user?.id ?? null;

  const { rows: expenses } = useTripRows<ExpenseRow>("expenses", trip.id, [
    { column: "date", ascending: false },
    { column: "created_at", ascending: false },
  ]);
  const { rows: settlements } = useTripRows<SettlementRow>("settlements", trip.id, [{ column: "created_at" }]);

  const people: Person[] = members.map(m => ({ id: m.user_id, label: memberLabel(m), pixKey: m.pix_key }));

  async function check(promise: PromiseLike<{ error: unknown }>, msg: string) {
    const { error } = await promise;
    if (error) throw new Error(msg);
  }

  const actions: SettlementActions = {
    pay: (to, amount) => check(
      supabase.from("settlements").insert({ trip_id: trip.id, from_user: me, to_user: to, amount }),
      "Não foi possível registrar o pagamento.",
    ),
    confirm: id => check(
      supabase.from("settlements").update({ confirmed_at: new Date().toISOString() }).eq("id", id),
      "Não foi possível confirmar.",
    ),
    cancel: id => check(
      supabase.from("settlements").delete().eq("id", id),
      "Não foi possível desfazer.",
    ),
  };

  if (people.length === 0) return <section className="gastos-section"><p className="gastos-vazio">Carregando o grupo...</p></section>;

  return (
    <GastosView
      key={people.map(p => p.id).join(",")}
      people={people}
      me={me}
      pixDescription={trip.name}
      gastos={expenses.map(e => ({
        id: e.id,
        descricao: e.description,
        valor: Number(e.amount),
        categoria: e.category,
        pagadorId: e.paid_by,
        participantes: e.participants,
        data: formatDay(e.date, { day: "2-digit", month: "2-digit" }),
        canRemove: isAdmin || me === e.paid_by || me === e.created_by,
      }))}
      acertos={settlements.map(s => ({
        id: s.id, from: s.from_user, to: s.to_user, amount: Number(s.amount), confirmed: Boolean(s.confirmed_at),
      }))}
      onAdd={g => check(
        supabase.from("expenses").insert({
          trip_id: trip.id,
          description: g.descricao,
          amount: g.valor,
          category: g.categoria,
          paid_by: g.pagadorId,
          participants: g.participantes,
          date: g.data,
          created_by: me,
        }),
        "Não foi possível salvar o gasto.",
      )}
      onRemove={id => check(supabase.from("expenses").delete().eq("id", id), "Não foi possível remover.")}
      actions={actions}
      renderQuickEntry={fill => <LancamentoRapido tripId={trip.id} onDraft={fill} />}
    />
  );
}

export function Gastos() {
  const { activeTrip } = useTrip();
  return activeTrip ? <TripGastos trip={activeTrip} /> : <DemoGastos />;
}
