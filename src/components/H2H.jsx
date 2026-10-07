/**
 * Tabla "cara a cara" de Comparar: cada fila con el valor de cada jugador, el mejor resaltado y una barra con la
 * proporción. rows = [{ label, a, b, show(value, side), lower? }] o { section: "Título" }; null = sin dato.
 */
export default function H2H({ rows, title = "Cara a cara" }) {
  return (
    <section className="card h2h" aria-label={title}>
      <ul className="h2h-list">
        {rows.map((r, i) => {
          if (r.section) return <li key={r.section} className="h2h-section eyebrow">{r.section}</li>;
          const has = r.a !== null && r.a !== undefined && r.b !== null && r.b !== undefined;
          const num = v => (Number.isFinite(v) ? v : v === Infinity ? 99 : 0);
          const fa = num(r.a), fb = num(r.b);
          const aWins = has && (r.lower ? fa < fb : fa > fb);
          const bWins = has && (r.lower ? fb < fa : fb > fa);
          const total = Math.abs(fa) + Math.abs(fb) || 1;
          const show = r.show || (v => v);
          return (
            <li key={r.label} className="h2h-row reveal" style={{ "--i": i }}>
              <span className={`h2h-val a num${aWins ? " best" : ""}`}>{r.a === null || r.a === undefined ? "—" : show(r.a, "a")}</span>
              <span className="h2h-mid">
                <span className="h2h-label">{r.label}</span>
                <span className="h2h-bar" aria-hidden="true">
                  <span className={`h2h-a${aWins ? " best" : ""}`} style={{ "--w": has ? fa / total : 0 }} />
                  <span className={`h2h-b${bWins ? " best" : ""}`} style={{ "--w": has ? fb / total : 0 }} />
                </span>
              </span>
              <span className={`h2h-val b num${bWins ? " best" : ""}`}>{r.b === null || r.b === undefined ? "—" : show(r.b, "b")}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
