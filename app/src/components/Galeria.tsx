import { useState } from "react";

// Adicione aqui as fotos de vocês na pasta public/imgs/galeria/
// Exemplo: { src: "/imgs/galeria/foto1.jpg", caption: "Copacabana 🏖️" }
const FOTOS = [
  { src: "/imgs/mureta-urca/mureta-1.jpg",           caption: "Mureta da Urca 🍺" },
  { src: "/imgs/arpoador/arpoador-4.jpeg",           caption: "Pôr do sol no Arpoador 🌅" },
  { src: "/imgs/escadaria/escadaria-1.jpeg",         caption: "Escadaria Selarón 🎨" },
  { src: "/imgs/standup/standup-1.jpeg",             caption: "Stand Up Paddle 🏄" },
  { src: "/imgs/forte/forte-1.jpg",                  caption: "Forte do Leme 🏰" },
  { src: "/imgs/jardim-botanico/jardim-botanico-2.jpeg", caption: "Jardim Botânico 🌿" },
  { src: "/imgs/aquario/aquario-1.jpg",              caption: "AquaRio 🐠" },
  { src: "/imgs/scenarium/scenarium-1.jpeg",         caption: "Rio Scenarium 🎶" },
  { src: "/imgs/arpoador/arpoador-3.jpg",            caption: "Arpoador ao entardecer 🌇" },
  { src: "/imgs/parque-lage/parque-lage-1.jpeg",     caption: "Parque Lage ☕" },
  { src: "/imgs/bosque-bar/bosque-bar-1.jpg",        caption: "Bosque Bar 🌳" },
  { src: "/imgs/aterro/aterro-1.webp",               caption: "Aterro do Flamengo 🚴" },
];

export function Galeria() {
  const [lightbox, setLightbox] = useState<number | null>(null);

  function prev() {
    setLightbox((i) => (i === null ? null : (i - 1 + FOTOS.length) % FOTOS.length));
  }
  function next() {
    setLightbox((i) => (i === null ? null : (i + 1) % FOTOS.length));
  }

  return (
    <section className="galeria-section">
      <h2 className="section-title">Nossas memórias</h2>
      <p className="galeria-sub">Clique em qualquer foto para ver em tela cheia</p>

      <div className="galeria-grid">
        {FOTOS.map((foto, i) => (
          <div
            key={i}
            className="galeria-item"
            onClick={() => setLightbox(i)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setLightbox(i)}
          >
            <img src={foto.src} alt={foto.caption} loading="lazy" />
            <div className="galeria-caption">{foto.caption}</div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="lightbox-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}
        >
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <button className="lightbox-nav lightbox-prev" onClick={prev}>‹</button>

          <div className="lightbox-content">
            <img src={FOTOS[lightbox].src} alt={FOTOS[lightbox].caption} />
            <p className="lightbox-caption">{FOTOS[lightbox].caption}</p>
            <span className="lightbox-counter">{lightbox + 1} / {FOTOS.length}</span>
          </div>

          <button className="lightbox-nav lightbox-next" onClick={next}>›</button>
        </div>
      )}
    </section>
  );
}
