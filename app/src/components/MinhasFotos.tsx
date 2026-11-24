import { useRef, useState } from "react";
import { usePhotoStore } from "../hooks/usePhotoStore";

export function MinhasFotos() {
  const { photos, addPhoto, deletePhoto } = usePhotoStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingUrl(reader.result as string);
      setCaptionDraft("");
    };
    reader.readAsDataURL(file);
    // reset input so same file can be picked again
    e.target.value = "";
  }

  async function confirmAdd() {
    if (!pendingUrl) return;
    await addPhoto(pendingUrl, captionDraft.trim() || "Sem legenda");
    setPendingUrl(null);
  }

  function prev() {
    setLightbox((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  }
  function next() {
    setLightbox((i) => (i === null ? null : (i + 1) % photos.length));
  }

  return (
    <section className="minhasfotos-section">
      <h2 className="section-title">Nossas fotos</h2>
      <p className="galeria-sub">Fotos tiradas por vocês durante a viagem — salvas no seu celular</p>

      <div className="minhasfotos-actions">
        <button className="camera-btn" onClick={() => inputRef.current?.click()}>
          Tirar / Adicionar foto
        </button>
        {/* capture="environment" abre câmera traseira no celular */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {/* Preview antes de salvar */}
      {pendingUrl && (
        <div className="photo-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPendingUrl(null); }}>
          <div className="photo-confirm-box">
            <img src={pendingUrl} alt="prévia" className="photo-confirm-img" />
            <input
              className="photo-caption-input"
              placeholder="Legenda (ex: Mureta da Urca 🍺)"
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              autoFocus
            />
            <div className="photo-confirm-btns">
              <button className="photo-btn-cancel" onClick={() => setPendingUrl(null)}>Cancelar</button>
              <button className="photo-btn-save" onClick={confirmAdd}>✓ Salvar foto</button>
            </div>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <p className="minhasfotos-empty">
          Nenhuma foto ainda — clique no botão acima para começar!
        </p>
      ) : (
        <div className="galeria-grid">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className="galeria-item"
              onClick={() => setLightbox(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setLightbox(i)}
            >
              <img src={photo.dataUrl} alt={photo.caption} loading="lazy" />
              <div className="galeria-caption">{photo.caption}</div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && photos[lightbox] && (
        <div
          className="lightbox-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}
        >
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <button className="lightbox-nav lightbox-prev" onClick={prev}>‹</button>

          <div className="lightbox-content">
            <img src={photos[lightbox].dataUrl} alt={photos[lightbox].caption} />
            <p className="lightbox-caption">{photos[lightbox].caption}</p>
            <span className="lightbox-counter">
              {lightbox + 1} / {photos.length} &nbsp;·&nbsp; {photos[lightbox].takenAt}
            </span>
            <button
              className="photo-delete-btn"
              onClick={() => {
                if (deleting === photos[lightbox].id) {
                  deletePhoto(photos[lightbox].id);
                  setLightbox((i) => {
                    if (i === null) return null;
                    return photos.length <= 1 ? null : Math.min(i, photos.length - 2);
                  });
                  setDeleting(null);
                } else {
                  setDeleting(photos[lightbox].id);
                }
              }}
            >
              {deleting === photos[lightbox].id ? "⚠️ Confirmar exclusão" : "🗑️ Excluir foto"}
            </button>
          </div>

          <button className="lightbox-nav lightbox-next" onClick={next}>›</button>
        </div>
      )}
    </section>
  );
}
