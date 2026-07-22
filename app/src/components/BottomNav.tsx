export type Tab = "home" | "fotos" | "gastos" | "checklist" | "memorias" | "aovivo" | "mapa" | "passagens";

const LEFT_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "passagens", icon: "/icons_menu/passagens.svg", label: "Voos"    },
  { id: "gastos",    icon: "/icons_menu/gastos.svg",    label: "Gastos"  },
  { id: "checklist", icon: "/icons_menu/lista.svg",     label: "Lista"   },
];
const RIGHT_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "memorias",  icon: "/icons_menu/memorias.svg", label: "Memórias" },
  { id: "aovivo",    icon: "/icons_menu/aovivo.svg",   label: "Ao Vivo"  },
  { id: "mapa",      icon: "/icons_menu/mapa.svg",     label: "Mapa"     },
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

  return (
    <nav className="bottom-nav">
      {LEFT_ITEMS.map(item => (
        <button
          key={item.id}
          className={`bnav-item ${tab === item.id ? "bnav-active" : ""}`}
          onClick={() => go(item.id)}
        >
          <span className="bnav-icon-wrap">
            <img src={item.icon} alt="" className="bnav-icon-img" aria-hidden="true" />
          </span>
          <span className="bnav-label">{item.label}</span>
        </button>
      ))}

      {/* Center — IA (sem função por enquanto) */}
      <button
        className="bnav-center"
        aria-label="IA"
        disabled
      >
        <img src="/icons_menu/ia.svg" alt="" className="bnav-center-img" aria-hidden="true" />
      </button>

      {RIGHT_ITEMS.map(item => (
        <button
          key={item.id}
          className={`bnav-item ${tab === item.id ? "bnav-active" : ""}`}
          onClick={() => go(item.id)}
        >
          <span className="bnav-icon-wrap">
            <img src={item.icon} alt="" className="bnav-icon-img" aria-hidden="true" />
          </span>
          <span className="bnav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
