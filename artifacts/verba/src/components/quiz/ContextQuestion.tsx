import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SCREEN_MAX } from "@/components/ScreenColumn";
import { tapScale } from "@/components/SpringTap";
import type { QuestionProps } from "@/components/quiz/types";
import { publishWordOrigin } from "@/lib/wordOrigin";

// Gradino 2 — Recall in context.
//
// La risposta non arriva da fuori: le lettere si STACCANO DALLA FRASE.
// `transgression` ha t, r, a, n, s, g, e, i, o — e quelle lettere sono già a
// schermo, dentro The, intern's, against, protocol. Ognuna si stacca dalla sua
// parola e migra nel buco; ciò che resta sbiadisce un istante e si richiude.
// Le lettere che nella frase non ci sono (le doppie, di solito) arrivano dal
// bottone giusto, che si svuota per intero.
//
// Il buco non ha vortice né trattino né parentesi: ha il RESPIRO. Le parole ai
// lati si scostano di due pixel e tornano, con due oscillazioni a frequenze
// incommensurabili così non si sente il ciclo. Non si aggiunge un segno: si
// muove ciò che c'è già.
//
// L'errore è uno scossone sul bottone premuto, e il rosso resta acceso per
// tutta la domanda: l'esito non si nasconde, smette solo di brillare.

/* ── numeri regolabili a occhio, senza agent ── */
const GAP_MIN = 52;        // larghezza fissa: un buco largo quanto la risposta la regala
const FLY_BASE = 430;      // durata minima del volo di una lettera
const FLY_DIST_K = 0.35;   // quanto la distanza allunga il volo
const FLY_STAGGER = 30;    // scarto fra una lettera e la successiva
const ARC_MIN = -34;       // curvatura del volo (negativo = passa dall'alto)
const ARC_MAX = -14;
const SHAKE_MS = 340;      // lo scossone sull'errore
const FAIL_GAP = 180;      // pausa fra lo scossone e la composizione
const REVEAL_PAD = 180;    // margine prima che salga la scheda
const BREATH_AMP = 1.9;    // ampiezza del respiro, px
const BREATH_REACH = 2;    // quante PAROLE per lato ne risentono
const RESTORE_MS = 900;    // quando la lettera sbiadita nella frase si riaccende

type Target = { ch: string; x: number; y: number; size: number };
type Fly = {
  ch: string; sx: number; sy: number; tgt: Target;
  size: number; t0: number; dur: number; arc: number; landed: boolean;
};
/** Un carattere del bottone che non serve alla parola: si stacca e si disperde. */
type Stray = {
  ch: string; x: number; y: number; vx: number; vy: number;
  size: number; rot: number; spin: number; a: number; t0: number;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const clamp01 = (p: number) => Math.max(0, Math.min(1, p));

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Quanto dura la composizione di una parola di n lettere. */
function composeMs(n: number) {
  return FLY_BASE + 170 + Math.max(0, n - 1) * FLY_STAGGER;
}

export default function ContextQuestion({
  word, isAnswered, selectedOption, onSelect, animKey,
}: QuestionProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stemRef = useRef<HTMLParagraphElement | null>(null);
  const gapRef = useRef<HTMLSpanElement | null>(null);
  const sizerRef = useRef<HTMLSpanElement | null>(null);
  const glyphsRef = useRef<HTMLSpanElement | null>(null);
  const optsRef = useRef<HTMLDivElement | null>(null);

  const flyRef = useRef<Fly[]>([]);
  const strayRef = useRef<Stray[]>([]);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const settledRef = useRef(false);
  const breathRef = useRef(0);
  const answeredRef = useRef(false);
  const frameRef = useRef(0);

  const [reduced] = useState(
    () => typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);

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

  /**
   * Il loop di disegno nasce una volta sola e cattura le variabili del primo
   * render: qualunque cosa legga dal corpo del componente resta ferma alla
   * prima parola della sessione. Questi ref sono la via d'uscita.
   */
  const answerRef = useRef(answer);
  const optionsRef = useRef(options);

  /* ── misure ──────────────────────────────────────────────────────────── */
  function targetsFor(w: string): Target[] {
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
        ch: w[i], x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2,
        size: parseFloat(getComputedStyle(g as HTMLElement).fontSize),
      };
    });
    gap.style.width = GAP_MIN + "px";
    void gap.offsetHeight;
    gap.style.transition = prev || "";
    requestAnimationFrame(() => {
      if (gapRef.current) gapRef.current.style.width = full + "px";
    });
    return out;
  }

  /** Le lettere scritte dentro un bottone. */
  function optGlyphs(idx: number) {
    const wrap = optsRef.current, host = hostRef.current;
    if (!wrap || !host) return [];
    const el = wrap.children[idx] as HTMLElement | undefined;
    if (!el) return [];
    const s = host.getBoundingClientRect();
    return [...el.querySelectorAll<HTMLElement>("span")].map((node) => {
      const r = node.getBoundingClientRect();
      return {
        node, ch: (node.textContent || "").toLowerCase(),
        x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2,
        size: parseFloat(getComputedStyle(node).fontSize), taken: false,
      };
    });
  }

  /* ── la composizione ─────────────────────────────────────────────────── */
  /**
   * La parola si TRASFERISCE dal bottone giusto: quello si svuota per intero
   * e le sue lettere volano nel buco. I caratteri in eccesso — le doppie che
   * la parola non usa — si staccano e si disperdono, così resta un guscio
   * vuoto e non una parola bucata.
   *
   * La frase non viene toccata: il testo che stai leggendo resta intero.
   */
  function compose() {
    const tgs = targetsFor(answerRef.current);
    const rightIdx = optionsRef.current.indexOf(answerRef.current);
    const pool = optGlyphs(rightIdx);
    const now = performance.now();
    const out: Fly[] = [];

    tgs.forEach((tg, i) => {
      const src = pool.find((o) => !o.taken && o.ch === tg.ch);
      let sx: number, sy: number, size: number;
      if (src) {
        src.taken = true;
        src.node.style.opacity = "0";
        sx = src.x; sy = src.y; size = src.size;
      } else {
        // non dovrebbe capitare — il bottone È la parola — ma se il testo
        // differisce per accenti o maiuscole, la lettera nasce dal bordo
        const { w, h } = sizeRef.current;
        sx = tg.x < w / 2 ? -22 : w + 22;
        sy = rnd(h * 0.3, h * 0.6);
        size = 14;
      }
      const dist = Math.hypot(sx - tg.x, sy - tg.y);
      out.push({
        ch: tg.ch, sx, sy, tgt: tg, size,
        t0: now + i * FLY_STAGGER,
        dur: FLY_BASE + dist * FLY_DIST_K,
        arc: rnd(ARC_MIN, ARC_MAX), landed: false,
      });
    });

    // ciò che avanza nel bottone si stacca comunque: il guscio resta vuoto
    strayRef.current = pool.filter((o) => !o.taken).map((o, i) => {
      o.node.style.opacity = "0";
      return {
        ch: o.ch, x: o.x, y: o.y, size: o.size,
        vx: rnd(-0.6, 0.6), vy: rnd(-0.9, -0.2),
        rot: 0, spin: rnd(-0.04, 0.04), a: 0.7,
        t0: now + i * 40,
      };
    });
    flyRef.current = out;
  }

  /* ── il disegno ──────────────────────────────────────────────────────── */
  function draw(now: number) {
    const cv = canvasRef.current, host = hostRef.current;
    if (!cv || !host) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    /* IL RESPIRO. Nessun segno aggiunto: si muove ciò che c'è già. Due
       oscillazioni a frequenze incommensurabili, così non si sente il ciclo.
       Aggiornato a fotogrammi alterni: sono nodi DOM, non pixel. */
    frameRef.current++;
    if (!answeredRef.current && frameRef.current % 2 === 0) {
      breathRef.current += 0.032;
      const b = breathRef.current;
      const d = Math.sin(b * 0.9) * BREATH_AMP + Math.sin(b * 0.37) * (BREATH_AMP * 0.42);
      const stem = stemRef.current;
      if (stem) {
        stem.querySelectorAll<HTMLElement>("span[data-d]").forEach((el) => {
          const dist = Number(el.dataset.d);
          if (dist > BREATH_REACH) return;
          const k = 1 - dist / (BREATH_REACH + 0.5);
          const dir = el.dataset.side === "pre" ? -1 : 1;
          el.style.transform = `translateX(${(dir * d * k).toFixed(2)}px)`;
        });
      }
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let pending = false;

    for (const f of flyRef.current) {
      const q = clamp01((now - f.t0) / f.dur);
      if (q < 1) pending = true;
      if (q <= 0) continue;
      const e = easeOut(q);
      const mx = (f.sx + f.tgt.x) / 2;
      const my = (f.sy + f.tgt.y) / 2 + f.arc;
      const u = 1 - e;
      const x = u * u * f.sx + 2 * u * e * mx + e * e * f.tgt.x;
      const y = u * u * f.sy + 2 * u * e * my + e * e * f.tgt.y;
      const sz = f.size + (f.tgt.size - f.size) * e;
      ctx.font = `${q >= 1 ? 500 : 400} ${sz.toFixed(1)}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = `rgba(${q > 0.7 ? "52,211,153" : "199,184,232"},${(0.35 + 0.65 * e).toFixed(3)})`;
      ctx.fillText(f.ch, x, y);
    }

    for (const s of strayRef.current) {
      if (now < s.t0) continue;
      s.x += s.vx; s.y += s.vy; s.vy += 0.03;
      s.rot += s.spin; s.a = Math.max(0, s.a - 0.014);
      if (s.a <= 0.02) continue;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.font = `400 ${s.size.toFixed(1)}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = `rgba(199,184,232,${s.a.toFixed(3)})`;
      ctx.fillText(s.ch, 0, 0);
      ctx.restore();
    }
    if (strayRef.current.length && strayRef.current.every((s) => s.a <= 0.02))
      strayRef.current = [];

    // finita la composizione, il canvas cede il posto al DOM: da lì è testo
    // vero, allineato come il resto della frase
    if (!settledRef.current && flyRef.current.length > 0 && !pending) {
      settledRef.current = true;
      const sz = sizerRef.current;
      if (sz) {
        sz.style.visibility = "visible";
        sz.style.color = "#34D399";
        sz.textContent = answerRef.current;
      }
      flyRef.current = [];
    }
  }

  /* ── ciclo di vita ───────────────────────────────────────────────────── */
  useEffect(() => {
    const host = hostRef.current, cv = canvasRef.current;
    if (!host || !cv) return;
    const resize = () => {
      const r = host.getBoundingClientRect();
      sizeRef.current = { w: r.width, h: r.height };
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    // L'host cambia altezza dopo il primo render — font che caricano, frase
    // che passa a due righe — e senza questo il canvas resta alla misura
    // vecchia e il disegno scivola.
    const ro = new ResizeObserver(() => resize());
    ro.observe(host);
    if (!reduced) {
      const loop = (now: number) => { draw(now); rafRef.current = requestAnimationFrame(loop); };
      rafRef.current = requestAnimationFrame(loop);
    }
    return () => {
      window.removeEventListener("resize", resize);
      ro.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  // parola nuova: buco richiuso, frase riaccesa, tutto azzerato
  useEffect(() => {
    answerRef.current = answer;
    optionsRef.current = options;
    flyRef.current = [];
    strayRef.current = [];
    settledRef.current = false;
    answeredRef.current = false;
    setShakeIdx(null);
    if (sizerRef.current) {
      sizerRef.current.style.visibility = "hidden";
      sizerRef.current.style.color = "";
      sizerRef.current.textContent = "";
    }
    if (gapRef.current) gapRef.current.style.width = GAP_MIN + "px";
    if (glyphsRef.current) glyphsRef.current.innerHTML = "";
    const stem = stemRef.current;
    if (stem) stem.querySelectorAll<HTMLElement>("span[data-d]")
      .forEach((el) => { el.style.opacity = ""; el.style.transform = ""; });
    const wrap = optsRef.current;
    if (wrap) [...wrap.children].forEach((el) => {
      [...(el as HTMLElement).querySelectorAll<HTMLElement>("span")]
        .forEach((s) => (s.style.opacity = "1"));
    });
  }, [word.id, answer, options]);

  function handlePick(option: string, i: number) {
    if (isAnswered) return;
    const correct = option === answer;
    answeredRef.current = true;
    // il respiro si ferma e la frase torna dritta
    const stem = stemRef.current;
    if (stem) stem.querySelectorAll<HTMLElement>("span[data-d]")
      .forEach((el) => (el.style.transform = ""));

    const ms = composeMs(answer.length);
    const delay = correct ? ms + REVEAL_PAD : SHAKE_MS + FAIL_GAP + ms + REVEAL_PAD;
    onSelect(option, correct, delay);

    if (reduced) {
      if (gapRef.current) gapRef.current.style.width = "auto";
      if (sizerRef.current) {
        sizerRef.current.textContent = answer;
        sizerRef.current.style.visibility = "visible";
        sizerRef.current.style.color = "#34D399";
      }
      settledRef.current = true;
      return;
    }

    if (correct) {
      compose();
    } else {
      setShakeIdx(i);
      window.setTimeout(compose, SHAKE_MS + FAIL_GAP);
    }
  }

  const optStyle = (o: string): React.CSSProperties => {
    if (!isAnswered)
      return { background: "rgba(10,10,10,0.5)", border: "1px solid rgba(199,184,232,0.16)", color: "#C7B8E8" };
    if (o === answer)
      return { background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.55)", color: "#34D399" };
    if (o === selectedOption)
      // il rosso resta acceso per tutta la domanda, ma non brilla: l'alone
      // competerebbe con la parola che si sta componendo
      return { background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.6)", color: "#FCA5A5" };
    return { background: "rgba(10,10,10,0.5)", border: "1px solid rgba(199,184,232,0.16)", color: "#C7B8E8", opacity: 0.14 };
  };

  /**
   * Le PAROLE della frase, non i caratteri. Ogni parola è un contenitore che
   * non si spezza — con i caratteri singoli il browser andava a capo in mezzo
   * alle parole. Il respiro adesso muove le parole intere, il che è anche più
   * quieto: due pixel su una parola si leggono come spazio che si allarga,
   * due pixel su una lettera si leggono come un tremolio.
   */
  const chars = (s: string, side: "pre" | "post") => {
    const tokens = s.split(/(\s+)/).filter((t) => t.length > 0);
    const words = tokens.filter((t) => !/^\s+$/.test(t)).length;
    let wi = 0;
    return tokens.map((tok, ti) => {
      if (/^\s+$/.test(tok))
        return <span key={`${side}-s${ti}`} style={{ whiteSpace: "pre" }}>{tok}</span>;
      const d = side === "pre" ? words - 1 - wi : wi;
      wi += 1;
      return (
        <span key={`${side}-w${ti}`}
          data-side={side}
          data-d={d}
          style={{ display: "inline-block", whiteSpace: "nowrap",
                   transition: "opacity 0.28s ease" }}>
          {tok}
        </span>
      );
    });
  };

  return (
    <div ref={hostRef}
      style={{ position: "relative", width: "100%", maxWidth: SCREEN_MAX, flex: 1, display: "flex", flexDirection: "column" }}>
      <canvas ref={canvasRef} aria-hidden
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />

      <AnimatePresence mode="wait">
        <motion.div key={animKey}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ position: "relative", zIndex: 1, paddingTop: 28, paddingBottom: 22 }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.32)", textAlign: "center", margin: "0 0 18px" }}>
            Complete the sentence
          </p>
          <p ref={stemRef}
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400, fontSize: "clamp(17px, 4.6vw, 21px)", lineHeight: 1.72, color: "rgba(255,255,255,0.93)", textAlign: "center", margin: 0 }}>
            {chars(parts.pre, "pre")}
            <span ref={gapRef}
              style={{ position: "relative", display: "inline-block", verticalAlign: "baseline", width: GAP_MIN, transition: "width 0.4s cubic-bezier(.19,1,.22,1)" }}>
              <span ref={sizerRef} style={{ visibility: "hidden", whiteSpace: "nowrap", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }} />
              <span ref={glyphsRef} aria-hidden style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap", visibility: "hidden", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }} />
            </span>
            {chars(parts.post, "post")}
          </p>
        </motion.div>
      </AnimatePresence>

      <div ref={optsRef}
        style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 9, marginTop: "auto" }}>
        {options.map((o, i) => (
          <motion.button
            key={`${word.id}-${o}`}
            data-testid={`context-option-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1, y: 0,
              // lo scossone: identico a quello del gradino 1
              x: shakeIdx === i ? [0, -7, 6, -4, 2, 0] : 0,
            }}
            transition={{
              delay: shakeIdx === i ? 0 : i * 0.06, duration: 0.25, ease: "easeOut",
              x: { duration: SHAKE_MS / 1000, ease: [0.36, 0.07, 0.19, 0.97], delay: 0 },
            }}
            whileTap={isAnswered ? undefined : tapScale("card")}
            onClick={() => handlePick(o, i)}
            disabled={isAnswered}
            style={{
              ...optStyle(o), borderRadius: 12, padding: "13px 16px",
              cursor: isAnswered ? "default" : "pointer",
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500,
              fontSize: "1rem", textAlign: "center", outline: "none",
              transition: "border-color 0.3s, background 0.3s, color 0.3s, opacity 0.45s",
            }}>
            {/* ogni lettera è un nodo suo: è così che può staccarsi e volare */}
            {o.split("").map((c, k) => (
              <span key={k} style={{ display: "inline-block", transition: "opacity 0.1s linear" }}>{c}</span>
            ))}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
