import { useState, useCallback } from "react";
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
import type { Tab } from "./components/BottomNav";
import { useNotes } from "./hooks/useNotes";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { ThemeToggle } from "./components/ThemeToggle";
import { Login } from "./pages/Login/Login";
import { SplashScreen } from "./components/SplashScreen/SplashScreen";
import { Cadastro } from "./pages/Cadastro/Cadastro";
import { NovaSenha } from "./pages/NovaSenha/NovaSenha";
import { Passagens } from "./pages/Passagens/Passagens";
import { Perfil } from "./pages/Perfil/Perfil";
import { Grupo } from "./pages/Grupo/Grupo";
import { Planejar } from "./pages/Planejar/Planejar";
import { Onboarding } from "./pages/Onboarding/Onboarding";
import { useTripRoute } from "./hooks/useTripRoute";
import { DAYS } from "./data";

const TABS: Tab[] = ["home", "fotos", "gastos", "checklist", "memorias", "aovivo", "mapa", "planejar"];

function initialTab(): Tab {
  const param = new URLSearchParams(window.location.search).get("tab");
  return TABS.find((t) => t === param) ?? "home";
}
import "./App.css";

export default function App() {
  const [showSplash, setShowSplash]   = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  const [tab, setTab]                 = useState<Tab>(initialTab);
  const [activePlace, setActivePlace] = useState<string | null>(null);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [showPerfil, setShowPerfil]   = useState(false);
  const [showGrupo, setShowGrupo]     = useState(false);
  const [, setShowComoVai]            = useState(false);
  const { notes, save }               = useNotes();
  const { user, loading }             = useAuth();
  const { route, setRoute }           = useTripRoute();
  const [editRoute, setEditRoute]     = useState(false);

  function openTab(t: Tab) {
    setTab(t);
    window.scrollTo({ top: 0 });
  }
  const openPlanner = () => openTab("planejar");

  if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060b1c" }}>
      <div style={{ width: 32, height: 32, border: "3px solid #18233f", borderTopColor: "#3dd9ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  // Login desativado temporariamente só em desenvolvimento (localhost); produção continua exigindo login
  const skipLogin = import.meta.env.DEV;

  if (!user && !skipLogin) return (
    <Routes>
      <Route path="/login"       element={<Login />} />
      <Route path="/cadastro"    element={<Cadastro />} />
      <Route path="/nova-senha"  element={<NovaSenha />} />
      <Route path="*"            element={<Navigate to="/login" replace />} />
    </Routes>
  );

  // Primeiro passo de todo usuário: de onde sai e para onde vai
  if (!route || editRoute) return (
    <Onboarding
      initial={route}
      onDone={(r) => { setRoute(r); setEditRoute(false); setTab("home"); }}
    />
  );

  const isDemoTrip = /rio de janeiro/i.test(route.destination.name);

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
        onOpenPlanejar={openPlanner}
        onOpenFotos={() => openTab("fotos")}
        onOpenMemorias={() => openTab("memorias")}
      />

      {/* HOME — Hero + Roteiro + Resumo */}
      {tab === "home" && (
        <>
          <Hero route={route} onPlan={openPlanner} onChangeRoute={() => setEditRoute(true)} />
          {isDemoTrip ? (
            <>
              <section id="itinerary" className="itinerary">
                <h2 className="section-title">O roteiro</h2>
                {DAYS.map((day, i) => (
                  <DayBlock key={day.num} day={day} index={i} onPlaceClick={setActivePlace} />
                ))}
              </section>
              <Resumo />
            </>
          ) : (
            <div className="home-plan-cta">
              <p>Ainda não tem roteiro para {route.destination.name}. Escolha onde vai ficar e a gente sugere passeios, restaurantes e baladas.</p>
              <button className="hero-plan" onClick={openPlanner}>Planejar agora</button>
            </div>
          )}
          <footer className="site-footer">
            TripFlow · {route.origin.name} → {route.destination.name}
          </footer>
        </>
      )}

      {/* SEÇÕES */}
      {tab === "passagens" && <div className="tab-page"><Passagens /></div>}
      {tab === "fotos"     && <div className="tab-page"><MinhasFotos /></div>}
      {tab === "gastos"    && <div className="tab-page"><Gastos /></div>}
      {tab === "checklist" && <div className="tab-page"><Checklist /></div>}
      {tab === "memorias"  && <div className="tab-page"><Galeria /></div>}
      {tab === "aovivo"    && <div className="tab-page"><ModoAoVivo /></div>}
      {tab === "planejar"  && <div className="tab-page"><Planejar destino={route.destination} /></div>}
      {tab === "mapa"      && <div className="tab-page"><Mapa key="mapa-tab" /></div>}

      <BottomNav tab={tab} setTab={setTab} />
      <InstallPrompt />

      <Modal
        name={activePlace}
        onClose={() => setActivePlace(null)}
        note={activePlace ? (notes[activePlace] ?? "") : ""}
        onSaveNote={(text) => activePlace && save(activePlace, text)}
      />

      {showPerfil   && <Perfil onClose={() => setShowPerfil(false)} />}
      {showGrupo    && <Grupo  onClose={() => setShowGrupo(false)} />}
    </>
  );
}
