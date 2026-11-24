import { Icon } from "../Icon";
import styles from "./BoasVindas.module.css";

interface Props {
  name: string | null;
  onCreate: () => void;
  onDemo: () => void;
}

// Primeira tela de quem ainda não tem viagem: nada de demo fingindo ser a viagem da pessoa.
export function BoasVindas({ name, onCreate, onDemo }: Props) {
  const first = name?.trim().split(" ")[0];

  return (
    <section className={styles.wrap}>
      <span className={styles.badge}>Bem-vindo{first ? `, ${first}` : ""}</span>
      <h1 className={styles.title}>Sua próxima viagem<br />começa aqui</h1>
      <p className={styles.lead}>
        Crie a viagem, chame o grupo pelo WhatsApp e organizem juntos roteiro, gastos e acertos por Pix.
      </p>

      <button className={styles.primary} onClick={onCreate}>
        <Icon name="plus" size={20} />
        Criar minha viagem
      </button>

      <div className={styles.invite}>
        <Icon name="link" size={18} />
        <span>Recebeu um convite? Abra o link que mandaram no grupo para entrar direto na viagem.</span>
      </div>

      <ol className={styles.steps}>
        <li><strong>Crie a viagem</strong><span>destino e datas</span></li>
        <li><strong>Chame o grupo</strong><span>um link no WhatsApp, sem cadastro para quem recebe</span></li>
        <li><strong>Planejem e dividam</strong><span>roteiro com IA, gastos e Pix</span></li>
      </ol>

      <button className={styles.demo} onClick={onDemo}>Ver uma viagem de exemplo</button>
    </section>
  );
}

// Faixa fixa na demo para ninguém confundir o exemplo com a própria viagem.
export function DemoAviso({ onCreate }: { onCreate: () => void }) {
  return (
    <div className={styles.demoBar} role="status">
      <span>Você está vendo uma viagem de exemplo.</span>
      <button onClick={onCreate}>Criar a minha</button>
    </div>
  );
}
