import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { SCREEN_MAX } from "@/components/ScreenColumn";
import { primaryButtonStyle } from "@/lib/primaryButtonStyle";
import { lowercaseFirst, highlightWord } from "@/lib/formatText";
import { tapScale, TAP_SPRING } from "@/components/SpringTap";
import { getWordOrigin, setWordOrigin, type WordOrigin } from "@/lib/wordOrigin";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconVolume() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

let _cachedVoice: SpeechSynthesisVoice | null = null;

function getBestEnglishVoice(): SpeechSynthesisVoice | null {
  if (_cachedVoice) return _cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const preferred = [
    (v: SpeechSynthesisVoice) => v.name === "Google US English",
    (v: SpeechSynthesisVoice) => v.name.includes("Samantha"),
    (v: SpeechSynthesisVoice) => v.name.includes("Aria") || v.name.includes("Jenny"),
    (v: SpeechSynthesisVoice) => v.lang === "en-US",
    (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
  ];

  for (const pred of preferred) {
    const found = voices.find(pred);
    if (found) { _cachedVoice = found; return found; }
  }
  return voices[0] ?? null;
}

function speakWord(word: string) {
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    const voice = getBestEnglishVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {
    // SpeechSynthesis not available
  }
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => { _cachedVoice = null; };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FeedbackStatusProps {
  isCorrect: boolean;
  visible?: boolean;
}
export function FeedbackStatus({ isCorrect, visible = true }: FeedbackStatusProps) {
  if (!visible) return null;
  return (
    <p style={{
      fontFamily: "'Inter', sans-serif",
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: isCorrect ? "#10B981" : "#EF4444",
      margin: "0 0 16px",
    }}>
      {isCorrect ? "✓ Correct" : "✗ Incorrect"}
    </p>
  );
}

interface FeedbackWordProps {
  word: string;
  phonetic: string;
  visible?: boolean;
}
export function FeedbackWord({ word, phonetic, visible = true }: FeedbackWordProps) {
  const [speakerHover, setSpeakerHover] = useState(false);
  if (!visible) return null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 32,
          color: "#C7B8E8",
          lineHeight: 1.2,
        }}>
          {word}
        </span>
        <button
          onClick={() => speakWord(word)}
          onMouseEnter={() => setSpeakerHover(true)}
          onMouseLeave={() => setSpeakerHover(false)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: speakerHover ? "#C7B8E8" : "rgba(199,184,232,0.55)",
            padding: 4,
            display: "flex",
            alignItems: "center",
            transition: "color 0.15s ease",
            flexShrink: 0,
          }}
          aria-label="Pronounce"
        >
          <IconVolume />
        </button>
      </div>
      <p style={{
        fontFamily: "monospace",
        fontSize: 13,
        color: "rgba(255,255,255,0.4)",
        margin: "6px 0 0",
        letterSpacing: "0.02em",
      }}>
        {phonetic}
      </p>
    </div>
  );
}

interface FeedbackDefinitionProps {
  definition: string;
  visible?: boolean;
}
export function FeedbackDefinition({ definition, visible = true }: FeedbackDefinitionProps) {
  if (!visible) return null;
  return (
    <p style={{
      fontFamily: "'Inter', sans-serif",
      fontWeight: 400,
      fontSize: 20,
      color: "#FFFFFF",
      margin: "16px 0 0",
      lineHeight: 1.4,
    }}>
      {lowercaseFirst(definition)}
    </p>
  );
}

interface FeedbackExampleProps {
  sentence: string;
  visible?: boolean;
}
export function FeedbackExample({ sentence, visible = true }: FeedbackExampleProps) {
  if (!visible) return null;
  return (
    <p style={{
      fontFamily: "'Inter', sans-serif",
      fontWeight: 300,
      fontSize: 16,
      fontStyle: "italic",
      color: "rgba(255,255,255,0.7)",
      margin: "12px 0 0",
      lineHeight: 1.5,
    }}>
      "{sentence}"
    </p>
  );
}

interface FeedbackMultiDefinitionsProps {
  definitions: { part_of_speech: string; definition: string; example: string; display_order: number }[];
  /** parola-chiave da evidenziare dentro gli esempi */
  word?: string;
  visible?: boolean;
}
export function FeedbackMultiDefinitions({ definitions, word, visible = true }: FeedbackMultiDefinitionsProps) {
  if (!visible || !definitions || definitions.length === 0) return null;

  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 18 }}>
      {definitions.map((def, idx) => (
        <div key={idx}>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "lowercase",
            color: "rgba(199,184,232,0.5)",
            margin: "0 0 6px",
            fontStyle: "italic",
          }}>
            {definitions.length > 1 && (
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: 11,
                letterSpacing: "0.12em",
                color: "rgba(199,184,232,0.5)",
                marginRight: 6,
                fontStyle: "italic",
              }}>
                {idx + 1}.
              </span>
            )}
            {def.part_of_speech}
          </p>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            fontSize: 18,
            color: "#FFFFFF",
            margin: 0,
            lineHeight: 1.4,
          }}>
            {lowercaseFirst(def.definition)}
          </p>
          {def.example && (
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize: 15,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.6)",
              margin: "8px 0 0",
              lineHeight: 1.5,
            }}>
              "{word ? highlightWord(def.example, word) : def.example}"
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

interface FeedbackSynonymsProps {
  synonyms: string[];
  visible?: boolean;
}
export function FeedbackSynonyms({ synonyms, visible = true }: FeedbackSynonymsProps) {
  if (!visible) return null;
  return (
    <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
      <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: "0.05em", color: "#84A98C" }}>Synonyms: </span>
      <span style={{ fontWeight: 400, fontSize: 15, color: "#84A98C" }}>{synonyms.join(", ")}</span>
    </p>
  );
}

interface FeedbackAntonymsProps {
  antonyms: string[];
  visible?: boolean;
}
export function FeedbackAntonyms({ antonyms, visible = true }: FeedbackAntonymsProps) {
  if (!visible) return null;
  return (
    <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
      <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: "0.05em", color: "rgba(248,113,113,0.85)" }}>Antonyms: </span>
      <span style={{ fontWeight: 400, fontSize: 15, color: "rgba(248,113,113,0.85)" }}>{antonyms.join(", ")}</span>
    </p>
  );
}

interface FeedbackTranslationProps {
  italianTranslation: string;
  italianDefinition: string;
  visible?: boolean;
}
export function FeedbackTranslation({ italianTranslation, italianDefinition, visible = true }: FeedbackTranslationProps) {
  const [expanded, setExpanded] = useState(false);
  if (!visible) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <AnimatePresence mode="wait">
        {!expanded ? (
          <motion.button
            key="show-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setExpanded(true)}
            style={{
              background: "none",
              border: "1px solid rgba(217,119,6,0.25)",
              borderRadius: 9999,
              padding: "4px 12px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "0.72rem",
              color: "rgba(217,119,6,0.5)",
              letterSpacing: "0.03em",
              display: "flex",
              alignItems: "center",
              gap: 5,
              opacity: 0.7,
              transition: "color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,0.9)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.5)";
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,0.5)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.25)";
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
            }}
          >
            🌐 show italian translation
          </motion.button>
        ) : (
          <motion.div
            key="translation-card"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(217,119,6,0.2)",
              borderRadius: 10,
              padding: "12px 14px",
              position: "relative",
            }}
          >
            {/* Hide button */}
            <button
              onClick={() => setExpanded(false)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.3)",
                padding: 2,
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"; }}
              aria-label="Hide translation"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 500,
              fontSize: 18,
              color: "#D97706",
              margin: 0,
            }}>
              {italianTranslation}
            </p>
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              fontStyle: "italic",
              margin: "6px 0 0",
              lineHeight: 1.5,
            }}>
              {italianDefinition}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FeedbackEtymologyProps {
  etymology: string;
  visible?: boolean;
}
export function FeedbackEtymology({ etymology, visible = true }: FeedbackEtymologyProps) {
  if (!visible) return null;
  if (!etymology || etymology.trim() === "") return null;
  return (
    <div style={{ marginTop: 24 }}>
      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 400,
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.3)",
        margin: "0 0 4px",
      }}>
        Origin
      </p>
      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 300,
        fontSize: 13,
        fontStyle: "italic",
        color: "rgba(255,255,255,0.5)",
        margin: 0,
        lineHeight: 1.5,
      }}>
        {etymology}
      </p>
    </div>
  );
}

interface FeedbackNextButtonProps {
  onClick: () => void;
  isLast: boolean;
  visible?: boolean;
}
export function FeedbackNextButton({ onClick, isLast, visible = true }: FeedbackNextButtonProps) {
  if (!visible) return null;
  return (
    <motion.button
      data-testid="button-next"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      style={{ ...primaryButtonStyle, display: "block", margin: "44px auto 0 auto" }}
    >
      {isLast ? "Finish" : "Next →"}
    </motion.button>
  );
}

// ─── Main FeedbackCard ────────────────────────────────────────────────────────

// TODO: Replace `visible={true}` with user preferences from settings (Step 8)
// Future: each component's visibility will be controlled by user toggles in /settings

export interface QuizWord {
  word: string;
  phonetic: string;
  correctDefinition: string;
  exampleSentence: string;
  synonyms: string[];
  antonyms: string[];
  etymology: string;
  italianTranslation: string;
  italianDefinition: string;
  allDefinitions?: {
    part_of_speech: string;
    definition: string;
    example: string;
    display_order: number;
  }[];
}

interface FeedbackCardProps {
  show: boolean;
  word: QuizWord;
  isCorrect: boolean;
  isLast: boolean;
  onDismiss: () => void;
  onNext: () => void;
  allowMinimize?: boolean;
}

export default function FeedbackCard({ show, word, isCorrect, isLast, onNext }: FeedbackCardProps) {
  /**
   * La scheda non arriva: si APRE attorno alla parola appena risolta.
   *
   * Un solo oggetto è continuo — la parola. Parte dal punto in cui il formato
   * l'ha lasciata (il buco nel gradino 2, il titolo nel gradino 1), viaggia
   * lungo una curva e diventa il titolo della scheda. Il ritaglio si allarga
   * dal rettangolo della parola fino ai bordi: non c'è nessun fotogramma in
   * cui la scheda entri da fuori.
   *
   * Risposta GIUSTA: la scheda resta chiusa. Vedi titolo, badge, Next e la
   * linguetta "Definition". Risposta SBAGLIATA: si apre da sé.
   */

  /* ── numeri regolabili a occhio, senza agent ── */
  const K = 150;            // rigidità della molla del viaggio
  const C = 21;             // smorzamento
  const MASS = 1.4;
  const G_SOFT = 0.72;      // quanto è più morbida la molla della crescita
  const TITLE_FS = 32;      // corpo del titolo
  const TITLE_X = 24;       // rientro del titolo dentro la scheda
  const TITLE_Y = 74;       // quota del titolo dentro la scheda
  const TOP_FRAC = 0.19;    // dove comincia il riquadro
  const BOTTOM_BAR = 86;    // spazio riservato alla barra del Next

  const [opened, setOpened] = useState(false);
  const [flying, setFlying] = useState(true);
  const [box, setBox] = useState({ top: 0, height: 0 });

  const cardRef = useRef<HTMLDivElement | null>(null);
  const flyEl = useRef<HTMLDivElement | null>(null);
  const originRef = useRef<WordOrigin | null>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ y0: number; from: boolean; moved: boolean } | null>(null);

  const [reduced] = useState(
    () => typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const clamp01 = (p: number) => Math.max(0, Math.min(1, p));
  const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

  /** Il ritaglio: dal rettangolo della parola ai bordi della scheda. */
  const clipFor = (e: number) => {
    const card = cardRef.current;
    if (!card) return "inset(0px round 22px)";
    const cr = card.getBoundingClientRect();
    const fly = flyEl.current;
    const wr = fly ? fly.getBoundingClientRect() : cr;
    const L = Math.max(0, wr.left - cr.left) * (1 - e);
    const R = Math.max(0, cr.right - wr.right) * (1 - e);
    const T = Math.max(0, wr.top - cr.top) * (1 - e);
    const B = Math.max(0, cr.bottom - wr.bottom) * (1 - e);
    const rad = Math.max(6, 22 * e + 8 * (1 - e));
    return `inset(${T.toFixed(1)}px ${R.toFixed(1)}px ${B.toFixed(1)}px ${L.toFixed(1)}px round ${rad.toFixed(1)}px)`;
  };

  const applyClip = (e: number, animate: boolean) => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = animate
      ? "clip-path 0.5s cubic-bezier(.19,1,.22,1), opacity 0.3s ease" : "";
    card.style.opacity = e > 0.02 ? "1" : "0";
    card.style.clipPath = clipFor(e);
  };

  useEffect(() => {
    const measure = () => {
      const h = window.innerHeight;
      const top = Math.max(104, h * TOP_FRAC);
      setBox({ top, height: Math.max(180, h - top - BOTTOM_BAR) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* il viaggio della parola */
  useEffect(() => {
    if (!show) {
      setOpened(false); setFlying(true);
      setWordOrigin(null);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }
    const o = getWordOrigin();
    originRef.current = o;
    setOpened(!isCorrect);
    setFlying(!!o && !reduced);

    if (!o || reduced) {
      requestAnimationFrame(() => applyClip(isCorrect ? 0 : 1, false));
      setFlying(false);
      return;
    }

    const target = { x: 14 + TITLE_X, y: box.top + TITLE_Y, scale: TITLE_FS / o.fontSize };
    const st = { p: 0, v: 0 }, gr = { p: 0, v: 0 };
    let stop = false;

    const tick = () => {
      if (stop) return;
      const dt = 1 / 60;
      st.v += ((-K * (st.p - 1) - C * st.v) / MASS) * dt; st.p += st.v * dt;
      gr.v += ((-K * G_SOFT * (gr.p - 1) - C * 0.92 * gr.v) / MASS) * dt; gr.p += gr.v * dt;
      const p = clamp01(st.p), pg = clamp01(gr.p);

      const el = flyEl.current;
      if (el) {
        // percorso curvo: il controllo spostato in alto e verso il titolo
        const y0 = o.y + o.h / 2;
        const mx = (o.x + target.x) / 2 + (target.x - o.x) * 0.18;
        const my = (y0 + target.y) / 2 - Math.abs(target.y - y0) * 0.22;
        const u = 1 - p;
        el.style.left = (u * u * o.x + 2 * u * p * mx + p * p * target.x) + "px";
        el.style.top = (u * u * y0 + 2 * u * p * my + p * p * target.y) + "px";
        el.style.transform = `translateY(-50%) scale(${(1 + (target.scale - 1) * pg).toFixed(4)})`;
        // la spaziatura si apre e si richiude: le impedisce di sembrare uno zoom
        el.style.letterSpacing = (Math.sin(p * Math.PI) * 1.7).toFixed(2) + "px";
        // il verde dice "hai indovinato", il lilla dice "questa è la parola"
        const cm = clamp01((p - 0.12) / 0.62);
        const col = o.correct
          ? [52 + (199 - 52) * cm, 211 + (184 - 211) * cm, 153 + (232 - 153) * cm]
          : [199, 184, 232];
        el.style.color = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
      }

      if (!isCorrect) applyClip(easeOut(clamp01((p - 0.12) / 0.88)), false);

      if (Math.abs(st.v) < 0.02 && Math.abs(st.p - 1) < 0.002 &&
          Math.abs(gr.v) < 0.02 && Math.abs(gr.p - 1) < 0.002) {
        if (!isCorrect) applyClip(1, false);
        setFlying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { stop = true; if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [show, isCorrect, reduced, box.top]);

  const toggle = (v: boolean) => { setOpened(v); applyClip(v ? 1 : 0, true); };

  const multi = !!word.allDefinitions && word.allDefinitions.length > 1;
  if (!show) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: opened ? 1 : 0.45 }}
        transition={{ duration: 0.28 }}
        onClick={() => opened && toggle(false)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", zIndex: 40 }} />

      {/* IL RIQUADRO. Il contenuto scorre col dito e SVANISCE prima di
          arrivare sotto il titolo: una maschera, non un fondo opaco. */}
      <div ref={cardRef}
        style={{
          position: "fixed", left: 14, right: 14, top: box.top, height: box.height,
          maxWidth: SCREEN_MAX, marginLeft: "auto", marginRight: "auto",
          borderRadius: 22, overflow: "hidden", opacity: 0,
          background: "linear-gradient(168deg,#16151B,#0D0C11)",
          border: "1px solid rgba(199,184,232,0.2)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.72)",
          zIndex: 50, willChange: "clip-path",
        }}>
        <div className="fb-scroll"
          style={{
            position: "absolute", inset: 0, overflowY: "auto",
            overscrollBehavior: "contain", WebkitOverflowScrolling: "touch",
            touchAction: "pan-y", padding: "118px 24px 26px",
          }}>
          {multi ? (
            <FeedbackMultiDefinitions definitions={word.allDefinitions!} word={word.word} />
          ) : (
            <div>
              {word.allDefinitions?.[0]?.part_of_speech && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 11, letterSpacing: "0.12em", textTransform: "lowercase", color: "rgba(199,184,232,0.5)", fontStyle: "italic", margin: "0 0 6px" }}>
                  {word.allDefinitions[0].part_of_speech}
                </p>
              )}
              <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 20, color: "#FFFFFF", margin: 0, lineHeight: 1.4 }}>
                {lowercaseFirst(word.correctDefinition)}
              </p>
              {word.exampleSentence && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 16, fontStyle: "italic", color: "rgba(255,255,255,0.7)", margin: "12px 0 0", lineHeight: 1.5 }}>
                  "{highlightWord(word.exampleSentence, word.word)}"
                </p>
              )}
            </div>
          )}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <FeedbackSynonyms synonyms={word.synonyms} visible={true} />
            <FeedbackAntonyms antonyms={word.antonyms} visible={true} />
          </div>
          <FeedbackTranslation italianTranslation={word.italianTranslation} italianDefinition={word.italianDefinition} visible={true} />
          <FeedbackEtymology etymology={word.etymology} visible={true} />
        </div>
      </div>

      {/* badge e titolo: fuori dallo scorrimento, sempre alla stessa quota */}
      <p style={{
        position: "fixed", left: 14 + TITLE_X, top: box.top + 30, zIndex: 52,
        fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: isCorrect ? "#10B981" : "#EF4444", margin: 0, pointerEvents: "none",
      }}>
        {isCorrect ? "✓ Correct" : "✗ Incorrect"}
      </p>

      {!flying && (
        <div style={{
          position: "fixed", left: 14 + TITLE_X, top: box.top + TITLE_Y, zIndex: 53,
          transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: TITLE_FS, color: "#C7B8E8", lineHeight: 1.1 }}>
            {word.word}
          </span>
          <button onClick={() => speakWord(word.word)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(199,184,232,0.55)", padding: 4, display: "flex", alignItems: "center" }}
            aria-label="Pronounce">
            <IconVolume />
          </button>
        </div>
      )}

      {/* la parola che viaggia: un solo nodo, dal formato al titolo */}
      {flying && originRef.current && (
        <div ref={flyEl} aria-hidden
          style={{
            position: "fixed",
            left: originRef.current.x,
            top: originRef.current.y + originRef.current.h / 2,
            transform: "translateY(-50%)", transformOrigin: "0 50%", zIndex: 53,
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
            fontSize: originRef.current.fontSize, whiteSpace: "nowrap",
            color: originRef.current.correct ? "#34D399" : "#C7B8E8",
            pointerEvents: "none", willChange: "transform, left, top",
          }}>
          {word.word}
        </div>
      )}

      {/* LA LINGUETTA. In alto a destra, sulla riga del badge: non può
          sovrapporsi al contenuto qualunque sia la lunghezza della parola.
          Apre e chiude lo stesso elemento — nessuna ✕ altrove. */}
      <button
        onClick={() => { if (!dragRef.current?.moved) toggle(!opened); }}
        onPointerDown={(e) => {
          dragRef.current = { y0: e.clientY, from: opened, moved: false };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          if (cardRef.current) cardRef.current.style.transition = "";
        }}
        onPointerMove={(e) => {
          const d = dragRef.current; if (!d) return;
          const dy = e.clientY - d.y0;
          if (Math.abs(dy) > 4) d.moved = true;
          const span = Math.max(120, box.height * 0.6);
          const v = clamp01((d.from ? 1 : 0) + dy / span);
          applyClip(easeOut(v), false);
          if (v > 0.15 && !opened) setOpened(true);
        }}
        onPointerUp={(e) => {
          const d = dragRef.current; if (!d) return;
          const dy = e.clientY - d.y0;
          const span = Math.max(120, box.height * 0.6);
          if (d.moved) toggle(clamp01((d.from ? 1 : 0) + dy / span) > 0.5);
          dragRef.current = null;
        }}
        aria-label={opened ? "Close definition" : "Show definition"}
        style={{
          position: "fixed", right: 26, top: box.top + 22, zIndex: 54,
          display: "flex", alignItems: "center", gap: opened ? 0 : 7,
          padding: opened ? 7 : "6px 11px 6px 13px", borderRadius: 9999,
          background: "rgba(199,184,232,0.06)", border: "1px solid rgba(199,184,232,0.22)",
          color: "rgba(199,184,232,0.85)", cursor: "pointer",
          fontFamily: "'Inter', sans-serif", fontSize: 11.5,
          touchAction: "none", userSelect: "none",
          transition: "padding 0.3s ease, gap 0.3s ease",
        }}>
        <span style={{
          opacity: opened ? 0 : 1, width: opened ? 0 : "auto",
          overflow: "hidden", whiteSpace: "nowrap", transition: "opacity 0.25s ease",
        }}>Definition</span>
        <ChevronUp size={13}
          style={{ transform: opened ? "rotate(0deg)" : "rotate(180deg)",
                   transition: "transform 0.42s cubic-bezier(.19,1,.22,1)" }} />
      </button>

      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 55,
        padding: "18px 16px", display: "flex", justifyContent: "center",
        background: "linear-gradient(to top,#0A0A0A 62%,transparent)",
        pointerEvents: "none",
      }}>
        <motion.button data-testid="button-next" onClick={onNext}
          whileTap={tapScale()} transition={TAP_SPRING}
          style={{ ...primaryButtonStyle, pointerEvents: "auto" }}>
          {isLast ? "Finish" : "Next →"}
        </motion.button>
      </div>

      <style>{`
        .fb-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-mask-image: linear-gradient(to bottom, transparent 88px, #000 118px,
                              #000 calc(100% - 22px), transparent 100%);
          mask-image: linear-gradient(to bottom, transparent 88px, #000 118px,
                      #000 calc(100% - 22px), transparent 100%);
        }
        .fb-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
      `}</style>
    </>
  );
}
