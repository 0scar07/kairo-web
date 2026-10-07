import { useMemo, useRef, useState } from "react";
import { formatNumber, goldDiff } from "../../lib/lol";

// Gráfico de la diferencia de oro entre equipos minuto a minuto (azul arriba, rojo abajo) con los objetivos marcados.
// Datos de la línea de tiempo de la partida (backend: /lol/match/:id/timeline).

const W = 760, H = 236, PAD = { l: 44, r: 12, t: 14, b: 50 };
const OBJ = {
  dragon: { label: "Dragón", short: "D" },
  baron: { label: "Barón", short: "B" },
  herald: { label: "Heraldo", short: "H" },
  grubs: { label: "Larvas", short: "L" },
  atakhan: { label: "Atakhan", short: "A" },
  tower: { label: "Torre", short: "T" },
  inhibitor: { label: "Inhibidor", short: "I" },
};

export default function GoldChart({ timeline, match }) {
  const [hover, setHover] = useState(null);
  const box = useRef(null);
  const data = useMemo(() => {
    const team = new Map(match.participants.map(p => [p.puuid, p.teamId]));
    return goldDiff(timeline.frames, timeline.puuids.map(p => team.get(p)));
  }, [timeline, match]);
  if (data.length < 3) return null;

  const maxT = data[data.length - 1].t || 1;
  const maxAbs = Math.max(1000, ...data.map(d => Math.abs(d.diff)));
  const x = t => PAD.l + (t / maxT) * (W - PAD.l - PAD.r);
  const y = v => PAD.t + (1 - (v + maxAbs) / (2 * maxAbs)) * (H - PAD.t - PAD.b);
  const zero = y(0);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(d.t).toFixed(1)},${y(d.diff).toFixed(1)}`).join("");
  const area = `${line}L${x(maxT)},${zero}L${x(0)},${zero}Z`;
  const ticks = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs];
  const minutes = Array.from({ length: Math.floor(maxT / 5) + 1 }, (_, i) => i * 5);
  const events = (timeline.events || []).filter(e => OBJ[e.type] && (e.team === 100 || e.team === 200));
  // Marcadores en dos filas: si uno queda encima del anterior de su fila, pasa a la otra
  const lastX = [-Infinity, -Infinity];
  const lanes = events.map(e => {
    const ex = x(Math.min(maxT, e.t / 60_000));
    const lane = ex - lastX[0] >= 13 ? 0 : ex - lastX[1] >= 13 ? 1 : 0;
    lastX[lane] = ex;
    return { e, ex, lane };
  });
  const final = data[data.length - 1].diff;
  const peakBlue = Math.max(...data.map(d => d.diff));
  const peakRed = Math.min(...data.map(d => d.diff));

  function onMove(e) {
    const rect = box.current.getBoundingClientRect();
    const t = Math.round(((e.clientX - rect.left) / rect.width * W - PAD.l) / (W - PAD.l - PAD.r) * maxT);
    setHover(data.find(d => d.t === Math.max(0, Math.min(maxT, t))) || null);
  }

  return (
    <section className="card gold-chart" aria-labelledby="gold-title">
      <div className="gold-head">
        <h2 className="section-title" id="gold-title">Oro minuto a minuto</h2>
        <p className="faint gold-summary">
          Mayor ventaja azul <strong className="blue num">+{formatNumber(Math.max(0, peakBlue))}</strong> · roja <strong className="red num">+{formatNumber(Math.max(0, -peakRed))}</strong> · al final{" "}
          <strong className={`num ${final >= 0 ? "blue" : "red"}`}>{final >= 0 ? "azul" : "rojo"} +{formatNumber(Math.abs(final))}</strong>
        </p>
      </div>
      <div className="gold-svg-wrap" ref={box} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="gold-svg" role="img" aria-label={`Diferencia de oro entre equipos durante ${maxT} minutos`}>
          <defs>
            <clipPath id="gold-top"><rect x="0" y="0" width={W} height={zero} /></clipPath>
            <clipPath id="gold-bottom"><rect x="0" y={zero} width={W} height={H - zero} /></clipPath>
            <linearGradient id="gold-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--blue)" stopOpacity=".55" /><stop offset="1" stopColor="var(--blue)" stopOpacity=".05" /></linearGradient>
            <linearGradient id="gold-red" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="var(--red)" stopOpacity=".55" /><stop offset="1" stopColor="var(--red)" stopOpacity=".05" /></linearGradient>
          </defs>
          {ticks.map(v => (
            <g key={v} className="gold-grid">
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
              <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end">{v === 0 ? "0" : `${v > 0 ? "+" : "−"}${+(Math.abs(v) / 1000).toFixed(1)}k`}</text>
            </g>
          ))}
          {minutes.map(m => <text key={m} className="gold-min" x={x(m)} y={H - PAD.b + 14} textAnchor="middle">{m}</text>)}
          <path d={area} fill="url(#gold-blue)" clipPath="url(#gold-top)" className="gold-area" />
          <path d={area} fill="url(#gold-red)" clipPath="url(#gold-bottom)" className="gold-area" />
          <path d={line} className="gold-line" pathLength="1" />
          {lanes.map(({ e, ex, lane }, i) => {
            return (
              <g key={i} className={`gold-event ${e.team === 100 ? "blue" : "red"}`} transform={`translate(${ex},${H - 22 + lane * 14})`}>
                <title>{`${OBJ[e.type].label} · equipo ${e.team === 100 ? "azul" : "rojo"} · min ${Math.floor(e.t / 60_000)}`}</title>
                <circle r="6" />
                <text y="3" textAnchor="middle">{OBJ[e.type].short}</text>
              </g>
            );
          })}
          {hover && (
            <g className="gold-hover">
              <line x1={x(hover.t)} x2={x(hover.t)} y1={PAD.t} y2={H - PAD.b} />
              <circle cx={x(hover.t)} cy={y(hover.diff)} r="4" />
            </g>
          )}
        </svg>
        {hover && (
          <span className="gold-tip num" style={{ left: `${(x(hover.t) / W) * 100}%` }}>
            Min {hover.t} · {hover.diff === 0 ? "igualados" : `${hover.diff > 0 ? "azul" : "rojo"} +${formatNumber(Math.abs(hover.diff))}`}
          </span>
        )}
      </div>
      <ul className="gold-legend faint" aria-label="Objetivos">
        {Object.entries(OBJ).filter(([k]) => events.some(e => e.type === k)).map(([k, o]) => <li key={k}><span className="gold-key">{o.short}</span> {o.label}</li>)}
      </ul>
    </section>
  );
}
