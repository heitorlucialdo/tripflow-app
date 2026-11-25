import { Icon, type IconName } from "./Icon";

export type Tab = "home" | "fotos" | "gastos" | "checklist" | "memorias" | "aovivo" | "mapa" | "passagens" | "grupo" | "planejar" | "orcamento";

type Item = { id: Tab; icon: IconName; label: string };

const LEFT_ITEMS: Item[] = [
  { id: "gastos",    icon: "wallet",    label: "Gastos" },
  { id: "checklist", icon: "checklist", label: "Lista"  },
];
const RIGHT_ITEMS: Item[] = [
  { id: "aovivo",   icon: "radar", label: "Ao Vivo"  },
  { id: "mapa",     icon: "map",   label: "Mapa"     },
];

// Numa viagem real só aparecem as telas que já funcionam com o grupo;
// as demais seguem presas à viagem demo.
const TRIP_LEFT: Item[] = [
  { id: "gastos",    icon: "wallet",     label: "Gastos"    },
  { id: "orcamento", icon: "calculator", label: "Orçamento" },
];
const TRIP_RIGHT: Item[] = [
  { id: "mapa",  icon: "map",   label: "Mapa"  },
  { id: "grupo", icon: "users", label: "Grupo" },
];

interface Props {
  tab: Tab;
  setTab: (t: Tab) => void;
  tripMode?: boolean;
  onAssistant: () => void;
}

export function BottomNav({ tab, setTab, tripMode = false, onAssistant }: Props) {
  const left  = tripMode ? TRIP_LEFT  : LEFT_ITEMS;
  const right = tripMode ? TRIP_RIGHT : RIGHT_ITEMS;

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
        {left.map(renderItem)}

        <button className="bnav-center" aria-label="Abrir assistente" onClick={onAssistant}>
          <span className="bnav-center-ring" />
          <Icon name="sparkle" size={24} strokeWidth={1.6} />
        </button>

        {right.map(renderItem)}
      </div>
    </nav>
  );
}
