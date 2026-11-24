import { Icon, type IconName } from "./Icon";

export type Tab = "home" | "fotos" | "gastos" | "checklist" | "memorias" | "aovivo" | "mapa" | "passagens" | "grupo";

type Item = { id: Tab; icon: IconName; label: string };

// passagens volta na Fase 2: { id: "passagens", icon: "plane", label: "Voos" }
const LEFT_ITEMS: Item[] = [
  { id: "fotos",     icon: "camera",    label: "Fotos"  },
  { id: "gastos",    icon: "wallet",    label: "Gastos" },
  { id: "checklist", icon: "checklist", label: "Lista"  },
];
const RIGHT_ITEMS: Item[] = [
  { id: "memorias", icon: "film",  label: "Memórias" },
  { id: "aovivo",   icon: "radar", label: "Ao Vivo"  },
  { id: "mapa",     icon: "map",   label: "Mapa"     },
];

interface Props {
  tab: Tab;
  setTab: (t: Tab) => void;
}

export function BottomNav({ tab, setTab }: Props) {
  function go(t: Tab) {
    setTab(t);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function renderItem(item: Item) {
    const active = tab === item.id;
    return (
      <button
        key={item.id}
        className={`bnav-item ${active ? "bnav-active" : ""}`}
        onClick={() => go(active ? "home" : item.id)}
        aria-current={active ? "page" : undefined}
        aria-label={item.label}
      >
        <span className="bnav-icon-wrap">
          <Icon name={item.icon} size={22} />
        </span>
        <span className="bnav-label">{item.label}</span>
      </button>
    );
  }

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <div className="bnav-pill">
        {LEFT_ITEMS.map(renderItem)}

        <button className="bnav-center" aria-label="Assistente IA (em breve)" disabled>
          <span className="bnav-center-ring" />
          <Icon name="sparkle" size={24} strokeWidth={1.6} />
          <span className="bnav-soon">em breve</span>
        </button>

        {RIGHT_ITEMS.map(renderItem)}
      </div>
    </nav>
  );
}
