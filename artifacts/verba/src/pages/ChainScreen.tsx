// src/pages/ChainScreen.tsx
// "Your chain": la catena intera, aperta dalla card Chain di Profile (la card si
// allarga fino a coprire lo schermo; col tasto indietro si richiude al suo posto).
//
// In alto il numero dei giorni di fila, sotto il calendario del mese: ogni
// giorno studiato è un anello, i giorni di fila sulla stessa riga si
// intrecciano. Oggi: anello acceso se hai già studiato, tratteggiato che
// respira se è ancora aperto. I giorni saltati sono tratteggiati grigi.
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { SCREEN_MAX } from "@/components/ScreenColumn";
import { CHAIN_CSS, ChainIcon, Weave, linkPath } from "@/components/ChainLinks";
import { getChain, dayState, inCurrentChain, type DayState } from "@/lib/chain";
import { closeToCard, peekOrigin } from "@/lib/cardMorph";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];
const CAL_BG = "#111013";   // lo sfondo del calendario: è anche il colore del "taglio" dell'intreccio

const CSS = `
${CHAIN_CSS}
.vcs-nav { width: 30px; height: 30px; border-radius: 50%; border: none; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; outline: none; }
.vcs-nav:disabled { opacity: 0.25; cursor: default; }
.vcs-back:active, .vcs-nav:not(:disabled):active { transform: scale(0.88); }
`;

const bigNum: CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, lineHeight: 1,
  backgroundImage: "linear-gradient(180deg, #fff 30%, #FCD34D)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
};

/** Il numero che sale: un componente a parte, così a ogni fotogramma si ridisegna
 *  solo lui e non tutta la schermata con il calendario. */
function CountUp({ to, delayMs, style }: { to: number; delayMs: number; style: CSSProperties }) {
  const v = useCountUp(to, delayMs);
  // data-morph-num-target: aprendo dalla card, qui atterra il numero che vola
  return <b data-morph-num-target style={style}>{v}</b>;
}

/** Il numero sale da 0 al valore, con una frenata morbida. Se la schermata nasce
 *  dalla card Chain il numero ci arriva volando, già al suo valore: niente conteggio. */
function useCountUp(to: number, delayMs: number): number {
  const [still] = useState(() => peekOrigin() === "chain" || (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches));
  const [v, setV] = useState(() => (still ? to : 0));
  useEffect(() => {
    if (still) { setV(to); return; }
    let raf = 0;
    const t0 = performance.now() + delayMs;
    const step = (now: number) => {
      const u = Math.max(0, Math.min(1, (now - t0) / 700));
      setV(Math.round(to * (1 - Math.pow(1 - u, 3))));
      if (u < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, delayMs]);
  return v;
}

function Calendar({ year, month, chain }: { year: number; month: number; chain: ReturnType<typeof getChain> }) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;                 // lunedì = 0
  const count = new Date(year, month + 1, 0).getDate();
  const rows = Math.ceil((lead + count) / 7);
  const VW = 336, CW = VW / 7, RH = 46, VH = rows * RH;
  const g = { w: CW + 7, r: 13 };
  const cells = Array.from({ length: count }, (_, k) => {
    const d = k + 1, idx = lead + k, r = Math.floor(idx / 7), c = idx % 7;
    const date = new Date(year, month, d);
    return { d, r, cx: CW * c + CW / 2, cy: RH * r + RH / 2, s: dayState(date, chain) as DayState, strong: inCurrentChain(date, chain) };
  });
  const on = (s: DayState) => s === "done" || s === "today";
  const color = (x: typeof cells[number]) => x.s === "today" ? "#FCD34D" : x.strong ? "rgba(245,158,11,0.9)" : "rgba(245,158,11,0.5)";
  // gli anelli si scrivono uno dopo l'altro, nell'ordine dei giorni studiati
  const order = new Map<number, number>();
  cells.filter((x) => on(x.s)).forEach((x, i) => order.set(x.d, i));
  const delay = (d: number) => `${(180 + (order.get(d) ?? 0) * 26) / 1000}s`;

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ display: "block", width: "100%", height: "auto" }} role="img"
      aria-label={`${MONTHS[month]} ${year}: ${cells.filter((x) => on(x.s)).length} days studied`}>
      {/* gli anelli */}
      <g>
        {cells.map((x) => {
          if (on(x.s)) {
            const drawStyle = { "--d": delay(x.d), "--dur": ".36s" } as CSSProperties;
            return (
              <g key={x.d}>
                {/* bagliore di oggi: un tratto largo e trasparente, niente filtri (Safari) */}
                {x.s === "today" ? (
                  <path d={linkPath(x.cx, x.cy, g)} fill="none" stroke="#FCD34D" strokeOpacity={0.22} strokeWidth={6.5} strokeLinecap="round"
                    pathLength={1} strokeDasharray="1 1" className="vch-draw" style={drawStyle} />
                ) : null}
                <path d={linkPath(x.cx, x.cy, g)} fill="none" stroke={color(x)} strokeWidth={2} strokeLinecap="round"
                  pathLength={1} strokeDasharray="1 1" className="vch-draw" style={drawStyle} />
              </g>
            );
          }
          if (x.s === "missed" || x.s === "todayWait") {
            return (
              <path key={x.d} d={linkPath(x.cx, x.cy, g)} fill="none"
                stroke={x.s === "todayWait" ? "rgba(245,158,11,0.75)" : "rgba(255,255,255,0.16)"}
                strokeWidth={1.3} strokeLinecap="round" strokeDasharray="1.6 3.4"
                className={x.s === "todayWait" ? "vch-wait" : undefined} />
            );
          }
          return null;
        })}
      </g>
      {/* l'intreccio fra due giorni di fila sulla stessa riga */}
      <g>
        {cells.map((a, i) => {
          const b = cells[i + 1];
          if (!b || b.r !== a.r || !on(a.s) || !on(b.s)) return null;
          return (
            <Weave key={`w${a.d}`} x1={a.cx} x2={b.cx} cy={a.cy} g={g} c1={color(a)} c2={color(b)} cut={CAL_BG} sw={2}
              className="vch-fade" style={{ "--d": `${(180 + (order.get(b.d) ?? 0) * 26 + 320) / 1000}s` } as CSSProperties} />
          );
        })}
      </g>
      {/* i numeri */}
      <g>
        {cells.map((x) => (
          <text key={x.d} x={x.cx} y={x.cy + 3.6} textAnchor="middle" fontSize={10.5} fontFamily="Inter, sans-serif"
            fontWeight={x.s === "today" || x.s === "todayWait" ? 600 : 500}
            fill={x.s === "today" ? "#fff" : on(x.s) ? "rgba(255,255,255,0.88)" : x.s === "future" ? "rgba(255,255,255,0.18)" : x.s === "todayWait" ? "#FCD34D" : "rgba(255,255,255,0.34)"}>
            {x.d}
          </text>
        ))}
      </g>
    </svg>
  );
}

export default function ChainScreen() {
  const [, navigate] = useLocation();
  const chain = useMemo(() => getChain(), []);
  const now = new Date();
  // si sfoglia dal mese del primo giorno di studio fino a questo mese
  const firstMonth = useMemo(() => {
    if (!chain.first) return { y: now.getFullYear(), m: now.getMonth() };
    const [y, m] = chain.first.split("-").map(Number);
    return { y, m: m - 1 };
  }, [chain.first]); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const atFirst = view.y < firstMonth.y || (view.y === firstMonth.y && view.m <= firstMonth.m);
  const atLast = view.y > now.getFullYear() || (view.y === now.getFullYear() && view.m >= now.getMonth());
  function shift(n: number) {
    setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  }


  // quanti giorni studiati nel mese che stai guardando
  const monthCount = useMemo(() => {
    const prefix = `${view.y}-${String(view.m + 1).padStart(2, "0")}-`;
    let n = 0;
    chain.days.forEach((d) => { if (d.startsWith(prefix)) n += 1; });
    return n;
  }, [chain.days, view]);

  const strong: CSSProperties = { color: "#fff", fontWeight: 500 };
  let line: ReactNode;
  if (chain.current === 0) {
    line = <>Every day you study adds a link.<br /><b style={strong}>One session</b> starts a new chain.</>;
  } else if (!chain.todayDone) {
    line = <>Today's link is still open.<br /><b style={strong}>One session</b> keeps your {chain.current}-day chain.</>;
  } else if (chain.current >= chain.longest) {
    line = <>Every day you study adds a link.<br /><b style={strong}>Your longest chain yet.</b></>;
  } else {
    const gap = chain.longest - chain.current + 1;
    line = <>Every day you study adds a link.<br /><b style={strong}>{gap} more {gap === 1 ? "day" : "days"}</b> to beat your longest.</>;
  }

  function goBack() {
    // la schermata si richiude dentro la card Chain, poi si torna a Profile
    closeToCard("chain", () => navigate("/profile"));
  }

  return (
    <div style={{ minHeight: "100%", width: "100%", background: "linear-gradient(180deg, #14100a 0, #0A0A0A 340px)", position: "relative", overflowX: "hidden" }}>
      <style>{CSS}</style>
      <div style={{ position: "absolute", left: "50%", top: 40, width: 460, height: 300, marginLeft: -230, pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(245,158,11,0.10), transparent 65%)" }} />
      <div style={{ position: "relative", zIndex: 10, maxWidth: SCREEN_MAX, margin: "0 auto", padding: "18px 20px calc(40px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}>

        <div style={{ display: "flex", alignItems: "center", minHeight: 40 }}>
          <button className="vcs-back" onClick={goBack} aria-label="Back"
            style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", outline: "none" }}>
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* il numero */}
        <div style={{ textAlign: "center", margin: "18px 0 6px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#F59E0B", fontWeight: 600 }}>
            <ChainIcon cut="#15110b" />Chain
          </span>
          <div><CountUp to={chain.current} delayMs={120} style={{ ...bigNum, fontSize: 96, letterSpacing: -4, marginTop: 10, display: "inline-block" }} /></div>
          <p style={{ margin: "2px 0 0", fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: "rgba(255,255,255,0.55)" }}>{chain.current === 1 ? "day unbroken" : "days unbroken"}</p>
        </div>
        <p data-late style={{ textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.62)", margin: "14px 10px 22px" }}>{line}</p>

        {/* il calendario */}
        <div style={{ borderRadius: 20, background: CAL_BG, border: "1px solid rgba(255,255,255,0.08)", padding: "14px 12px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px 10px" }}>
            <b style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: "#fff" }}>
              {MONTHS[view.m]} <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{view.y}</span>
            </b>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="vcs-nav" onClick={() => shift(-1)} disabled={atFirst} aria-label="Previous month">‹</button>
              <button className="vcs-nav" onClick={() => shift(1)} disabled={atLast} aria-label="Next month">›</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", fontFamily: "'Inter', sans-serif", fontSize: 9.5, color: "rgba(255,255,255,0.35)", textAlign: "center", letterSpacing: "0.06em", paddingBottom: 6 }}>
            {DOW.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          {/* key: cambiando mese il calendario si ridisegna, anello dopo anello */}
          <Calendar key={`${view.y}-${view.m}`} year={view.y} month={view.m} chain={chain} />
        </div>

        {/* tre numeri */}
        <div data-late style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
          {[
            { n: monthCount, l: "this month" },
            { n: chain.longest, l: "longest chain" },
            { n: chain.total, l: "days studied" },
          ].map((s) => (
            <div key={s.l} style={{ padding: "12px 12px 11px", borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <b style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 22, letterSpacing: -0.5, color: "#fff" }}>{s.n}</b>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, color: "rgba(255,255,255,0.45)" }}>{s.l}</span>
            </div>
          ))}
        </div>

        {/* legenda */}
        <div data-late style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 16, fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true"><rect x="2" y="2" width="22" height="10" rx="5" fill="none" stroke="#F59E0B" strokeWidth="1.6" /></svg>studied
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true"><rect x="2" y="2" width="22" height="10" rx="5" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.3" strokeDasharray="1.6 3" /></svg>missed
          </span>
        </div>
      </div>
    </div>
  );
}
