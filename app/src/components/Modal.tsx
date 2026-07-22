import { useEffect, useRef, useState } from "react";
import { PLACES } from "../data";

interface Props {
  name: string | null;
  onClose: () => void;
  note: string;
  onSaveNote: (text: string) => void;
}

export function Modal({ name, onClose, note, onSaveNote }: Props) {
  const [imgIndex, setImgIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const info = name ? PLACES[name] : null;
  const isOpen = name !== null;

  // Reset when modal opens for a different place
  useEffect(() => {
    setImgIndex(0);
    setDraft(note);
    setSaved(false);
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !info || !name) return null;

  const imgs = info.imgs;
  const hasMultiple = imgs.length > 1;
  const currentImg = imgs[imgIndex] ?? null;

  function prev() { setImgIndex((i) => (i - 1 + imgs.length) % imgs.length); }
  function next() { setImgIndex((i) => (i + 1) % imgs.length); }

  return (
    <div
      className="modal-overlay open"
      role="dialog"
      aria-modal
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box">
        <button className="modal-close" aria-label="Fechar" onClick={onClose}>✕</button>

        {/* Image carousel */}
        <div className="modal-carousel">
          {currentImg ? (
            <img
              key={currentImg}
              className="modal-img"
              src={currentImg}
              alt={`${name} ${imgIndex + 1}`}
            />
          ) : (
            <div className="modal-img-ph" style={{ background: info.gradient }}>{name}</div>
          )}

          {hasMultiple && (
            <>
              <button className="carousel-btn carousel-prev" onClick={prev} aria-label="Anterior">‹</button>
              <button className="carousel-btn carousel-next" onClick={next} aria-label="Próxima">›</button>
              <div className="carousel-dots">
                {imgs.map((_, i) => (
                  <button
                    key={i}
                    className={`carousel-dot${i === imgIndex ? " active" : ""}`}
                    onClick={() => setImgIndex(i)}
                    aria-label={`Foto ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-content">
          <h3 className="modal-title" id="modal-title">{name}</h3>

          <div className="modal-row">
            <span className="modal-icon">📍</span>
            <div>
              <div className="modal-label">Onde fica</div>
              <div className="modal-val">{info.onde}</div>
            </div>
          </div>

          <div className="modal-row">
            <span className="modal-icon">💰</span>
            <div>
              <div className="modal-label">Preço</div>
              <div className="modal-val">{info.preco}</div>
            </div>
          </div>

          <div className="modal-row">
            <span className="modal-icon">💡</span>
            <div>
              <div className="modal-label">Curiosidade</div>
              <div className="modal-val">{info.curiosidade}</div>
            </div>
          </div>

          {/* Nota dos amigos */}
          <div className="modal-note-section">
            <div className="modal-label" style={{ marginBottom: ".4rem" }}>
              📝 Nossa nota
            </div>
            <textarea
              ref={textareaRef}
              className="modal-note-input"
              placeholder="Escreve aqui o que rolou nesse lugar... 😄"
              value={draft}
              rows={3}
              onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
            />
            <button
              className={`modal-note-save${saved ? " saved" : ""}`}
              onClick={() => { onSaveNote(draft); setSaved(true); }}
            >
              {saved ? "✓ Salvo!" : "Salvar nota"}
            </button>
          </div>

          {/* Action buttons */}
          <div className="modal-actions">
            {info.link && (
              <a
                className="modal-btn modal-btn-map"
                href={info.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                🗺️ Ver no mapa
              </a>
            )}
            {info.linkPagamento && (
              <a
                className="modal-btn modal-btn-pay"
                href={info.linkPagamento}
                target="_blank"
                rel="noopener noreferrer"
              >
                🎟️ Comprar ingresso
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
