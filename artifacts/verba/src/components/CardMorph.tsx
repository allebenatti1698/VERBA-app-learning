// src/components/CardMorph.tsx
// "La card che diventa la pagina". Avvolge ogni pagina (App.tsx). Se la pagina
// nasce da una card (lib/cardMorph.ts), al primo disegno si apre DA quella card:
//
//  · il contenuto è "incollato" alla card: rimpicciolito alla sua larghezza e
//    agganciato al suo angolo, si allarga insieme ai bordi (niente tagli);
//  · la faccia della card (una copia) viaggia dentro la pagina e si scioglie nel
//    contenuto; chiudendo il contenuto si scioglie e la faccia riaffiora;
//  · il numero segnato con data-morph-num vola fino a data-morph-num-target;
//  · gli elementi data-late arrivano dopo e se ne vanno prima;
//  · una sola curva per tutto, morbida in arrivo (molla stile iOS).
//
// Tutto è mosso da UN solo orologio (requestAnimationFrame): bordo arrotondato,
// contenuto, faccia e numero cambiano nello STESSO fotogramma. Su iPhone Safari
// muove le trasformazioni su un filo e il ritaglio (clip-path) su un altro: con
// le Web Animations i due andavano fuori passo e il contenuto "usciva" dal bordo.
// Il ritaglio sta sullo stesso elemento che si rimpicciolisce, nelle sue
// coordinate: bordo e contenuto sono un pezzo solo.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { takeOrigin, registerCloser, SHOW_TABS_EVENT, type CardKind } from "@/lib/cardMorph";

const OPEN_MS = 460;
const CLOSE_MS = 440;
const LEAD_MS = 120;                      // in chiusura: prima se ne vanno le parti secondarie
const PAGE_BG = "10,10,10";               // il fondo dell'app (#0A0A0A)

/** curva di Bézier cubica come in CSS: x = tempo, y = avanzamento */
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    if (t < 0 || t > 1) {                 // ripiego: bisezione
      let lo = 0, hi = 1; t = x;
      for (let i = 0; i < 24; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    }
    return sy(t);
  };
}
const SPRINGY = bezier(0.32, 0.72, 0, 1);    // la molla di iOS
const SOFT = bezier(0.4, 0, 0.2, 1);
const ARRIVE = bezier(0.2, 0.8, 0.2, 1);
const LEAVE = bezier(0.4, 0, 1, 1);

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, e: number) => a + (b - a) * e;
/** avanzamento di una fase [from, to] dentro il tempo t (0..1) */
const phase = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));

// la copia della card non deve ridisegnare le proprie animazioni d'ingresso
const FACE_CSS = `[data-morph-face] *{animation:none!important;transition:none!important}
[data-morph-face] .vch-draw,[data-morph-face] .vch-fade{opacity:1!important;stroke-dashoffset:0!important}`;

type Rect = { x: number; y: number; w: number; h: number };
const rectOf = (n: Element): Rect => { const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };

/** Un orologio: chiama frame(ms trascorsi) a ogni fotogramma per `total` ms. */
function clock(total: number, frame: (ms: number) => void, end: () => void): () => void {
  let raf = 0, t0 = -1, stopped = false;
  const tick = (now: number) => {
    if (stopped) return;
    if (t0 < 0) t0 = now;
    const ms = now - t0;
    frame(Math.min(ms, total));
    if (ms >= total) { stopped = true; end(); return; }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => { stopped = true; cancelAnimationFrame(raf); };
}

export default function CardMorph({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  // la card d'origine si prende UNA volta (in sviluppo React esegue gli effetti due volte)
  const originRef = useRef<{ kind: CardKind; el: HTMLElement } | null | undefined>(undefined);

  useLayoutEffect(() => {
    if (originRef.current === undefined) originRef.current = takeOrigin();
    const o = originRef.current;
    const outer = outerRef.current, inner = innerRef.current;
    if (!o || !outer || !inner) { registerCloser(null); return; }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: (() => void)[] = [];
    const W = window.innerWidth, H = window.innerHeight;
    const RADIUS = parseFloat(getComputedStyle(o.el).borderTopLeftRadius) || 20;   // gli angoli della card
    /** il contenuto della pagina (non il fondo): è lui a sciogliersi */
    const content = () => Array.from(inner.children) as HTMLElement[];

    /**
     * Il disegno al passo e (0 = pagina a tutto schermo, 1 = chiusa nella card c).
     * Il contenuto è rimpicciolito alla larghezza della card e agganciato al suo
     * angolo; il ritaglio arrotondato è nelle coordinate del contenuto stesso.
     */
    function place(c: Rect, r: DOMRect, e: number) {
      const s0 = c.w / W;
      const s = lerp(1, s0, e);
      const tx = lerp(0, c.x - r.left + s0 * r.left, e);
      const ty = lerp(0, c.y - r.top + s0 * r.top, e);
      inner!.style.transform = e === 0 ? "" : `translate(${tx}px, ${ty}px) scale(${s})`;
      // la finestra visibile, nelle coordinate del contenuto
      const left = -r.left, top = -r.top;
      const h = lerp(H, c.h / s0, e);
      const rad = lerp(0, RADIUS / s0, e);
      inner!.style.clipPath = e === 0 ? "" :
        `inset(${top}px ${r.width - left - W}px ${r.height - top - h}px ${left}px round ${rad}px)`;
    }

    /** la copia della card, posata sulla card */
    function makeFace(c: Rect): HTMLElement {
      const r = outer!.getBoundingClientRect();
      const f = o!.el.cloneNode(true) as HTMLElement;
      f.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      f.setAttribute("data-morph-face", "");
      f.setAttribute("aria-hidden", "true");
      f.querySelectorAll<HTMLElement>("[data-morph-num]").forEach((n) => { n.style.visibility = "hidden"; });
      Object.assign(f.style, {
        position: "absolute", left: `${c.x - r.left}px`, top: `${c.y - r.top}px`, width: `${c.w}px`, height: `${c.h}px`,
        margin: "0", transform: "none", transformOrigin: "0 0", zIndex: "50", pointerEvents: "none",
        visibility: "visible", opacity: "1", boxSizing: "border-box", willChange: "transform, opacity",
      });
      outer!.appendChild(f);
      return f;
    }
    /** la copia al passo e (0 = allargata a tutto schermo, 1 = sulla card) */
    function placeFace(f: HTMLElement, c: Rect, e: number) {
      const k = lerp(W / c.w, 1, e);
      f.style.transform = `translate(${lerp(-c.x, 0, e)}px, ${lerp(-c.y, 0, e)}px) scale(${k})`;
    }

    /** il numero che vola: una copia nel body, sopra a tutto */
    function makeFlyer(from: HTMLElement, a: Rect) {
      const f = from.cloneNode(true) as HTMLElement;
      const cs = getComputedStyle(from);
      Object.assign(f.style, { position: "fixed", left: `${a.x}px`, top: `${a.y}px`, margin: "0", zIndex: "9999", pointerEvents: "none",
        transformOrigin: "0 0", fontSize: cs.fontSize, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, visibility: "visible",
        willChange: "transform" });
      document.body.appendChild(f);
      return f;
    }
    const flyTo = (f: HTMLElement, a: Rect, b: Rect, e: number) => {
      f.style.transform = `translate(${(b.x - a.x) * e}px, ${(b.y - a.y) * e}px) scale(${lerp(1, b.h / a.h, e)})`;
    };

    /** gli elementi data-late visibili sullo schermo, nell'ordine in cui si leggono */
    function lateOnScreen(): HTMLElement[] {
      return Array.from(outer!.querySelectorAll<HTMLElement>("[data-late]")).filter((n) => {
        const b = n.getBoundingClientRect();
        return b.bottom > 0 && b.top < H;
      });
    }

    function reset() {
      inner!.style.transform = ""; inner!.style.clipPath = ""; inner!.style.willChange = "";
      inner!.style.transformOrigin = ""; inner!.style.backgroundColor = "";
      content().forEach((n) => { n.style.opacity = ""; });
      outer!.querySelectorAll<HTMLElement>("[data-late]").forEach((n) => { n.style.opacity = ""; n.style.transform = ""; });
    }

    // ── apertura ──
    const card = rectOf(o.el);
    const numFrom = o.el.querySelector<HTMLElement>("[data-morph-num]");
    const numTo = outer.querySelector<HTMLElement>("[data-morph-num-target]");
    const numA = numFrom ? rectOf(numFrom) : null;
    const numB = numTo ? rectOf(numTo) : null;   // misurato PRIMA di rimpicciolire il contenuto
    o.el.style.visibility = "hidden";             // la card vera sta sotto la pagina: non deve trasparire
    if (!reduce) {
      inner.style.transformOrigin = "0 0";
      inner.style.willChange = "transform";
      const box = outer.getBoundingClientRect();   // misurata una volta: durante il volo non cambia
      const face = makeFace(card);
      const late = lateOnScreen();
      const lateAll = outer.querySelectorAll<HTMLElement>("[data-late]");
      // le parti secondarie: entrano presto, vicine fra loro, con un passo breve
      const LATE_AT = OPEN_MS * 0.28, LATE_GAP = 28, LATE_MS = 300;
      const total = Math.max(OPEN_MS, LATE_AT + Math.max(0, late.length - 1) * LATE_GAP + LATE_MS);
      const flyer = numFrom && numTo && numA && numB ? makeFlyer(numFrom, numA) : null;
      if (flyer) { numFrom!.style.visibility = "hidden"; numTo!.style.visibility = "hidden"; }

      const frame = (ms: number) => {
        const t = Math.min(1, ms / OPEN_MS);
        const e = SPRINGY(t);
        place(card, box, 1 - e);
        // sotto il contenuto un fondo che diventa pieno: la scheda sotto non deve trasparire
        inner.style.backgroundColor = `rgba(${PAGE_BG},${phase(t, 0, 0.3)})`;
        const show = SOFT(phase(t, 0, 0.45));
        content().forEach((n) => { n.style.opacity = String(show); });
        placeFace(face, card, 1 - e);
        face.style.opacity = String(1 - show);
        if (flyer) flyTo(flyer, numA!, numB!, e);
        late.forEach((n, i) => {
          const p = ARRIVE(phase(ms, LATE_AT + i * LATE_GAP, LATE_AT + i * LATE_GAP + LATE_MS));
          n.style.opacity = String(p);
          n.style.transform = p === 1 ? "" : `translateY(${(1 - p) * 8}px)`;
        });
      };
      // le parti secondarie fuori dallo schermo non aspettano: ci sono già
      lateAll.forEach((n) => { if (!late.includes(n)) { n.style.opacity = ""; n.style.transform = ""; } });
      frame(0);                                   // il primo disegno è già quello giusto
      const finish = () => {
        face.remove();
        if (flyer) { flyer.remove(); numFrom!.style.visibility = ""; numTo!.style.visibility = ""; }
        reset();
      };
      const stop = clock(total, frame, finish);
      cleanups.push(() => { stop(); finish(); });
    }

    // ── chiusura: registrata per closeToCard() ──
    registerCloser((done) => {
      const el = o.el;
      if (reduce || !el.isConnected) { el.style.visibility = ""; done(); return; }
      window.dispatchEvent(new Event(SHOW_TABS_EVENT));   // le schede tornano visibili sotto la pagina
      const c = rectOf(el);
      const nTo = el.querySelector<HTMLElement>("[data-morph-num]");
      const nFrom = outer.querySelector<HTMLElement>("[data-morph-num-target]");
      inner.style.transformOrigin = "0 0";
      inner.style.willChange = "transform";
      inner.style.backgroundColor = `rgb(${PAGE_BG})`;
      const late = lateOnScreen().reverse();       // escono prima quelle in basso
      const box = outer.getBoundingClientRect();
      const face = makeFace(c);
      face.style.opacity = "0";
      const a = nFrom ? rectOf(nFrom) : null, b = nTo ? rectOf(nTo) : null;
      let flyer: HTMLElement | null = null;
      const total = LEAD_MS + CLOSE_MS;

      const frame = (ms: number) => {
        late.forEach((n, i) => {
          const p = LEAVE(phase(ms, i * 20, i * 20 + 160));
          n.style.opacity = String(1 - p);
          n.style.transform = `translateY(${p * 6}px)`;
        });
        const t = phase(ms, LEAD_MS, total);
        const e = SPRINGY(t);
        place(c, box, e);
        // prima si scioglie il contenuto, poi riaffiora la faccia della card
        const hide = SOFT(phase(t, 0, 0.4));
        content().forEach((n) => { n.style.opacity = String(1 - hide); });
        placeFace(face, c, e);
        face.style.opacity = String(SOFT(phase(t, 0.15, 0.6)));
        if (a && b && nFrom && nTo && ms >= LEAD_MS) {
          if (!flyer) { flyer = makeFlyer(nFrom, a); nFrom.style.visibility = "hidden"; nTo.style.visibility = "hidden"; }
          flyTo(flyer, a, b, e);
        }
      };
      frame(0);
      clock(total, frame, () => {
        if (flyer) flyer.remove();
        if (nTo) nTo.style.visibility = "";
        el.style.visibility = "";
        done();
      });
    });

    return () => { cleanups.forEach((f) => f()); registerCloser(null); };
  }, []);

  return (
    <div ref={outerRef} data-card-morph style={{ position: "relative", minHeight: "100%" }}>
      <style>{FACE_CSS}</style>
      <div ref={innerRef} style={{ minHeight: "100%" }}>{children}</div>
    </div>
  );
}
