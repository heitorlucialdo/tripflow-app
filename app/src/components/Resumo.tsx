import { COSTS } from "../data";
import { StatCard } from "./StatCard";

export function Resumo() {
  return (
    <section className="resumo">
      <h2 className="section-title">Resumo da viagem</h2>

      <div className="stats-grid">
        <StatCard icon="/icons_menu/calendario.svg" target={6}   label="Dias de Viagem" />
        <StatCard icon="/icons_menu/pessoas.svg"   target={4}   label="Amigos" />
        <StatCard icon="/icons_menu/mapa-stat.svg"      target={22}  label="Locais" />
        <StatCard icon="/icons_menu/gastos-stat.svg"    target={514} prefix="R$" label="Em atrações/pessoa" />
      </div>

      <table className="cost-table">
        <thead>
          <tr>
            <th>Atração</th>
            <th>Custo/pessoa</th>
          </tr>
        </thead>
        <tbody>
          {COSTS.map((row) => (
            <tr key={row.label} className={row.isTotal ? "cost-total" : undefined}>
              <td>{row.label}</td>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
