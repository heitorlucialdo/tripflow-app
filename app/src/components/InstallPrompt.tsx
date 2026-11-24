import { useEffect, useState } from "react";
import { Icon } from "./Icon";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "tripflow-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed());

  useEffect(() => {
    if (hidden) return;

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const timer = isIos ? setTimeout(() => setShowIos(true), 4000) : undefined;

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (timer) clearTimeout(timer);
    };
  }, [hidden]);

  function dismiss() {
    setHidden(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* armazenamento indisponível */ }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (hidden || (!deferred && !showIos)) return null;

  return (
    <div className="install-card" role="dialog" aria-label="Instalar TripFlow">
      <img src="/icons/icon-192.png" alt="" />
      <div className="install-text">
        <strong>Instale o TripFlow</strong>
        <span>
          {deferred
            ? "Abra direto da tela inicial, até sem internet."
            : "Toque em Compartilhar e depois em “Adicionar à Tela de Início”."}
        </span>
      </div>
      {deferred && (
        <button className="install-go" onClick={install}>
          Instalar
        </button>
      )}
      <button className="install-x" onClick={dismiss} aria-label="Fechar">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
