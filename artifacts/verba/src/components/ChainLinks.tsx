// src/components/ChainLinks.tsx
// La catena, disegnata con un tratto solo come le icone delle schede.
// Ogni anello è il contorno di uno stadio. Due anelli vicini si INTRECCIANO:
// un quarto di curva del primo passa sopra il secondo e uno del secondo sopra
// il primo. L'intreccio si ottiene ridisegnando quei due archi sopra il vicino,
// con sotto un "taglio" del colore dello sfondo.
import type { CSSProperties } from "react";
import type { DayState } from "@/lib/chain";

export interface LinkGeom { w: number; r: number }

/** Il contorno di un anello centrato in (cx, cy). */
export function linkPath(cx: number, cy: number, g: LinkGeom): string {
  const a = g.w / 2 - g.r;
  return `M${cx - a},${cy - g.r} H${cx + a} A${g.r},${g.r} 0 0 1 ${cx + a},${cy + g.r} H${cx - a} A${g.r},${g.r} 0 0 1 ${cx - a},${cy - g.r} Z`;
}
function arcPt(cx: number, cy: number, r: number, deg: number): [number, number] {
  return [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
}
/** Il quarto di curva in alto a destra: passa SOPRA l'anello successivo. */
export function overRight(cx: number, cy: number, g: LinkGeom): string {
  const a = g.w / 2 - g.r;
  const s = arcPt(cx + a, cy, g.r, -90), e = arcPt(cx + a, cy, g.r, -12);
  return `M${s[0]},${s[1]} A${g.r},${g.r} 0 0 1 ${e[0]},${e[1]}`;
}
/** Il quarto di curva in basso a sinistra: passa SOPRA l'anello precedente. */
export function overLeft(cx: number, cy: number, g: LinkGeom): string {
  const a = g.w / 2 - g.r;
  const s = arcPt(cx - a, cy, g.r, 90), e = arcPt(cx - a, cy, g.r, 168);
  return `M${s[0]},${s[1]} A${g.r},${g.r} 0 0 1 ${e[0]},${e[1]}`;
}

/** Animazioni condivise: l'anello che si scrive, l'intreccio che compare, l'anello aperto che respira. */
export const CHAIN_CSS = `
.vch-draw { opacity: 0; animation: vch-draw var(--dur, .38s) cubic-bezier(.4,0,.2,1) var(--d, 0s) forwards; }
@keyframes vch-draw { 0% { stroke-dashoffset: 1; opacity: 0; } 6% { opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 1; } }
.vch-fade { opacity: 0; animation: vch-fade .14s ease var(--d, 0s) forwards; }
@keyframes vch-fade { to { opacity: 1; } }
.vch-wait { animation: vch-wait 1.8s ease-in-out infinite; }
@keyframes vch-wait { 0%,100% { opacity: .3; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .vch-draw, .vch-fade { animation: none; opacity: 1; stroke-dashoffset: 0; }
  .vch-wait { animation: none; opacity: .8; }
}
`;

/** Un intreccio fra due anelli vicini. */
export function Weave({ x1, x2, cy, g, c1, c2, cut, sw, className, style }: {
  x1: number; x2: number; cy: number; g: LinkGeom; c1: string; c2: string; cut: string; sw: number;
  className?: string; style?: CSSProperties;
}) {
  const parts: [string, string][] = [[overRight(x1, cy, g), c1], [overLeft(x2, cy, g), c2]];
  return (
    <g className={className} style={style}>
      {parts.map(([d, c], i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={cut} strokeWidth={sw + 3} strokeLinecap="butt" />
          <path d={d} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

/** La piccola icona: due anelli intrecciati. `cut` = colore dello sfondo sotto l'icona. */
export function ChainIcon({ size = 22, color = "#F59E0B", cut = "#16120c" }: { size?: number; color?: string; cut?: string }) {
  const g = { w: 22, r: 7 };
  return (
    <svg width={size} height={size * 12 / 22} viewBox="0 0 44 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path d={linkPath(13, 12, g)} fill="none" stroke={color} strokeWidth={2.2} />
      <path d={linkPath(31, 12, g)} fill="none" stroke={color} strokeWidth={2.2} />
      <Weave x1={13} x2={31} cy={12} g={g} c1={color} c2={color} cut={cut} sw={2.2} />
    </svg>
  );
}

/**
 * La catena degli ultimi giorni, per la card in Profile. Occupa tutta la
 * larghezza con lo stesso margine ai due lati. Si scrive da sinistra, anello
 * dopo anello; l'anello di oggi ancora aperto è tratteggiato e respira.
 */
export function ChainStrip({ days, cut, animate = true }: {
  days: { state: DayState; recent: boolean }[];
  cut: string;                 // colore dello sfondo della card, per l'intreccio
  animate?: boolean;
}) {
  const N = days.length, VW = 320, VH = 40, M = 4;
  const g = { w: 30, r: 8 };
  const pitch = (VW - 2 * M - g.w) / Math.max(1, N - 1);
  const cy = VH / 2;
  const xs = days.map((_, i) => M + g.w / 2 + i * pitch);
  const on = (s: DayState) => s === "done" || s === "today";
  const col = (i: number) => days[i].state === "today" ? "#FCD34D" : days[i].recent ? "rgba(245,158,11,0.85)" : "rgba(245,158,11,0.38)";
  const delay = (i: number) => `${(60 + i * 40) / 1000}s`;
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ display: "block", width: "100%", height: "auto" }} aria-hidden="true">
      <defs>
        <filter id="vch-glow-strip" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {days.map((d, i) => {
        const s = d.state;
        if (on(s)) {
          return (
            <path key={i} d={linkPath(xs[i], cy, g)} fill="none" stroke={col(i)} strokeWidth={2} strokeLinecap="round"
              pathLength={1} strokeDasharray="1 1"
              filter={s === "today" ? "url(#vch-glow-strip)" : undefined}
              className={animate ? "vch-draw" : undefined}
              style={animate ? ({ "--d": delay(i) } as CSSProperties) : { strokeDashoffset: 0 }} />
          );
        }
        // anello vuoto: oggi ancora aperto (ambra, respira) oppure giorno saltato / prima di Verba
        const wait = s === "todayWait";
        return (
          <path key={i} d={linkPath(xs[i], cy, g)} fill="none"
            stroke={wait ? "rgba(245,158,11,0.7)" : s === "missed" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.09)"}
            strokeWidth={1.5} strokeLinecap="round" strokeDasharray="1.6 3.2"
            className={wait ? "vch-wait" : undefined} />
        );
      })}
      {days.map((d, i) => {
        const n = days[i + 1];
        if (!n || !on(d.state) || !on(n.state)) return null;
        return (
          <Weave key={`w${i}`} x1={xs[i]} x2={xs[i + 1]} cy={cy} g={g} c1={col(i)} c2={col(i + 1)} cut={cut} sw={2}
            className={animate ? "vch-fade" : undefined}
            style={animate ? ({ "--d": `${(60 + (i + 1) * 40 + 340) / 1000}s` } as CSSProperties) : undefined} />
        );
      })}
    </svg>
  );
}
