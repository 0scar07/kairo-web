import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { DEFAULT_REGION, REGIONS, parseRiotId, profilePath, regionBySlug } from "../lib/regions";
import { readJSON, writeJSON } from "../lib/storage";

const REGION_PREF = "kairo:region";

export const savedRegion = () => regionBySlug(readJSON(REGION_PREF)) || DEFAULT_REGION;

/**
 * Buscador de jugadores: región + "Nombre#TAG".
 *   size="large" (portada) o "compact" (header del perfil)
 */
export default function SearchForm({ size = "large", initialRegion, autoFocus = false }) {
  const navigate = useNavigate();
  const [region, setRegion] = useState(() => initialRegion || savedRegion().slug);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    const id = parseRiotId(text);
    if (!id) {
      setError(text.trim() ? "Falta el #TAG. Escribe el Riot ID completo, por ejemplo Faker#KR1." : "Escribe un Riot ID, por ejemplo Faker#KR1.");
      return;
    }
    setError("");
    writeJSON(REGION_PREF, region);
    setText("");
    navigate(profilePath(region, id.gameName, id.tagLine));
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

  return (
    <form className={`search search-${size}`} onSubmit={submit} role="search" noValidate>
      <div className="search-box">
        {size === "compact" && <Icon name="search" size={16} className="search-lead" />}
        {size === "large" && regionSelect}
        <label className="search-input">
          <span className="sr-only">Riot ID</span>
          <input
            type="text"
            value={text}
            onChange={e => { setText(e.target.value); if (error) setError(""); }}
            placeholder={size === "large" ? "Nombre#TAG" : "Buscar otro jugador · Nombre#TAG"}
            autoComplete="off"
            spellCheck="false"
            autoFocus={autoFocus}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `search-error-${size}` : undefined}
          />
        </label>
        {size === "compact" && regionSelect}
        {size === "large" && (
          <button type="submit" className="btn btn-primary search-submit">
            <Icon name="search" size={16} /> Buscar
          </button>
        )}
      </div>
      {error && <p className="search-error" id={`search-error-${size}`} role="alert">{error}</p>}
    </form>
  );
}
