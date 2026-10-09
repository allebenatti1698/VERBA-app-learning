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
// Tutto con Web Animations sul DOM: React disegna la pagina una volta e basta.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { takeOrigin, registerCloser, SHOW_TABS_EVENT, type CardKind } from "@/lib/cardMorph";

const SPRINGY = "cubic-bezier(.32,.72,0,1)";
const SOFT = "cubic-bezier(.4,0,.2,1)";
const OPEN_MS = 460;
const CLOSE_MS = 440;
const LEAD_MS = 120;                      // in chiusura: prima se ne vanno le parti secondarie

// la copia della card non deve ridisegnare le proprie animazioni d'ingresso
const FACE_CSS = `[data-morph-face] *{animation:none!important;transition:none!important}
[data-morph-face] .vch-draw,[data-morph-face] .vch-fade{opacity:1!important;stroke-dashoffset:0!important}`;

type Rect = { x: number; y: number; w: number; h: number };
const rectOf = (n: Element): Rect => { const r = n.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };

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

    // ── geometria ──
    const W = window.innerWidth, H = window.innerHeight;
    /** il ritaglio, nelle coordinate della pagina, che mostra il rettangolo c dello schermo */
    const clipFor = (c: Rect, rad: number) => {
      const r = outer.getBoundingClientRect();
      const top = c.y - r.top, left = c.x - r.left;
      return `inset(${top}px ${Math.max(0, r.width - left - c.w)}px ${Math.max(0, r.height - top - c.h)}px ${left}px round ${rad}px)`;
    };
    const fullScreen = (): Rect => ({ x: 0, y: 0, w: W, h: H });
    /** il contenuto incollato alla card: l'angolo dello schermo va sull'angolo della card */
    const glue = (c: Rect) => {
      const r = outer.getBoundingClientRect(), s = c.w / W;
      return `translate(${c.x - r.left + s * r.left}px, ${c.y - r.top + s * r.top}px) scale(${s})`;
    };
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
        visibility: "visible", opacity: "1", boxSizing: "border-box",
      });
      outer!.appendChild(f);
      return f;
    }
    /** la copia, allargata a tutto schermo */
    const faceAtFull = (c: Rect) => {
      const r = outer.getBoundingClientRect(), k = W / c.w;
      return `translate(${-r.left - (c.x - r.left)}px, ${-r.top - (c.y - r.top)}px) scale(${k})`;
    };
    /** il numero che vola: una copia nel body, sopra a tutto */
    function fly(from: HTMLElement, to: HTMLElement, a: Rect, b: Rect, ms: number, delay: number) {
      const f = from.cloneNode(true) as HTMLElement;
      const cs = getComputedStyle(from);
      Object.assign(f.style, { position: "fixed", left: `${a.x}px`, top: `${a.y}px`, margin: "0", zIndex: "9999", pointerEvents: "none",
        transformOrigin: "0 0", fontSize: cs.fontSize, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, visibility: "visible" });
      document.body.appendChild(f);
      from.style.visibility = "hidden"; to.style.visibility = "hidden";
      const anim = f.animate([{ transform: "none" }, { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(${b.h / a.h})` }],
        { duration: ms, delay, easing: SPRINGY, fill: "both" });
      const end = () => { f.remove(); from.style.visibility = ""; to.style.visibility = ""; };
      anim.onfinish = end;
      cleanups.push(() => { anim.cancel(); end(); });
    }

    // ── apertura ──
    const RADIUS = parseFloat(getComputedStyle(o.el).borderTopLeftRadius) || 20;   // gli angoli della card
    const card = rectOf(o.el);
    const numFrom = o.el.querySelector<HTMLElement>("[data-morph-num]");
    const numTo = outer.querySelector<HTMLElement>("[data-morph-num-target]");
    const numA = numFrom ? rectOf(numFrom) : null;
    const numB = numTo ? rectOf(numTo) : null;   // misurato PRIMA di rimpicciolire il contenuto
    o.el.style.visibility = "hidden";             // la card vera sta sotto la pagina: non deve trasparire
    if (!reduce) {
      inner.style.transformOrigin = "0 0";
      const face = makeFace(card);
      const anims = [
        outer.animate([{ clipPath: clipFor(card, RADIUS) }, { clipPath: clipFor(fullScreen(), 0) }], { duration: OPEN_MS, easing: SPRINGY }),
        inner.animate([{ transform: glue(card), opacity: 0 }, { opacity: 1, offset: 0.45 }, { transform: "none", opacity: 1 }], { duration: OPEN_MS, easing: SPRINGY }),
        face.animate([{ transform: "none" }, { transform: faceAtFull(card) }], { duration: OPEN_MS, easing: SPRINGY }),
        face.animate([{ opacity: 1 }, { opacity: 0 }], { duration: OPEN_MS * 0.45, easing: SOFT, fill: "forwards" }),
        // un fondo pieno sotto il contenuto che sta comparendo: la scheda sotto non deve trasparire
        outer.animate([{ backgroundColor: "rgba(10,10,10,0)" }, { backgroundColor: "rgba(10,10,10,1)", offset: 0.3 }, { backgroundColor: "rgba(10,10,10,1)" }], { duration: OPEN_MS }),
      ];
      outer.querySelectorAll<HTMLElement>("[data-late]").forEach((n, i) => anims.push(
        n.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }],
          { duration: 360, delay: OPEN_MS * 0.45 + i * 45, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" })));
      if (numFrom && numTo && numA && numB) fly(numFrom, numTo, numA, numB, OPEN_MS, 0);
      const t = window.setTimeout(() => face.remove(), OPEN_MS);
      cleanups.push(() => { window.clearTimeout(t); anims.forEach((a) => a.cancel()); face.remove(); });
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
      outer.querySelectorAll<HTMLElement>("[data-late]").forEach((n, i, all) => n.animate(
        [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(10px)" }],
        { duration: 180, delay: (all.length - 1 - i) * 25, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }));
      // Chiudendo, il contenuto della pagina NON deve farsi tagliare dal bordo che
      // stringe: si scioglie per primo, e a stringersi resta una superficie del colore
      // della card (come una card vuota che rientra), con sopra la faccia della card
      // che riaffiora. All'arrivo superficie + faccia sono identiche alla card vera.
      const surface = document.createElement("div");
      const ecs = getComputedStyle(el);
      const rr = outer.getBoundingClientRect();
      Object.assign(surface.style, {
        position: "absolute", left: `${c.x - rr.left}px`, top: `${c.y - rr.top}px`, width: `${c.w}px`, height: `${c.h}px`,
        backgroundColor: ecs.backgroundColor === "rgba(0, 0, 0, 0)" ? "#111013" : ecs.backgroundColor,
        backgroundImage: ecs.backgroundImage, transformOrigin: "0 0", zIndex: "49", pointerEvents: "none", opacity: "0",
      });
      surface.setAttribute("aria-hidden", "true");
      outer.appendChild(surface);
      const face = makeFace(c);
      face.style.opacity = "0";
      const opt = { duration: CLOSE_MS, delay: LEAD_MS, easing: SPRINGY, fill: "forwards" as const };
      outer.animate([{ clipPath: clipFor(fullScreen(), 0) }, { clipPath: clipFor(c, RADIUS) }], opt);
      inner.animate([{ transform: "none" }, { transform: glue(c) }], opt);
      face.animate([{ transform: faceAtFull(c) }, { transform: "none" }], opt);
      surface.animate([{ transform: `translate(${-c.x}px, ${-c.y}px) scale(${W / c.w}, ${H / c.h})` }, { transform: "none" }], opt);
      // prima si scioglie il contenuto, mentre la superficie della card lo rimpiazza;
      // poi riaffiora la faccia della card
      inner.animate([{ opacity: 1, easing: SOFT }, { opacity: 0, offset: 0.4 }, { opacity: 0 }], { ...opt, easing: "linear" });
      surface.animate([{ opacity: 0, easing: SOFT }, { opacity: 1, offset: 0.4 }, { opacity: 1 }], { ...opt, easing: "linear" });
      face.animate([{ opacity: 0 }, { opacity: 0, offset: 0.15, easing: SOFT }, { opacity: 1, offset: 0.6 }, { opacity: 1 }], { ...opt, easing: "linear" });
      if (nFrom && nTo) fly(nFrom, nTo, rectOf(nFrom), rectOf(nTo), CLOSE_MS, LEAD_MS);
      window.setTimeout(() => { el.style.visibility = ""; done(); }, LEAD_MS + CLOSE_MS);
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
