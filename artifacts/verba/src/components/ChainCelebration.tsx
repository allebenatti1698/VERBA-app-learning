// src/components/ChainCelebration.tsx
// La celebrazione della catena: overlay a tutto schermo (portale su document.body),
// alla fine della PRIMA sessione del giorno. Sostituisce la fiamma.
//
// Coreografia (~2,5 s):
//  1. (solo se la catena si era spezzata) la vecchia catena scivola via a sinistra, nel passato
//  2. l'anello di oggi si scrive con una punta di luce
//  3. si aggancia all'anello di ieri: l'intreccio scatta, un battito, il bagliore si spegne
//  4. la catena scorre di un passo con una molla: oggi va al centro
//  5. un riflesso attraversa tutta la catena
//  6. il numero rotola dal vecchio al nuovo; poi la frase, la settimana, Continue
//
// La scena è disegnata e animata a mano dentro un <svg> (requestAnimationFrame):
// React la monta una volta, poi non la tocca più.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { linkPath, overRight, overLeft, type LinkGeom } from "@/components/ChainLinks";
import { getChain, previousRun } from "@/lib/chain";
import { getWeekStrip } from "@/lib/studyActivity";

interface Props {
  onDismiss: () => void;
}

const BG = "#0A0A0A";
const NS = "http://www.w3.org/2000/svg";
const G = { w: 74, r: 20, pitch: 52 };   // l'anello grande della scena
const HS = 3.2;                           // il tratto
const CY = 100, CENTER = 200;
const MAX_PAST = 5;                       // quanti anelli del passato si vedono (gli altri sono oltre la sfumatura)

const CSS = `
.vcc-overlay { position: fixed; inset: 0; z-index: 120; background: ${BG}; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; padding: 24px 0 calc(28px + env(safe-area-inset-bottom)); box-sizing: border-box; }
.vcc-wash { position: absolute; left: 50%; top: 40%; width: 560px; height: 360px; margin: -180px 0 0 -280px; pointer-events: none; background: radial-gradient(ellipse at center, rgba(245,158,11,0.11), transparent 62%); opacity: .35; }
.vcc-hero { position: relative; width: 100%; max-width: 400px; aspect-ratio: 2 / 1; overflow: visible; display: block; }
.vcc-roll { position: relative; height: 96px; overflow: hidden; width: 240px; text-align: center; margin-top: 4px; }
.vcc-roll span { position: absolute; left: 0; right: 0; top: 0; font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 88px; line-height: 96px; letter-spacing: -3px; background: linear-gradient(180deg, #fff 30%, #FCD34D); -webkit-background-clip: text; background-clip: text; color: transparent; }
.vcc-roll span.vcc-grey { background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.25)); -webkit-background-clip: text; background-clip: text; }
.vcc-lbl { font-family: 'Inter', sans-serif; font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: #F59E0B; font-weight: 600; margin: 6px 0 0; }
.vcc-line { font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.55; color: rgba(255,255,255,0.58); text-align: center; margin: 14px 28px 0; }
.vcc-line b { color: #fff; font-weight: 500; }
.vcc-week { margin-top: 34px; }
.vcc-cta { margin-top: 40px; width: 200px; padding: 12px 32px; border-radius: 9999px; border: none; color: #fff; background: linear-gradient(to right, #F59E0B, #EA580C); font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 500; letter-spacing: 0.04em; box-shadow: 0 0 14px rgba(245,158,11,0.3); cursor: pointer; outline: none; }
.vcc-cta:active { transform: scale(0.94); }
.vcc-fade { opacity: 0; transform: translateY(8px); }
`;

function el(tag: string, attrs: Record<string, string | number>, parent?: Element): SVGElement {
  const e = document.createElementNS(NS, tag) as SVGElement;
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}
function glowFilter(defs: Element, id: string, sd: number) {
  const f = el("filter", { id, x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
  el("feGaussianBlur", { stdDeviation: sd, result: "b" }, f);
  const m = el("feMerge", {}, f);
  el("feMergeNode", { in: "b" }, m);
  el("feMergeNode", { in: "SourceGraphic" }, m);
}
/** Una fila di anelli con gli intrecci fra i vicini veri. Restituisce le x dei centri. */
function drawRow(parent: Element, x0: number, cy: number, g: LinkGeom & { pitch: number }, states: ("done" | "ghost")[], color: (i: number) => string, stroke: number, cut: string): { cx: number; p: SVGElement }[] {
  const layer = el("g", {}, parent);
  const weave = el("g", {}, parent);
  const out = states.map((s, i) => {
    const cx = x0 + i * g.pitch;
    const ghost = s === "ghost";
    const p = el("path", {
      d: linkPath(cx, cy, g), fill: "none",
      stroke: ghost ? "rgba(255,255,255,0.16)" : color(i),
      "stroke-width": ghost ? stroke * 0.75 : stroke, "stroke-linecap": "round",
      "stroke-dasharray": ghost ? `${stroke * 1.1} ${stroke * 2.4}` : "none",
    }, layer);
    return { cx, p };
  });
  states.forEach((s, i) => {
    if (s !== "done" || states[i + 1] !== "done") return;
    const cx = x0 + i * g.pitch, nx = cx + g.pitch;
    for (const [d, c] of [[overRight(cx, cy, g), color(i)], [overLeft(nx, cy, g), color(i + 1)]] as [string, string][]) {
      el("path", { d, fill: "none", stroke: cut, "stroke-width": stroke + 3.2, "stroke-linecap": "butt" }, weave);
      el("path", { d, fill: "none", stroke: c, "stroke-width": stroke, "stroke-linecap": "round" }, weave);
    }
  });
  return out;
}

const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const spring = (u: number) => (u <= 0 ? 0 : 1 - Math.exp(-7 * u) * Math.cos(10.5 * u)); // un passo deciso, un minimo di rimbalzo
const amberAt = (i: number, n: number) => `rgba(245,158,11,${(0.28 + 0.72 * (n <= 1 ? 1 : i / (n - 1))).toFixed(3)})`; // i vecchi sfumano a sinistra

export default function ChainCelebration({ onDismiss }: Props) {
  const heroRef = useRef<SVGSVGElement | null>(null);
  const weekRef = useRef<SVGSVGElement | null>(null);
  const washRef = useRef<HTMLDivElement | null>(null);
  const oldRef = useRef<HTMLSpanElement | null>(null);
  const newRef = useRef<HTMLSpanElement | null>(null);
  const lblRef = useRef<HTMLParagraphElement | null>(null);
  const lineRef = useRef<HTMLParagraphElement | null>(null);
  const weekWrapRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLButtonElement | null>(null);

  // ── i numeri e le parole, letti una volta ──
  const chain = getChain();
  const days = Math.max(1, chain.current);
  const prev = previousRun(chain);            // > 0: la catena si era spezzata, se ne inizia una nuova
  const broken = prev > 0;
  const first = days === 1 && !broken;        // il primissimo anello
  const past = broken ? prev : days - 1;      // gli anelli che c'erano già
  const from = broken ? prev : days - 1;      // il numero da cui rotola
  let line: string;
  if (first) line = "<b>The first link.</b><br>Come back tomorrow for the second.";
  else if (broken) line = `<b>A new chain begins.</b><br>Your longest held ${chain.longest} ${chain.longest === 1 ? "day" : "days"}.`;
  else if (days === chain.longest && days >= 3) line = "<b>Your longest chain yet.</b><br>Don't break the chain.";
  else if (days === 7) line = "<b>A week, unbroken.</b><br>Don't break the chain.";
  else if (days % 7 === 0) line = `<b>${days / 7} weeks, unbroken.</b><br>Don't break the chain.`;
  else line = "<b>Another link holds.</b><br>Don't break the chain.";

  useEffect(() => {
    const hero = heroRef.current, weekSvg = weekRef.current;
    if (!hero || !weekSvg) return;

    // ═══ la scena ═══
    hero.innerHTML = "";
    const defs = el("defs", {}, hero);
    glowFilter(defs, "vcc-glow", 5);
    const lg = el("linearGradient", { id: "vcc-today", x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
    el("stop", { offset: 0, "stop-color": "#FDE68A" }, lg);
    el("stop", { offset: 1, "stop-color": "#F59E0B" }, lg);
    const glintGrad = el("linearGradient", { id: "vcc-glint", gradientUnits: "userSpaceOnUse", x1: -80, y1: 0, x2: 0, y2: 0 }, defs);
    el("stop", { offset: 0, "stop-color": "#fff", "stop-opacity": 0 }, glintGrad);
    el("stop", { offset: 0.5, "stop-color": "#FFF7E0", "stop-opacity": 1 }, glintGrad);
    el("stop", { offset: 1, "stop-color": "#fff", "stop-opacity": 0 }, glintGrad);
    // la catena viene da sinistra, dal passato: una sfumatura ferma sopra la catena che scorre
    const mk = el("linearGradient", { id: "vcc-mk", x1: 0, x2: 1 }, defs);
    el("stop", { offset: 0, "stop-color": "#fff", "stop-opacity": 0 }, mk);
    el("stop", { offset: 0.38, "stop-color": "#fff", "stop-opacity": 1 }, mk);
    el("stop", { offset: 1, "stop-color": "#fff", "stop-opacity": 1 }, mk);
    const mask = el("mask", { id: "vcc-fadeL", maskUnits: "userSpaceOnUse", x: -400, y: 0, width: 1200, height: 200 }, defs);
    el("rect", { x: -400, y: 0, width: 1200, height: 200, fill: "url(#vcc-mk)" }, mask);
    const masked = el("g", { mask: "url(#vcc-fadeL)" }, hero);

    const slide = el("g", {}, masked);
    const old = el("g", {}, slide) as SVGGElement;
    const shown = Math.min(past, MAX_PAST);
    // l'ultimo anello del passato sta al centro; il posto di oggi è a destra
    const x0 = CENTER - (shown - 1) * G.pitch;
    if (shown > 0) drawRow(old, x0, CY, G, Array.from({ length: shown }, () => "done"), (i) => amberAt(i, shown), HS, BG);
    const tx = shown > 0 && !broken ? CENTER + G.pitch : CENTER;
    const ghost = el("path", { d: linkPath(tx, CY, G), fill: "none", stroke: "rgba(255,255,255,0.18)", "stroke-width": HS * 0.75, "stroke-dasharray": `${HS * 1.1} ${HS * 2.6}`, "stroke-linecap": "round" }, slide);
    const today = el("path", { d: linkPath(tx, CY, G), fill: "none", stroke: "url(#vcc-today)", "stroke-width": HS, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1, filter: "url(#vcc-glow)" }, slide) as SVGPathElement;
    const len = today.getTotalLength ? today.getTotalLength() : 400;
    // l'intreccio con l'anello di ieri
    const weave = el("g", { opacity: 0 }, slide);
    if (shown > 0 && !broken) {
      for (const [d, c] of [[overRight(CENTER, CY, G), amberAt(shown - 1, shown)], [overLeft(tx, CY, G), "#FCD34D"]] as [string, string][]) {
        el("path", { d, fill: "none", stroke: BG, "stroke-width": HS + 3.4, "stroke-linecap": "butt" }, weave);
        el("path", { d, fill: "none", stroke: c, "stroke-width": HS, "stroke-linecap": "round" }, weave);
      }
    }
    // la punta di luce che scrive
    const pen = el("circle", { r: 4.2, fill: "#FFF7E0", filter: "url(#vcc-glow)", opacity: 0 }, slide);
    // il riflesso che attraversa la catena
    const glint = el("g", { opacity: 0 }, slide);
    const allX: number[] = [];
    if (!broken) for (let i = 0; i < shown; i++) allX.push(x0 + i * G.pitch);
    allX.push(tx);
    allX.forEach((cx) => el("path", { d: linkPath(cx, CY, G), fill: "none", stroke: "url(#vcc-glint)", "stroke-width": HS, "stroke-linecap": "round" }, glint));

    // ═══ la settimana: sette anelli, lunedì → domenica ═══
    weekSvg.innerHTML = "";
    const wdefs = el("defs", {}, weekSvg);
    glowFilter(wdefs, "vcc-glow-w", 2.5);
    const week = getWeekStrip();
    const wg = { w: 34, r: 9, pitch: 26 };
    const wx0 = 160 - 3 * wg.pitch;
    const wNodes = drawRow(weekSvg, wx0, 18, wg, week.map((d) => (d.studied ? "done" : "ghost")),
      (i) => (week[i].isToday ? "#FCD34D" : "rgba(245,158,11,0.62)"), 2, BG);
    let weekToday: SVGElement | null = null;
    wNodes.forEach((n, i) => {
      if (week[i].isToday && week[i].studied) { n.p.setAttribute("filter", "url(#vcc-glow-w)"); weekToday = n.p; }
      const t = el("text", { x: n.cx, y: 50, "text-anchor": "middle", "font-size": 9.5, "font-family": "Inter, sans-serif", fill: week[i].isToday ? "#F59E0B" : "rgba(255,255,255,0.38)" }, weekSvg);
      t.textContent = week[i].weekday;
    });

    // ═══ i tempi (s) ═══
    const o = broken ? 0.55 : 0;
    const T = { drawA: 0.3 + o, drawB: 1.15 + o, lock: 1.15 + o, slideA: 1.22 + o, rollA: 1.35 + o, rollB: 1.95 + o,
      glintA: 1.75 + o, glintB: 2.75 + o, lbl: 1.75 + o, line: 1.95 + o, week: 2.15 + o, cta: 2.45 + o };

    const show = (node: HTMLElement | null, at: number, t: number) => {
      if (!node) return;
      const u = easeOut(seg(t, at, at + 0.5));
      node.style.opacity = String(u);
      node.style.transform = `translateY(${(1 - u) * 8}px)`;
    };

    function frame(t: number) {
      // 1 · la catena spezzata scivola via
      if (broken) {
        const u = easeIO(seg(t, 0.12, 0.8));
        old.setAttribute("transform", `translate(${-u * 70},0)`);
        old.style.opacity = (1 - u).toFixed(3);
        old.style.filter = `grayscale(${u})`;
      }
      // 2 · l'anello si scrive
      const d = easeIO(seg(t, T.drawA, T.drawB));
      today.setAttribute("stroke-dashoffset", (1 - d).toFixed(4));
      today.style.visibility = d > 0 ? "visible" : "hidden"; // a zero il tappo tondo lascerebbe un puntino
      ghost.style.opacity = (1 - seg(t, T.drawA, T.drawA + 0.5)).toFixed(3);
      if (d > 0 && d < 1 && today.getPointAtLength) {
        const pt = today.getPointAtLength(d * len);
        pen.setAttribute("cx", String(pt.x)); pen.setAttribute("cy", String(pt.y)); pen.setAttribute("opacity", "1");
      } else pen.setAttribute("opacity", "0");
      // 3 · si aggancia: l'intreccio scatta, un battito, il bagliore si spegne
      weave.setAttribute("opacity", seg(t, T.lock - 0.02, T.lock + 0.06).toFixed(3));
      const beat = t > T.lock ? Math.exp(-(t - T.lock) * 6) * Math.sin((t - T.lock) * 20) * 0.05 : 0;
      const sc = `translate(${tx},${CY}) scale(${1 + beat}) translate(${-tx},${-CY})`;
      today.setAttribute("transform", sc);
      weave.setAttribute("transform", sc);
      const glowK = t < T.lock ? 1 : Math.exp(-(t - T.lock) * 1.6);
      if (glowK > 0.05) today.setAttribute("filter", "url(#vcc-glow)"); else today.removeAttribute("filter");
      today.setAttribute("stroke-width", (HS + glowK * 0.6).toFixed(2));
      // 4 · la catena scorre di un passo: oggi va al centro
      const sh = (tx - CENTER) * spring(t - T.slideA);
      slide.setAttribute("transform", `translate(${(-sh).toFixed(2)},0)`);
      // 5 · il riflesso attraversa la catena, da sinistra fino a oggi
      const gu = seg(t, T.glintA, T.glintB);
      glint.setAttribute("opacity", gu > 0 && gu < 1 ? "1" : "0");
      const gx = allX[0] - 80 + easeIO(gu) * (tx + 120 - (allX[0] - 80));
      glintGrad.setAttribute("x1", String(gx - 70)); glintGrad.setAttribute("x2", String(gx + 70));
      // 6 · il numero rotola
      const r = easeIO(seg(t, T.rollA, T.rollB));
      if (oldRef.current) { oldRef.current.style.transform = `translateY(${-r * 96}px)`; oldRef.current.style.opacity = (1 - r).toFixed(3); }
      if (newRef.current) { newRef.current.style.transform = `translateY(${(1 - r) * 96}px)`; newRef.current.style.opacity = (0.2 + 0.8 * r).toFixed(3); }
      // 7 · il testo
      show(lblRef.current, T.lbl, t); show(lineRef.current, T.line, t);
      show(weekWrapRef.current, T.week, t); show(ctaRef.current, T.cta, t);
      if (washRef.current) washRef.current.style.opacity = (0.35 + 0.65 * seg(t, T.lock - 0.2, T.lock + 0.6)).toFixed(3);
      // l'anello di oggi nella settimana respira piano
      if (weekToday) {
        const w = t > T.cta ? 0.55 + 0.45 * Math.sin((t - T.cta) * 3) : 0;
        (weekToday as SVGElement).style.opacity = t > T.week ? String(0.6 + 0.4 * w) : "1";
      }
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { frame(9); return; }   // tutto già al suo posto, senza movimento
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => { frame((now - start) / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="vcc-overlay" role="dialog" aria-label={`Chain: ${days} ${days === 1 ? "day" : "days"} unbroken`}>
      <style>{CSS}</style>
      <div className="vcc-wash" ref={washRef} />
      <svg className="vcc-hero" ref={heroRef} viewBox="0 0 400 200" />
      <div className="vcc-roll">
        <span ref={oldRef} className={broken ? "vcc-grey" : undefined}>{from === 0 ? "" : from}</span>
        <span ref={newRef} style={{ opacity: 0.2, transform: "translateY(96px)" }}>{days}</span>
      </div>
      <p className="vcc-lbl vcc-fade" ref={lblRef}>{days === 1 ? "day unbroken" : "days unbroken"}</p>
      <p className="vcc-line vcc-fade" ref={lineRef} dangerouslySetInnerHTML={{ __html: line }} />
      <div className="vcc-week vcc-fade" ref={weekWrapRef}>
        <svg ref={weekRef} width="320" height="54" viewBox="0 0 320 54" aria-hidden="true" />
      </div>
      <button className="vcc-cta vcc-fade" ref={ctaRef} onClick={onDismiss}>Continue</button>
    </div>,
    document.body,
  );
}
