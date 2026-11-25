import { useState, useCallback, useEffect } from "react";
import { Hero } from "./components/Hero";
import { DayBlock } from "./components/DayBlock";
import { Modal } from "./components/Modal";
import { Resumo } from "./components/Resumo";
import { Checklist } from "./components/Checklist";
import { Galeria } from "./components/Galeria";
import { Mapa } from "./components/Mapa";
import { MinhasFotos } from "./components/MinhasFotos";
import { ModoAoVivo } from "./components/ModoAoVivo";
import { Gastos } from "./components/Gastos";
import { BottomNav } from "./components/BottomNav";
import { MenuLateral } from "./components/MenuLateral/MenuLateral";
import { InstallPrompt } from "./components/InstallPrompt";
import { TripHero } from "./components/TripHero/TripHero";
import { RoteiroViagem } from "./components/RoteiroViagem/RoteiroViagem";
import { Orcamento } from "./components/Orcamento/Orcamento";
import type { Tab } from "./components/BottomNav";
import { useNotes } from "./hooks/useNotes";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useTrip } from "./hooks/useTrip";
import { ThemeToggle } from "./components/ThemeToggle";
import { Login } from "./pages/Login/Login";
import { SplashScreen } from "./components/SplashScreen/SplashScreen";
import { Cadastro } from "./pages/Cadastro/Cadastro";
import { NovaSenha } from "./pages/NovaSenha/NovaSenha";
import { Passagens } from "./pages/Passagens/Passagens";
import { Perfil } from "./pages/Perfil/Perfil";
import { Grupo } from "./pages/Grupo/Grupo";
import { NovaViagem } from "./pages/NovaViagem/NovaViagem";
import { Votacao } from "./pages/Votacao/Votacao";
import { EstiloRoteiro } from "./components/EstiloRoteiro/EstiloRoteiro";
import { AssistenteRoteiro } from "./components/AssistenteRoteiro/AssistenteRoteiro";
import { Sheet } from "./components/Sheet/Sheet";
import { Viagens } from "./pages/Viagens/Viagens";
import { Convite } from "./pages/Convite/Convite";
import { ComoVai } from "./components/ComoVai/ComoVai";
import { Assistente } from "./components/Assistente/Assistente";
import { DAYS } from "./data";
import { PENDING_INVITE_KEY, DEMO_TRIP_ID } from "./lib/trip-context";
import { DemoAviso } from "./components/BoasVindas/BoasVindas";
import "./App.css";

const TABS: Tab[] = ["home", "fotos", "gastos", "checklist", "memorias", "aovivo", "mapa", "votacao", "orcamento", "passagens"];

// Rota da viagem demo (data.ts), mostrada para quem ainda não criou viagem
const DEMO_ROUTE = {
  origin:      { label: "Cuiabá, Mato Grosso", name: "Cuiabá", lat: -15.601, lng: -56.097 },
  destination: { label: "Rio de Janeiro, RJ", name: "Rio de Janeiro", lat: -22.906, lng: -43.172 },
};
const DEMO_ONLY_TABS: Tab[] = ["fotos", "checklist", "memorias", "aovivo"];

function initialTab(): Tab {
  const param = new URLSearchParams(window.location.search).get("tab");
  return TABS.find((t) => t === param) ?? "home";
}

function readPendingInvite(): string | null {
  try { return sessionStorage.getItem(PENDING_INVITE_KEY); } catch { return null; }
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isInvite = location.pathname.startsWith("/convite/");

  const [showSplash, setShowSplash]   = useState(!isInvite);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  const [tab, setTab]                 = useState<Tab>(initialTab);
  const [activePlace, setActivePlace] = useState<string | null>(null);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [showPerfil, setShowPerfil]   = useState(false);
  const [showGrupo, setShowGrupo]     = useState(false);
  const [showViagens, setShowViagens] = useState(false);
  const [showComoVai, setShowComoVai] = useState(false);
  const [showAssistente, setShowAssistente] = useState(false);
  const { notes, save }               = useNotes();
  const { user, loading }             = useAuth();
  const [showNova, setShowNova]       = useState(false);
  const [showEstilo, setShowEstilo]   = useState(false);
  const [showAjuste, setShowAjuste]   = useState(false);

  function openTab(t: Tab) {
    setTab(t);
    window.scrollTo({ top: 0 });
  }

  const { activeTrip, demoMode, loading: tripsLoading, selectTrip } = useTrip();
  // Conta nova sem viagem: boas-vindas em vez da demo.
  const welcome = Boolean(user) && !activeTrip && !demoMode;

  // Quem clicou num convite e foi fazer login volta para o convite depois.
  useEffect(() => {
    if (!user || isInvite) return;
    const token = readPendingInvite();
    if (token) navigate(`/convite/${token}`, { replace: true });
  }, [user, isInvite, navigate]);

  // Telas que só existem na viagem demo não fazem sentido numa viagem real.
  useEffect(() => {
    if ((activeTrip || welcome) && DEMO_ONLY_TABS.includes(tab)) setTab("home");
  }, [activeTrip, welcome, tab]);

  const openCreateTrip = useCallback(() => { setShowViagens(false); setShowNova(true); }, []);

  const handleTab = useCallback((t: Tab) => {
    if (t === "grupo") { setShowGrupo(true); return; }
    setTab(t);
  }, []);

  if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

  // Espera as viagens carregarem para não piscar a demo antes da viagem real.
  if (loading || (user && tripsLoading)) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060b1c" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #18233f", borderTopColor: "#3dd9ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (isInvite) return (
    <Routes>
      <Route path="/convite/:token" element={<Convite />} />
    </Routes>
  );

  // Atalho só para ver a interface sem Supabase: VITE_SKIP_LOGIN=true no .env.local, e só em desenvolvimento.
  const skipLogin = import.meta.env.DEV && import.meta.env.VITE_SKIP_LOGIN === "true";

  if (!user && !skipLogin) return (
    <Routes>
      <Route path="/login"       element={<Login />} />
      <Route path="/cadastro"    element={<Cadastro />} />
      <Route path="/nova-senha"  element={<NovaSenha />} />
      <Route path="*"            element={<Navigate to="/login" replace />} />
    </Routes>
  );

  // Primeiro passo de quem não tem viagem (ou pediu uma nova): rota, dias, amigos e estilo
  if (showNova || (welcome && user)) return (
    <NovaViagem
      onClose={welcome ? () => selectTrip(DEMO_TRIP_ID) : () => setShowNova(false)}
      onDone={() => { setShowNova(false); setTab("home"); window.scrollTo({ top: 0 }); }}
    />
  );

  return (
    <>
      {/* Hamburguer — top-left, sempre visível */}
      <button
        className="menu-btn"
        onClick={() => setMenuOpen(true)}
        aria-label="Abrir menu"
      >
        <span /><span /><span />
      </button>

      <ThemeToggle />

      {/* Menu lateral */}
      <MenuLateral
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenPerfil={() => setShowPerfil(true)}
        onOpenGrupo={() => setShowGrupo(true)}
        onOpenComoVai={() => setShowComoVai(true)}
        onOpenVotacao={() => openTab("votacao")}
        onOpenFotos={() => openTab("fotos")}
        onOpenMemorias={() => openTab("memorias")}
        onOpenViagens={() => setShowViagens(true)}
        onOpenPassagens={() => { setTab("passagens"); window.scrollTo({ top: 0 }); }}
      />

      {/* HOME — viagem real: cabeçalho + roteiro do grupo */}
      {tab === "home" && activeTrip && (
        <>
          <TripHero
            trip={activeTrip}
            onInvite={() => setShowGrupo(true)}
            onBudget={() => setTab("orcamento")}
            onChangeItinerary={() => setShowEstilo(true)}
            onAskAI={() => setShowAjuste(true)}
          />
          <RoteiroViagem key={activeTrip.id} trip={activeTrip} onAskAI={() => setShowAjuste(true)} />
          <footer className="site-footer">TripFlow · {activeTrip.name}</footer>
        </>
      )}

      {/* HOME — viagem demo: Hero + Roteiro + Resumo */}
      {tab === "home" && !activeTrip && !welcome && (
        <>
          {user && <DemoAviso onCreate={openCreateTrip} />}
          <Hero route={DEMO_ROUTE} onPlan={openCreateTrip} onChangeRoute={openCreateTrip} />
          <section id="itinerary" className="itinerary">
            <h2 className="section-title">O roteiro</h2>
            {DAYS.map((day, i) => (
              <DayBlock key={day.num} day={day} index={i} onPlaceClick={setActivePlace} />
            ))}
          </section>
          <Resumo />
          <footer className="site-footer">TripFlow · Cuiabá → Rio de Janeiro</footer>
        </>
      )}

      {/* SEÇÕES */}
      {tab === "gastos"    && <div className="tab-page"><Gastos /></div>}
      {tab === "mapa"      && <div className="tab-page"><Mapa key={`mapa-${activeTrip?.id ?? "demo"}`} /></div>}
      {tab === "orcamento" && activeTrip && <div className="tab-page"><Orcamento trip={activeTrip} /></div>}
      {tab === "votacao"   && activeTrip && <Votacao key={activeTrip.id} trip={activeTrip} onOpenRoteiro={() => openTab("home")} />}
      {tab === "passagens" && <div className="tab-page"><Passagens key={activeTrip?.id ?? "demo"} /></div>}
      {!activeTrip && (
        <>
          {tab === "fotos"     && <div className="tab-page"><MinhasFotos /></div>}
          {tab === "checklist" && <div className="tab-page"><Checklist /></div>}
          {tab === "memorias"  && <div className="tab-page"><Galeria /></div>}
          {tab === "aovivo"    && <div className="tab-page"><ModoAoVivo /></div>}
        </>
      )}

      {!welcome && (
        <BottomNav tab={tab} setTab={handleTab} tripMode={Boolean(activeTrip)} onAssistant={() => setShowAssistente(true)} />
      )}
      <InstallPrompt />

      <Modal
        name={activePlace}
        onClose={() => setActivePlace(null)}
        note={activePlace ? (notes[activePlace] ?? "") : ""}
        onSaveNote={(text) => activePlace && save(activePlace, text)}
      />

      {showPerfil   && <Perfil onClose={() => setShowPerfil(false)} />}
      {showGrupo    && <Grupo  onClose={() => setShowGrupo(false)} onOpenViagens={() => setShowViagens(true)} />}
      {showViagens  && (
        <Viagens
          onCreateNew={openCreateTrip}
          onClose={() => { setShowViagens(false); setTab("home"); }}
        />
      )}
      {showComoVai  && (
        <ComoVai
          onClose={() => setShowComoVai(false)}
          onGo={t => { setTab(t); window.scrollTo({ top: 0 }); }}
          onOpenViagens={() => setShowViagens(true)}
        />
      )}
      {showEstilo && activeTrip && (
        <Sheet title="Mudar roteiro" onClose={() => setShowEstilo(false)}>
          <EstiloRoteiro trip={activeTrip} replacing onDone={() => setShowEstilo(false)} />
        </Sheet>
      )}
      {showAjuste && activeTrip && <AssistenteRoteiro trip={activeTrip} onClose={() => setShowAjuste(false)} />}
      {showAssistente && <Assistente onClose={() => setShowAssistente(false)} onOpenViagens={() => setShowViagens(true)} />}
    </>
  );
}
