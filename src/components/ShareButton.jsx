import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

/**
 * Compartir la página actual. En el celular abre el menú nativo (WhatsApp, Instagram…); en el computador muestra un
 * menú con WhatsApp y "Copiar enlace". `text` acompaña al enlace.
 */
export default function ShareButton({ title, text, className = "btn" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef(null);
  const url = typeof window !== "undefined" ? window.location.href : "";

  // Cerrar al hacer clic fuera o con Esc
  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (!box.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function share() {
    // El menú nativo solo en pantallas táctiles: en Windows abre un diálogo poco útil
    if (navigator.share && window.matchMedia?.("(pointer: coarse)").matches) {
      try { await navigator.share({ title, text, url }); } catch { /* cancelado */ }
      return;
    }
    setOpen(v => !v);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1400);
    } catch { /* sin permiso: el usuario puede copiar de la barra */ }
  }

  return (
    <span className="share" ref={box}>
      <button type="button" className={className} onClick={share} aria-haspopup="menu" aria-expanded={open}>
        <Icon name="share" size={15} /> Compartir
      </button>
      {open && (
        <span className="share-menu" role="menu">
          <a role="menuitem" className="share-item" href={`https://wa.me/?text=${encodeURIComponent(`${text ? `${text} ` : ""}${url}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.8 17.9L.1 24l6.3-1.6A11.8 11.8 0 0 0 24 12.2c0-3.2-1.2-6.1-3.5-8.4z" />
            </svg>
            WhatsApp
          </a>
          <button type="button" role="menuitem" className="share-item" onClick={copy}>
            <Icon name={copied ? "check" : "link"} size={16} /> {copied ? "Enlace copiado" : "Copiar enlace"}
          </button>
        </span>
      )}
    </span>
  );
}
