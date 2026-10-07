import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

/**
 * "Imagen": genera una tarjeta PNG (build() -> Promise<Blob>) y la muestra en una vista previa para descargarla o
 * compartirla. En el celular, "Compartir" abre el menú nativo con la imagen (Instagram, WhatsApp…).
 */
export default function ShareImageButton({ build, filename = "kairo.png", title = "Kairo", disabled = false }) {
  const [state, setState] = useState(null);   // null | { loading } | { url, blob } | { error }
  const dialog = useRef(null);

  useEffect(() => () => { if (state?.url) URL.revokeObjectURL(state.url); }, [state?.url]);
  useEffect(() => {
    if (state && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [state]);

  async function open() {
    setState({ loading: true });
    try {
      const blob = await build();
      if (!blob) throw new Error("No se pudo generar la imagen");
      setState({ url: URL.createObjectURL(blob), blob });
    } catch (e) {
      setState({ error: e.message || "No se pudo generar la imagen" });
    }
  }
  const close = () => { dialog.current?.close(); setState(null); };

  const file = state?.blob ? new File([state.blob], filename, { type: "image/png" }) : null;
  const canShare = Boolean(file && navigator.canShare?.({ files: [file] }));

  return (
    <>
      <button type="button" className="btn" onClick={open} disabled={disabled}>
        <Icon name="image" size={15} /> Imagen
      </button>
      {state && (
        <dialog ref={dialog} className="image-dialog" onClose={() => setState(null)} onClick={e => { if (e.target === dialog.current) close(); }}>
          <div className="image-dialog-body">
            <header>
              <h2>Tarjeta para compartir</h2>
              <button type="button" className="btn btn-icon" onClick={close} aria-label="Cerrar"><Icon name="close" size={15} /></button>
            </header>
            {state.loading ? (
              <div className="image-preview loading"><span className="spinner" aria-hidden="true" /> Generando la imagen…</div>
            ) : state.error ? (
              <p className="loss">{state.error}</p>
            ) : (
              <>
                <img className="image-preview" src={state.url} alt={`Tarjeta: ${title}`} />
                <div className="image-actions">
                  {canShare && (
                    <button type="button" className="btn btn-primary" onClick={() => navigator.share({ files: [file], title }).catch(() => {})}>
                      <Icon name="share" size={15} /> Compartir
                    </button>
                  )}
                  <a className={`btn${canShare ? "" : " btn-primary"}`} href={state.url} download={filename}><Icon name="download" size={15} /> Descargar</a>
                </div>
              </>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
