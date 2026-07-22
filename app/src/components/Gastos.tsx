import { useState, useEffect } from "react";

const AMIGOS = ["Heitor Oliveira", "Paulo Exato", "Ana Julia", "Ludmilla Bastos"];
const CATEGORIAS = ["Comida", "Atração", "Transporte", "Hospedagem", "Compras", "Bebida", "Outros"];
const KEY = "rj2025-gastos";

interface Gasto {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  pagador: string;       // quem pagou
  participantes: string[]; // quem consome
  data: string;
}

function loadGastos(): Gasto[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

function saveGastos(g: Gasto[]) {
  localStorage.setItem(KEY, JSON.stringify(g));
}

function calcularDividas(gastos: Gasto[]): Record<string, Record<string, number>> {
  // saldo[pessoa] = quanto ela deve (negativo = deve, positivo = é devida)
  const saldo: Record<string, number> = {};
  AMIGOS.forEach(a => saldo[a] = 0);

  for (const g of gastos) {
    const partes = g.participantes.length;
    if (partes === 0) continue;
    const cota = g.valor / partes;
    saldo[g.pagador] += g.valor;
    g.participantes.forEach(p => saldo[p] -= cota);
  }

  // Simplificar: quem deve → quem recebe
  const devedores = Object.entries(saldo).filter(([,v]) => v < -0.01).map(([k,v]) => ({ nome: k, val: -v }));
  const credores  = Object.entries(saldo).filter(([,v]) => v > 0.01).map(([k,v]) => ({ nome: k, val: v }));

  const transferencias: Record<string, Record<string, number>> = {};
  const dClone = devedores.map(d => ({ ...d }));
  const cClone = credores.map(c => ({ ...c }));

  let di = 0, ci = 0;
  while (di < dClone.length && ci < cClone.length) {
    const valor = Math.min(dClone[di].val, cClone[ci].val);
    if (valor > 0.01) {
      const de = dClone[di].nome, para = cClone[ci].nome;
      if (!transferencias[de]) transferencias[de] = {};
      transferencias[de][para] = (transferencias[de][para] ?? 0) + valor;
    }
    dClone[di].val -= valor;
    cClone[ci].val -= valor;
    if (dClone[di].val < 0.01) di++;
    if (cClone[ci].val < 0.01) ci++;
  }

  return transferencias;
}

export function Gastos() {
  const [gastos, setGastos]         = useState<Gasto[]>(loadGastos);
  const [tab, setTab]               = useState<"lista"|"novo"|"divisao">("lista");
  const [descricao, setDescricao]   = useState("");
  const [valor, setValor]           = useState("");
  const [categoria, setCategoria]   = useState(CATEGORIAS[0]);
  const [pagador, setPagador]       = useState(AMIGOS[0]);
  const [participantes, setPartic]  = useState<string[]>([...AMIGOS]);

  useEffect(() => saveGastos(gastos), [gastos]);

  function addGasto() {
    if (!descricao.trim() || !valor || participantes.length === 0) return;
    const novo: Gasto = {
      id: Date.now().toString(),
      descricao: descricao.trim(),
      valor: parseFloat(valor),
      categoria,
      pagador,
      participantes,
      data: new Date().toLocaleDateString("pt-BR"),
    };
    setGastos(prev => [novo, ...prev]);
    setDescricao(""); setValor("");
    setTab("lista");
  }

  function removeGasto(id: string) {
    setGastos(prev => prev.filter(g => g.id !== id));
  }

  const total = gastos.reduce((s, g) => s + g.valor, 0);
  const porPessoa = total / AMIGOS.length;
  const divisoes = calcularDividas(gastos);
  const temDivida = Object.keys(divisoes).length > 0;

  return (
    <section className="gastos-section">
      <div className="gastos-header">
        <div>
          <h2 className="gastos-title">Divisão de Gastos</h2>
          <p className="gastos-desc">Controle quanto cada um gastou e deve</p>
        </div>
      </div>

      {/* Resumo rápido */}
      <div className="gastos-resumo-bar">
        <div className="gastos-resumo-item">
          <span className="gastos-resumo-num">R$ {total.toFixed(2)}</span>
          <span className="gastos-resumo-label">Total gasto</span>
        </div>
        <div className="gastos-resumo-div" />
        <div className="gastos-resumo-item">
          <span className="gastos-resumo-num">R$ {porPessoa.toFixed(2)}</span>
          <span className="gastos-resumo-label">Por pessoa</span>
        </div>
        <div className="gastos-resumo-div" />
        <div className="gastos-resumo-item">
          <span className="gastos-resumo-num">{gastos.length}</span>
          <span className="gastos-resumo-label">Lançamentos</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="gastos-tabs">
        <button className={`gastos-tab ${tab==="lista"?"active":""}`}    onClick={() => setTab("lista")}>Lista</button>
        <button className={`gastos-tab ${tab==="novo"?"active":""}`}     onClick={() => setTab("novo")}>Novo</button>
        <button className={`gastos-tab ${tab==="divisao"?"active":""}`}  onClick={() => setTab("divisao")}>Quem deve</button>
      </div>

      {/* Lista */}
      {tab === "lista" && (
        <div className="gastos-lista">
          {gastos.length === 0 && (
            <p className="gastos-vazio">Nenhum gasto ainda. Adicione o primeiro!</p>
          )}
          {gastos.map(g => (
            <div key={g.id} className="gasto-item">
              <div className="gasto-cat">{g.categoria.split(" ")[0]}</div>
              <div className="gasto-info">
                <span className="gasto-desc">{g.descricao}</span>
                <span className="gasto-meta">{g.data} · Pago por {g.pagador} · {g.participantes.length} pessoas</span>
              </div>
              <div className="gasto-right">
                <span className="gasto-valor">R$ {g.valor.toFixed(2)}</span>
                <button className="gasto-del" onClick={() => removeGasto(g.id)} title="Remover">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Novo gasto */}
      {tab === "novo" && (
        <div className="gasto-form">
          <label className="gasto-label">
            Descrição
            <input
              className="gasto-input"
              placeholder="Ex: Almoço no Parque Lage"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </label>

          <div className="gasto-row">
            <label className="gasto-label" style={{flex:1}}>
              Valor (R$)
              <input
                className="gasto-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={e => setValor(e.target.value)}
              />
            </label>
            <label className="gasto-label" style={{flex:1}}>
              Categoria
              <select className="gasto-input" value={categoria} onChange={e => setCategoria(e.target.value)}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <label className="gasto-label">
            Quem pagou?
            <select className="gasto-input" value={pagador} onChange={e => setPagador(e.target.value)}>
              {AMIGOS.map(a => <option key={a}>{a}</option>)}
            </select>
          </label>

          <div className="gasto-label">
            Dividir entre:
            <div className="gasto-participantes">
              {AMIGOS.map(a => (
                <label key={a} className={`gasto-check-label ${participantes.includes(a) ? "checked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={participantes.includes(a)}
                    onChange={() =>
                      setPartic(prev =>
                        prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
                      )
                    }
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <button
            className="gasto-btn-add"
            onClick={addGasto}
            disabled={!descricao.trim() || !valor || participantes.length === 0}
          >
            ✓ Adicionar gasto
          </button>
        </div>
      )}

      {/* Divisão */}
      {tab === "divisao" && (
        <div className="divisao-wrap">
          {!temDivida && gastos.length === 0 && (
            <p className="gastos-vazio">Adicione gastos para ver a divisão.</p>
          )}
          {!temDivida && gastos.length > 0 && (
            <div className="divisao-ok">
              <span className="divisao-ok-icon">🎉</span>
              <p>Tudo quitado! Ninguém deve nada a ninguém.</p>
            </div>
          )}
          {temDivida && (
            <>
              <p className="divisao-hint">Para quitar todas as contas, basta fazer as transferências abaixo:</p>
              {Object.entries(divisoes).map(([devedor, credores]) =>
                Object.entries(credores).map(([credor, valor]) => (
                  <div key={`${devedor}-${credor}`} className="divisao-item">
                    <span className="divisao-de">{devedor}</span>
                    <span className="divisao-arrow">→</span>
                    <span className="divisao-para">{credor}</span>
                    <span className="divisao-val">R$ {valor.toFixed(2)}</span>
                  </div>
                ))
              )}
            </>
          )}

          {/* Gasto por pessoa */}
          {gastos.length > 0 && (
            <div className="divisao-por-pessoa">
              <h3 className="divisao-sub">Gasto total por pessoa</h3>
              {AMIGOS.map(amigo => {
                const pagou = gastos.filter(g => g.pagador === amigo).reduce((s,g) => s+g.valor, 0);
                const consumiu = gastos
                  .filter(g => g.participantes.includes(amigo))
                  .reduce((s,g) => s + g.valor / g.participantes.length, 0);
                const saldo = pagou - consumiu;
                return (
                  <div key={amigo} className="divisao-pessoa-row">
                    <span className="divisao-pessoa-nome">{amigo}</span>
                    <span className="divisao-pessoa-meta">pagou R$ {pagou.toFixed(2)} · consumiu R$ {consumiu.toFixed(2)}</span>
                    <span className={`divisao-pessoa-saldo ${saldo >= 0 ? "positivo" : "negativo"}`}>
                      {saldo >= 0 ? `+R$ ${saldo.toFixed(2)}` : `-R$ ${Math.abs(saldo).toFixed(2)}`}
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
