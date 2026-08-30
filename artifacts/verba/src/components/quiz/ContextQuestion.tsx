import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SCREEN_MAX } from "@/components/ScreenColumn";
import { tapScale } from "@/components/SpringTap";
import type { QuestionProps } from "@/components/quiz/types";

// Gradino 2 — Recall in context: leggi la frase, scegli la parola che manca.
// Lo sfondo non decora: è la materia della risposta. Le lettere che vagano sono
// le stesse che comporranno la parola. Il buco non è una riga né un trattino:
// è un vortice di lettere che non si sono ancora formate.
// Il vetro rifrangente arriva in un secondo momento, sopra a questo.

const GAP_MIN = 52;          // larghezza fissa: un buco largo quanto la risposta la regala
const ORBIT_COUNT = 6;
const DENSITY_PX2 = 9000;    // una lettera ogni 9000 px² — proporzionale all'area, non fissa
const FREQ = "eeeeeetttttaaaaooooiiiinnnnsssrrrhhllddccuummffggppywwbvkxjqz";

const REVEAL_OK = 1500;
const REVEAL_KO = 2700;

type Role = "field" | "orbit" | "flying" | "landed";
type Letter = {
  ch: string; x: number; y: number; vx: number; vy: number;
  size: number; lav: boolean; base: number; a: number;
  role: Role; phase: number; spin: number; wob: number;
  tx: number; ty: number; sx: number; sy: number;
  t: number; dur: number; delay: number; landed: boolean;
  col: string | null;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ContextQuestion({
  word, isAnswered, selectedOption, onSelect, animKey,
}: QuestionProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gapRef = useRef<HTMLSpanElement | null>(null);
  const sizerRef = useRef<HTMLSpanElement | null>(null);
  const glyphsRef = useRef<HTMLSpanElement | null>(null);

  const lettersRef = useRef<Letter[]>([]);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const slowRef = useRef(1);          // il campo rallenta mentre leggi
  const gapCenterRef = useRef({ x: 0, y: 0 });

  const [reduced] = useState(
    () => typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const answer = word.word;
  const parts = useMemo(() => {
    const s = word.contextStem ?? "";
    const i = s.indexOf("____");
    if (i < 0) return { pre: s, post: "" };
    return { pre: s.slice(0, i), post: s.slice(i + 4) };
  }, [word.contextStem]);

  const options = useMemo(
    () => shuffleArray([answer, ...(word.contextDistractors ?? [])]),
    [word.id],
  );

  // ── campo di lettere ──────────────────────────────────────────────────────
  function buildField() {
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;
    const n = Math.max(8, Math.round((w * h) / DENSITY_PX2));
    const out: Letter[] = [];
    for (let i = 0; i < n; i++) {
      out.push({
        ch: FREQ[(Math.random() * FREQ.length) | 0],
        x: rnd(0, w), y: rnd(0, h), vx: rnd(-0.34, 0.34), vy: rnd(-0.24, 0.24),
        size: rnd(9, 17), lav: Math.random() < 0.3, base: rnd(0.06, 0.12), a: 0,
        role: "field", phase: Math.random() * 6.283, spin: rnd(0.5, 1.1),
        wob: rnd(20, 25), tx: 0, ty: 0, sx: 0, sy: 0, t: 0, dur: 0, delay: 0,
        landed: false, col: null,
      });
    }
    // le sei che orbitano il buco: il vortice È la parola non ancora formata
    for (let i = 0; i < ORBIT_COUNT; i++) {
      out.push({
        ch: FREQ[(Math.random() * FREQ.length) | 0],
        x: 0, y: 0, vx: 0, vy: 0, size: rnd(12, 16), lav: i % 2 === 0,
        base: 0.3, a: 0, role: "orbit", phase: (i / ORBIT_COUNT) * 6.283,
        spin: rnd(0.6, 0.9), wob: rnd(20, 25), tx: 0, ty: 0, sx: 0, sy: 0,
        t: 0, dur: 0, delay: 0, landed: false, col: null,
      });
    }
    lettersRef.current = out;
  }

  function measureGapCenter() {
    const host = hostRef.current, gap = gapRef.current;
    if (!host || !gap) return;
    const s = host.getBoundingClientRect(), r = gap.getBoundingClientRect();
    // centro al 28% dell'altezza, non al 50%: al 50% pendono sotto la linea di base
    gapCenterRef.current = {
      x: r.left - s.left + r.width / 2,
      y: r.top - s.top + r.height * 0.28,
    };
  }

  function draw(now: number) {
    const cv = canvasRef.current, host = hostRef.current;
    if (!cv || !host) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const t = now / 1000;
    const gc = gapCenterRef.current;
    const slow = slowRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const L of lettersRef.current) {
      if (L.role === "flying") {
        const p = Math.max(0, Math.min(1, (now - L.t - L.delay) / L.dur));
        const e = easeOut(p);
        L.x = L.sx + (L.tx - L.sx) * e;
        L.y = L.sy + (L.ty - L.sy) * e;
        L.a = 0.12 + 0.88 * e;
        if (p >= 1 && !L.landed) { L.landed = true; L.role = "landed"; L.a = 1; }
      } else if (L.role === "landed") {
        L.x = L.tx; L.y = L.ty; L.a = 1;
      } else if (L.role === "orbit") {
        const a = t * L.spin + L.phase;
        L.x = gc.x + Math.cos(a) * L.wob + Math.cos(a * 2.3) * 3;
        L.y = gc.y + Math.sin(a) * 6.5 + Math.sin(a * 1.7) * 1.8;
        L.a = L.base * (0.5 + 0.5 * Math.abs(Math.sin(a * 0.8)));
      } else {
        L.x += L.vx * slow; L.y += L.vy * slow;
        L.vx *= 0.975; L.vy *= 0.975;
        if (L.x < -16) L.x = w + 12; if (L.x > w + 16) L.x = -12;
        if (L.y < -16) L.y = h + 12; if (L.y > h + 16) L.y = -12;
        L.a = L.base;
      }
      ctx.font = `${L.role === "landed" || L.role === "flying" ? 500 : 400} ${L.size.toFixed(1)}px 'Space Grotesk', sans-serif`;
      const c = L.col || (L.lav ? "199,184,232" : "245,158,11");
      ctx.fillStyle = `rgba(${c},${Math.max(0, Math.min(1, L.a)).toFixed(3)})`;
      ctx.fillText(L.ch, L.x, L.y);
    }
  }

  // ── composizione della parola ─────────────────────────────────────────────
  function targetsFor(w: string) {
    const host = hostRef.current, gap = gapRef.current;
    const sizer = sizerRef.current, glyphs = glyphsRef.current;
    if (!host || !gap || !sizer || !glyphs) return [];
    sizer.textContent = w;
    glyphs.innerHTML = w.split("").map((c) => `<span>${c}</span>`).join("");
    const prev = gap.style.transition;
    gap.style.transition = "none";
    gap.style.width = "auto";
    void gap.offsetHeight;
    const full = Math.ceil(gap.getBoundingClientRect().width);
    const s = host.getBoundingClientRect();
    const out = [...glyphs.children].map((g, i) => {
      const r = (g as HTMLElement).getBoundingClientRect();
      return {
        ch: w[i],
        x: r.left - s.left + r.width / 2,
        y: r.top - s.top + r.height / 2,
        size: parseFloat(getComputedStyle(g as HTMLElement).fontSize),
      };
    });
    gap.style.width = GAP_MIN + "px";
    void gap.offsetHeight;
    gap.style.transition = prev || "";
    requestAnimationFrame(() => { if (gapRef.current) gapRef.current.style.width = full + "px"; });
    return out;
  }

  function recruit(tg: { ch: string; x: number; y: number }, used: Set<Letter>) {
    let best: Letter | null = null, bd = Infinity;
    for (const L of lettersRef.current) {
      if (used.has(L) || L.role === "flying" || L.role === "landed") continue;
      if (L.ch !== tg.ch) continue;
      const d = Math.hypot(L.x - tg.x, L.y - tg.y) * (L.role === "orbit" ? 0.35 : 1);
      if (d < bd) { bd = d; best = L; }
    }
    if (best) return best;
    const { w, h } = sizeRef.current;
    const L: Letter = {
      ch: tg.ch, x: tg.x < w / 2 ? -18 : w + 18, y: rnd(h * 0.2, h * 0.8),
      vx: 0, vy: 0, size: 13, lav: false, base: 0.09, a: 0, role: "field",
      phase: 0, spin: 1, wob: 22, tx: 0, ty: 0, sx: 0, sy: 0, t: 0, dur: 0,
      delay: 0, landed: false, col: null,
    };
    lettersRef.current.push(L);
    return L;
  }

  function compose(w: string, rgb: string) {
    const tgs = targetsFor(w), used = new Set<Letter>(), now = performance.now();
    tgs.forEach((tg, i) => {
      const L = recruit(tg, used); used.add(L);
      L.role = "flying"; L.landed = false; L.sx = L.x; L.sy = L.y;
      L.tx = tg.x; L.ty = tg.y; L.size = tg.size; L.col = rgb;
      L.t = now; L.delay = i * 22;
      // durata crescente con la distanza: così la parola SI SCRIVE, non appare
      L.dur = 280 + Math.min(170, Math.hypot(tg.x - L.x, tg.y - L.y) * 0.25);
    });
  }

  // sull'errore: convergono ai due terzi, non si agganciano, si disperdono.
  // Poi la parola GIUSTA si compone comunque: è il momento in cui impari.
  function scatter(w: string) {
    const tgs = targetsFor(w), used = new Set<Letter>(), now = performance.now();
    tgs.forEach((tg, i) => {
      const L = recruit(tg, used); used.add(L);
      L.role = "flying"; L.landed = false; L.sx = L.x; L.sy = L.y;
      L.tx = L.x + (tg.x - L.x) * 0.66;
      L.ty = L.y + (tg.y - L.y) * 0.66;
      L.col = "239,68,68"; L.t = now; L.delay = i * 16; L.dur = 240;
    });
    window.setTimeout(() => {
      for (const L of lettersRef.current) {
        if (L.role === "flying" || L.role === "landed") {
          L.role = "field"; L.landed = false;
          L.vx = rnd(-1.6, 1.6); L.vy = rnd(-1.2, 1.2); L.col = null;
        }
      }
    }, tgs.length * 16 + 300);
  }

  // ── ciclo di vita ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (reduced) return;
    const host = hostRef.current, cv = canvasRef.current;
    if (!host || !cv) return;

    const resize = () => {
      const r = host.getBoundingClientRect();
      sizeRef.current = { w: r.width, h: r.height };
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      buildField();
      measureGapCenter();
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      draw(now);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  // nuova parola: campo rifatto, buco richiuso, lettere rimesse a vagare
  useEffect(() => {
    slowRef.current = 0.55;
    if (gapRef.current) gapRef.current.style.width = GAP_MIN + "px";
    if (glyphsRef.current) glyphsRef.current.innerHTML = "";
    if (!reduced) { buildField(); measureGapCenter(); }
  }, [word.id, reduced]);

  function handlePick(option: string) {
    if (isAnswered) return;
    const correct = option === answer;
    slowRef.current = 1;                       // il campo va a velocità piena
    onSelect(option, correct, correct ? REVEAL_OK : REVEAL_KO);
    if (reduced) {
      if (gapRef.current) gapRef.current.style.width = "auto";
      if (sizerRef.current) sizerRef.current.style.visibility = "visible";
      if (sizerRef.current) sizerRef.current.textContent = answer;
      return;
    }
    measureGapCenter();
    if (correct) {
      compose(answer, "52,211,153");
    } else {
      scatter(option);
      window.setTimeout(() => compose(answer, "199,184,232"), 900);
    }
  }

  const optStyle = (o: string): React.CSSProperties => {
    if (!isAnswered) {
      return { background: "rgba(10,10,10,0.5)", border: "1px solid rgba(199,184,232,0.16)", color: "#C7B8E8" };
    }
    if (o === answer) {
      return { background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.7)", color: "#34D399" };
    }
    if (o === selectedOption) {
      return { background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.6)", color: "#FCA5A5" };
    }
    return { background: "rgba(10,10,10,0.5)", border: "1px solid rgba(199,184,232,0.16)", color: "#C7B8E8", opacity: 0.16 };
  };

  return (
    <div
      ref={hostRef}
      style={{ position: "relative", width: "100%", maxWidth: SCREEN_MAX, flex: 1, display: "flex", flexDirection: "column" }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={animKey}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ position: "relative", zIndex: 1, paddingTop: 28, paddingBottom: 22 }}
        >
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", textAlign: "center", margin: "0 0 18px" }}>
            Complete the sentence
          </p>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, fontSize: "clamp(17px, 4.6vw, 21px)", lineHeight: 1.62, color: "rgba(255,255,255,0.93)", textAlign: "center", margin: 0 }}>
            {parts.pre}
            <span
              ref={gapRef}
              style={{ position: "relative", display: "inline-block", verticalAlign: "baseline", width: GAP_MIN, transition: "width 0.34s cubic-bezier(.19,1,.22,1)" }}
            >
              <span ref={sizerRef} style={{ visibility: "hidden", whiteSpace: "nowrap", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }} />
              <span ref={glyphsRef} aria-hidden style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap", visibility: "hidden", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }} />
            </span>
            {parts.post}
          </p>
        </motion.div>
      </AnimatePresence>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 9, marginTop: "auto" }}>
        {options.map((o, i) => (
          <motion.button
            key={o}
            data-testid={`context-option-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: isAnswered && o !== answer && o !== selectedOption ? 0.16 : 1,
              y: 0,
              x: isAnswered && o === selectedOption && o !== answer ? [0, -7, 6, -4, 2, 0] : 0,
            }}
            transition={{
              delay: i * 0.06, duration: 0.25, ease: "easeOut",
              opacity: { duration: 0.3, delay: isAnswered ? 0 : i * 0.06 },
              x: { duration: 0.34, ease: [0.36, 0.07, 0.19, 0.97], delay: 0 },
            }}
            whileTap={isAnswered ? undefined : tapScale("card")}
            onClick={() => handlePick(o)}
            disabled={isAnswered}
            style={{
              ...optStyle(o),
              borderRadius: 12, padding: "13px 16px",
              cursor: isAnswered ? "default" : "pointer",
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500,
              fontSize: "1rem", textAlign: "center", outline: "none",
              transition: "border-color 0.2s, background 0.2s, color 0.2s",
            }}
          >
            {o}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
