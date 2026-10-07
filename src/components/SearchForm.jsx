import { useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { DDImg } from "./ui";
import { REGIONS, multiPath, parseLobby, parseRiotId, profilePath, regionBySlug, saveRegion, savedRegion } from "../lib/regions";
import { suggestions, useFavorites, useRecents } from "../lib/library";
import { profileIcon } from "../lib/ddragon";

/**
 * Buscador de jugadores: región + "Nombre#TAG", con autocompletado de favoritos y búsquedas recientes.
 *   size="large" (portada) o "compact" (header del perfil)
 *   onPick({ gameName, tagLine, region }): en vez de abrir el perfil, entrega el jugador elegido (Comparar)
 * Accesible como combobox (patrón ARIA 1.2): flechas para moverse, Enter para abrir, Esc para cerrar.
 */
export default function SearchForm({ size = "large", initialRegion, autoFocus = false, onPick, placeholder }) {
  const navigate = useNavigate();
  const uid = useId();
  const listId = `${uid}-list`;
  const [region, setRegion] = useState(() => initialRegion || savedRegion().slug);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const formRef = useRef(null);

  const favorites = useFavorites();
  const recents = useRecents();
  const options = useMemo(() => suggestions(favorites, recents, text), [favorites, recents, text]);
  const expanded = open && options.length > 0;

  const close = () => { setOpen(false); setActive(-1); };

  function go(gameName, tagLine, regionSlug) {
    setError("");
    setText("");
    close();
    saveRegion(regionSlug);
    if (onPick) onPick({ gameName, tagLine, region: regionSlug });
    else navigate(profilePath(regionSlug, gameName, tagLine));
  }

  function submit(e) {
    e.preventDefault();
    if (expanded && active >= 0) {
      const o = options[active];
      go(o.gameName, o.tagLine, o.region);
      return;
    }
    // Varios Riot IDs pegados (el chat del lobby): multi-búsqueda
    const many = onPick ? [] : parseLobby(text);
    if (many.length >= 2) {
      setText(""); close(); saveRegion(region);
      navigate(multiPath(region, many));
      return;
    }
    const id = parseRiotId(text);
    if (!id) {
      setError(text.trim() ? "Falta el #TAG. Escribe el Riot ID completo, por ejemplo Faker#KR1." : "Escribe un Riot ID, por ejemplo Faker#KR1.");
      return;
    }
    go(id.gameName, id.tagLine, region);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!options.length) return;
      e.preventDefault();
      if (!open) { setOpen(true); setActive(e.key === "ArrowDown" ? 0 : options.length - 1); return; }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive(i => (i + step + options.length) % options.length);
    } else if (e.key === "Escape") {
      if (expanded) { e.preventDefault(); close(); }
      else if (text) { e.preventDefault(); setText(""); }
    } else if (e.key === "Home" && expanded && active >= 0) {
      e.preventDefault(); setActive(0);
    } else if (e.key === "End" && expanded && active >= 0) {
      e.preventDefault(); setActive(options.length - 1);
    }
  }

  // Se cierra al salir del buscador (pero no al pulsar una sugerencia, que está dentro del formulario)
  function onBlur(e) {
    if (!formRef.current?.contains(e.relatedTarget)) close();
  }

  const regionSelect = (
    <label className="search-region">
      <span className="sr-only">Región</span>
      <select value={region} onChange={e => setRegion(e.target.value)}>
        {REGIONS.map(r => <option key={r.slug} value={r.slug}>{r.label}</option>)}
      </select>
      {size === "large" && <Icon name="chevronDown" size={14} className="search-region-caret" />}
    </label>
  );

  const optionId = i => `${uid}-opt-${i}`;

  return (
    <form ref={formRef} className={`search search-${size}`} onSubmit={submit} onBlur={onBlur} role="search" noValidate>
      <div className="search-box">
        {size === "compact" && <Icon name="search" size={16} className="search-lead" />}
        {size === "large" && regionSelect}
        <label className="search-input">
          <span className="sr-only">Riot ID</span>
          <input
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            value={text}
            onChange={e => { setText(e.target.value); setOpen(true); setActive(-1); if (error) setError(""); }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder || (size === "large" ? "Nombre#TAG" : "Buscar Nombre#TAG")}
            autoComplete="off"
            spellCheck="false"
            autoFocus={autoFocus}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${uid}-error` : undefined}
          />
        </label>
        {size === "compact" && regionSelect}
        {size === "large" && (
          <button type="submit" className="btn btn-primary search-submit">
            <Icon name="search" size={16} /> Buscar
          </button>
        )}
      </div>

      <ul id={listId} role="listbox" aria-label="Sugerencias: favoritos y búsquedas recientes" className="suggest" hidden={!expanded}>
        {expanded && options.map((o, i) => {
          const r = regionBySlug(o.region);
          return (
            <li
              key={o.key}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              className={`suggest-item${i === active ? " active" : ""}`}
              onMouseDown={e => e.preventDefault()}   // no quitar el foco del input
              onMouseEnter={() => setActive(i)}
              onClick={() => go(o.gameName, o.tagLine, o.region)}
            >
              <DDImg src={o.iconId != null ? profileIcon(o.iconId) : null} size={28} alt="" />
              <span className="suggest-text">
                <span className="suggest-name">{o.gameName}<span className="faint">#{o.tagLine}</span></span>
                <span className="suggest-sub">{[r?.label, o.rank || "League of Legends"].filter(Boolean).join(" · ")}</span>
              </span>
              {o.favorite
                ? <Icon name="star" size={14} filled className="suggest-star" title="Favorito" />
                : <Icon name="history" size={14} className="faint" title="Búsqueda reciente" />}
            </li>
          );
        })}
      </ul>
      <span className="sr-only" role="status" aria-live="polite">
        {expanded ? `${options.length} ${options.length === 1 ? "sugerencia" : "sugerencias"}. Usa las flechas para elegir.` : ""}
      </span>

      {error && <p className="search-error" id={`${uid}-error`} role="alert">{error}</p>}
    </form>
  );
}
