import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/Icon";
import { StateBox } from "../components/ui";
import { LadderTable } from "./Home";
import { errorMessage } from "../api/client";
import { getLeaderboard } from "../api/lol";
import { useAsync, useTitle } from "../lib/hooks";
import { REGIONS, regionBySlug, savedRegion } from "../lib/regions";

const PAGE = 25;
const TIERS = [
  { key: "challenger", label: "Challenger" },
  { key: "grandmaster", label: "Gran Maestro" },
  { key: "master", label: "Maestro" },
];
const QUEUES = [
  { key: "RANKED_SOLO_5x5", label: "Solo/Dúo" },
  { key: "RANKED_FLEX_SR", label: "Flexible" },
];

/** Clasificación completa: región, liga, cola y páginas de 25 (todo en la URL para poder compartirla) */
export default function Ladder() {
  const [params, setParams] = useSearchParams();
  const region = regionBySlug(params.get("region")) || savedRegion();
  const tier = TIERS.some(t => t.key === params.get("liga")) ? params.get("liga") : "challenger";
  const queue = QUEUES.some(q => q.key === params.get("cola")) ? params.get("cola") : "RANKED_SOLO_5x5";
  const page = Math.max(1, parseInt(params.get("pagina"), 10) || 1);
  const start = (page - 1) * PAGE;
  useTitle("Clasificación");

  const { data, error, loading, reload } = useAsync(
    () => getLeaderboard(region.id, PAGE, { tier, queue, start }),
    [region.id, tier, queue, start],
  );

  const set = patch => {
    const next = { region: region.slug, liga: tier, cola: queue, pagina: String(page), ...patch };
    if (!("pagina" in patch)) next.pagina = "1";
    if (next.liga === "challenger") delete next.liga;
    if (next.cola === "RANKED_SOLO_5x5") delete next.cola;
    if (next.pagina === "1") delete next.pagina;
    setParams(next, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Layout header={{ variant: "search", region: region.slug }}>
      <div className="ladder-hero">
        <div className="container">
          <p className="eyebrow">League of Legends · {region.name}</p>
          <h1 className="page-title">Clasificación</h1>
          <div className="ladder-filters">
            <div className="segmented" role="group" aria-label="Región">
              {REGIONS.map(r => <button key={r.slug} type="button" aria-pressed={r.slug === region.slug} onClick={() => set({ region: r.slug })}>{r.label}</button>)}
            </div>
            <div className="segmented" role="group" aria-label="Liga">
              {TIERS.map(t => <button key={t.key} type="button" aria-pressed={t.key === tier} onClick={() => set({ liga: t.key })}>{t.label}</button>)}
            </div>
            <div className="segmented" role="group" aria-label="Cola">
              {QUEUES.map(q => <button key={q.key} type="button" aria-pressed={q.key === queue} onClick={() => set({ cola: q.key })}>{q.label}</button>)}
            </div>
          </div>
        </div>
      </div>

      <div className="container ladder-page">
        <div className="card ladder-card">
          {loading && !data ? (
            <LadderTable rows={null} region={region.slug} />
          ) : error ? (
            <StateBox compact tone="error" title="No se pudo cargar la clasificación" action={<button className="btn" onClick={() => reload()}>Reintentar</button>}>
              {errorMessage(error)}
            </StateBox>
          ) : data === null ? (
            <StateBox compact icon="trophy" title="Disponible pronto">El servidor de Kairo todavía no ofrece esta clasificación.</StateBox>
          ) : !data.length ? (
            <StateBox compact icon="trophy" title={page > 1 ? "No hay más jugadores" : "Sin jugadores en esta liga"}>
              {page > 1 ? "Llegaste al final de la clasificación." : "Riot todavía no publica esta liga en la región (pasa al inicio de cada temporada)."}
            </StateBox>
          ) : (
            <LadderTable rows={data} region={region.slug} offset={start} tier={tier} />
          )}
        </div>
        <nav className="pager" aria-label="Páginas">
          <button type="button" className="btn" disabled={page <= 1 || loading} onClick={() => set({ pagina: String(page - 1) })}><Icon name="chevronLeft" size={15} /> Anterior</button>
          <span className="faint num">Puestos {start + 1} a {start + PAGE}</span>
          <button type="button" className="btn" disabled={loading || !data || data.length < PAGE} onClick={() => set({ pagina: String(page + 1) })}>Siguiente <Icon name="chevronRight" size={15} /></button>
        </nav>
      </div>
    </Layout>
  );
}
