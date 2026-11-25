export interface SaldoGasto {
  valor: number;
  pagadorId: string;
  participantes: string[];
}

export interface SaldoAcerto {
  from: string;
  to: string;
  amount: number;
  confirmed: boolean;
}

export interface Transfer {
  de: string;
  para: string;
  valor: number;
}

// Saldo positivo = tem a receber; negativo = deve. Só acertos confirmados contam.
export function calcularSaldos(pessoas: string[], gastos: SaldoGasto[], acertos: SaldoAcerto[]): Record<string, number> {
  const saldo: Record<string, number> = {};
  pessoas.forEach(p => { saldo[p] = 0; });

  for (const g of gastos) {
    const partes = g.participantes.length;
    if (partes === 0) continue;
    const cota = g.valor / partes;
    saldo[g.pagadorId] = (saldo[g.pagadorId] ?? 0) + g.valor;
    g.participantes.forEach(p => { saldo[p] = (saldo[p] ?? 0) - cota; });
  }

  for (const a of acertos) {
    if (!a.confirmed) continue;
    saldo[a.from] = (saldo[a.from] ?? 0) + a.amount;
    saldo[a.to]   = (saldo[a.to] ?? 0) - a.amount;
  }
  return saldo;
}

export function simplificar(saldo: Record<string, number>): Transfer[] {
  const devedores = Object.entries(saldo).filter(([, v]) => v < -0.01).map(([k, v]) => ({ id: k, val: -v }));
  const credores  = Object.entries(saldo).filter(([, v]) => v > 0.01).map(([k, v]) => ({ id: k, val: v }));

  const out: Transfer[] = [];
  let di = 0, ci = 0;
  while (di < devedores.length && ci < credores.length) {
    const valor = Math.min(devedores[di].val, credores[ci].val);
    if (valor > 0.01) out.push({ de: devedores[di].id, para: credores[ci].id, valor: Math.round(valor * 100) / 100 });
    devedores[di].val -= valor;
    credores[ci].val  -= valor;
    if (devedores[di].val < 0.01) di++;
    if (credores[ci].val < 0.01) ci++;
  }
  return out;
}

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
