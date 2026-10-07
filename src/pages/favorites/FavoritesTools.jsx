import { useState } from "react";
import Icon from "../../components/Icon";
import { disableWebPush, enableWebPush, testWebPush, useWebPush, webPushSupported } from "../../lib/webPush";
import { createSync, formatCode, linkSync, unlinkSync, useSync } from "../../lib/sync";

/** Avisos en este navegador y sincronización entre dispositivos (arriba de la lista de favoritos) */
export default function FavoritesTools() {
  return (
    <div className="fav-tools">
      <PushCard />
      <SyncCard />
    </div>
  );
}

function PushCard() {
  const state = useWebPush();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);   // { tone, text }
  const run = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg({ tone: "win", text: ok }); }
    catch (e) {
      setMsg({ tone: "loss", text: e.code === "WEBPUSH_NOT_CONFIGURED" ? "Los avisos del navegador todavía no están activados en el servidor de Kairo." : e.message });
    } finally { setBusy(false); }
  };

  return (
    <section className="card fav-tool" aria-labelledby="push-title">
      <span className="fav-tool-icon"><Icon name="bell" size={18} /></span>
      <div className="fav-tool-body">
        <h2 id="push-title">Avisos en este navegador</h2>
        <p className="muted">Te avisamos cuando un favorito de LoL entra en partida y cómo le fue, aunque la pestaña esté cerrada.</p>
        {!webPushSupported() ? (
          <p className="faint">Este navegador no permite avisos. En iPhone, primero agrega Kairo a la pantalla de inicio.</p>
        ) : state ? (
          <div className="fav-tool-actions">
            <span className="win fav-tool-on"><Icon name="check" size={14} /> Activados</span>
            <button type="button" className="btn" disabled={busy} onClick={() => run(testWebPush, "Enviamos una notificación de prueba.")}>Probar</button>
            <button type="button" className="btn" disabled={busy} onClick={() => run(disableWebPush)}>Desactivar</button>
          </div>
        ) : (
          <div className="fav-tool-actions">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(enableWebPush, "Listo: te avisaremos cuando jueguen tus favoritos.")}>
              {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="bell" size={15} />} Activar avisos
            </button>
          </div>
        )}
        {msg && <p className={`fav-tool-msg ${msg.tone}`} role="status">{msg.text}</p>}
      </div>
    </section>
  );
}

function SyncCard() {
  const state = useSync();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const run = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg({ tone: "win", text: ok }); }
    catch (e) { setMsg({ tone: "loss", text: e.status === 404 ? "Ese código no existe. Revisa que esté bien escrito." : e.message }); }
    finally { setBusy(false); }
  };

  return (
    <section className="card fav-tool" aria-labelledby="sync-title">
      <span className="fav-tool-icon"><Icon name="refresh" size={18} /></span>
      <div className="fav-tool-body">
        <h2 id="sync-title">Sincronizar entre dispositivos</h2>
        <p className="muted">Usa el mismo código en tu celular y en tu computador para tener los mismos favoritos, sin crear cuenta.</p>
        {state?.code ? (
          <>
            <div className="sync-code num" aria-label="Tu código">{formatCode(state.code)}</div>
            <div className="fav-tool-actions">
              <button type="button" className="btn" onClick={() => run(() => navigator.clipboard.writeText(formatCode(state.code)), "Código copiado.")}><Icon name="link" size={15} /> Copiar código</button>
              <button type="button" className="btn" onClick={() => { unlinkSync(); setMsg(null); }}>Dejar de sincronizar</button>
            </div>
            {state.error && <p className="fav-tool-msg loss">{state.error}</p>}
            <p className="faint fav-tool-note">Quien tenga el código puede ver y cambiar tus favoritos: compártelo solo contigo.</p>
          </>
        ) : (
          <>
            <div className="fav-tool-actions">
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(createSync, "Código creado: escríbelo en tu otro dispositivo.")}>Crear código</button>
            </div>
            <form className="sync-join" onSubmit={e => { e.preventDefault(); run(() => linkSync(code), "Favoritos sincronizados."); }}>
              <label className="sr-only" htmlFor="sync-code">Código de otro dispositivo</label>
              <input id="sync-code" value={code} onChange={e => setCode(e.target.value)} placeholder="Tengo un código: ABCD-EFGH-JKMN" autoComplete="off" spellCheck="false" maxLength={16} />
              <button type="submit" className="btn" disabled={busy || code.replace(/[^a-z0-9]/gi, "").length !== 12}>Unir</button>
            </form>
          </>
        )}
        {msg && <p className={`fav-tool-msg ${msg.tone}`} role="status">{msg.text}</p>}
      </div>
    </section>
  );
}
