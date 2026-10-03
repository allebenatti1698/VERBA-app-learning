import { useEffect, useRef, useState } from "react";

// Le icone delle quattro schede, disegnate con lo stesso tratto.
// Quando una scheda diventa attiva la sua icona fa il suo gesto UNA volta:
//   Study    — le tre righe della pagina si scrivono
//   Practice — il punto fa il giro dell'orbita
//   Progress — i gradini si accendono salendo
//   Profile  — un alone si allarga e svanisce
// La stessa icona sta nella barra in basso e accanto al titolo della scheda:
// le due partono nello stesso istante, perché seguono lo stesso cambio di pagina.

export type TabKey = "study" | "practice" | "progress" | "profile";

/** Durata del gesto. Sotto i due secondi: un saluto, non un richiamo. */
const ICON_MS = 1600;

const CSS = `
.vti-play .vti-ln { stroke-dasharray: 8; stroke-dashoffset: 8; animation: vtiLn ${ICON_MS * 0.45}ms cubic-bezier(.3,.7,.2,1) forwards; }
.vti-play .vti-ln:nth-of-type(2) { animation-delay: ${ICON_MS * 0.15}ms; }
.vti-play .vti-ln:nth-of-type(3) { animation-delay: ${ICON_MS * 0.3}ms; }
@keyframes vtiLn { to { stroke-dashoffset: 0; } }
.vti-play .vti-orb { transform-origin: 12px 12px; animation: vtiOrb ${ICON_MS}ms cubic-bezier(.45,.05,.25,1); }
@keyframes vtiOrb { to { transform: rotate(360deg); } }
.vti-play .vti-sp { opacity: .3; animation: vtiSp ${ICON_MS * 0.5}ms ease forwards; }
.vti-play .vti-sp:nth-of-type(2) { animation-delay: ${ICON_MS * 0.17}ms; }
.vti-play .vti-sp:nth-of-type(3) { animation-delay: ${ICON_MS * 0.34}ms; }
.vti-play .vti-sp:nth-of-type(4) { animation-delay: ${ICON_MS * 0.5}ms; }
@keyframes vtiSp { 0% { opacity: .3; } 50% { opacity: 1; filter: drop-shadow(0 0 4px #F59E0B); } 100% { opacity: 1; } }
.vti-halo { opacity: 0; }
.vti-play .vti-halo { transform-origin: 12px 12px; animation: vtiHalo ${ICON_MS}ms cubic-bezier(.2,.8,.2,1); }
@keyframes vtiHalo { 0% { opacity: .8; transform: scale(.6); } 100% { opacity: 0; transform: scale(1.6); } }
@media (prefers-reduced-motion: reduce) {
  .vti-play * { animation: none !important; }
  .vti-play .vti-ln { stroke-dashoffset: 0; }
  .vti-play .vti-sp { opacity: 1; }
}
`;

// le regole delle animazioni entrano nella pagina una volta sola
if (typeof document !== "undefined" && !document.getElementById("verba-tab-icons")) {
  const el = document.createElement("style");
  el.id = "verba-tab-icons";
  el.textContent = CSS;
  document.head.appendChild(el);
}

function Paths({ tab }: { tab: TabKey }) {
  if (tab === "study") return (
    <>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path className="vti-ln" d="M8.5 9h7" />
      <path className="vti-ln" d="M8.5 12.5h7" />
      <path className="vti-ln" d="M8.5 16h4.5" />
    </>
  );
  if (tab === "practice") return (
    <>
      <circle cx="12" cy="12" r="7.5" opacity="0.55" />
      <g className="vti-orb"><circle cx="18.6" cy="8.5" r="2.4" fill="currentColor" stroke="none" /></g>
    </>
  );
  if (tab === "progress") return (
    <>
      <path className="vti-sp" d="M4 20h4.5" />
      <path className="vti-sp" d="M8.5 20v-5H13" />
      <path className="vti-sp" d="M13 15v-5h4.5" />
      <path className="vti-sp" d="M17.5 10V5H20" />
    </>
  );
  return (
    <>
      <circle className="vti-halo" cx="12" cy="12" r="9.5" strokeWidth="1.2" />
      <circle cx="12" cy="9" r="3.6" />
      <path d="M5.5 19.5c1.4-3 3.8-4.4 6.5-4.4s5.1 1.4 6.5 4.4" />
    </>
  );
}

export default function TabIcon({ tab, active, size = 22 }: { tab: TabKey; active: boolean; size?: number }) {
  // ogni volta che la scheda diventa attiva, l'icona si ridisegna e il gesto riparte
  const [run, setRun] = useState(0);
  const wasActive = useRef(false);
  useEffect(() => {
    if (active && !wasActive.current) setRun((r) => r + 1);
    wasActive.current = active;
  }, [active]);

  return (
    <svg
      key={run}
      className={run > 0 ? "vti-play" : undefined}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={tab === "progress" ? 1.8 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ overflow: "visible", display: "block" }}
    >
      <Paths tab={tab} />
    </svg>
  );
}
