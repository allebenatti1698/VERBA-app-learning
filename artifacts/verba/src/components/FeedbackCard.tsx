import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { SCREEN_MAX } from "@/components/ScreenColumn";
import { primaryButtonStyle } from "@/lib/primaryButtonStyle";
import { lowercaseFirst } from "@/lib/formatText";

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
  visible?: boolean;
}
export function FeedbackMultiDefinitions({ definitions, visible = true }: FeedbackMultiDefinitionsProps) {
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
              "{def.example}"
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

export default function FeedbackCard({ show, word, isCorrect, isLast, onDismiss, onNext, allowMinimize = false }: FeedbackCardProps) {
  const [closeHover, setCloseHover] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const swipeStartY = useRef<number | null>(null);

  // Reset minimized state whenever the card is freshly shown (new word answered)
  useEffect(() => {
    if (show) setMinimized(false);
  }, [show]);

  const handleClose = () => {
    if (allowMinimize) {
      setMinimized(true);
    } else {
      onDismiss();
    }
  };

  return (
    <>
      {/* Backdrop — hidden when card is minimized */}
      <AnimatePresence>
        {show && !minimized && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 40,
            }}
          />
        )}
      </AnimatePresence>

      {/* Card — stays mounted while show=true so internal state is preserved;
          slides to y:"110%" when minimized, returns with spring when expanded */}
      <AnimatePresence>
        {show && (
          <motion.div
            key="feedback"
            initial={{ y: "100%" }}
            animate={{ y: minimized ? "110%" : 0 }}
            exit={{ y: "110%" }}
            transition={
              minimized
                ? { type: "tween", duration: 0.25, ease: "easeIn" }
                : { type: "spring", stiffness: 200, damping: 25 }
            }
            onTouchStart={(e) => { swipeStartY.current = e.touches[0].clientY; }}
            onTouchMove={(e) => {
              if (swipeStartY.current !== null) {
                const delta = e.touches[0].clientY - swipeStartY.current;
                if (delta > 80) handleClose();
              }
            }}
            onTouchEnd={() => { swipeStartY.current = null; }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: SCREEN_MAX,
              marginLeft: "auto",
              marginRight: "auto",
              maxHeight: "80vh",
              overflowY: "auto",
              background: "#111111",
              borderTop: "1px solid rgba(217,119,6,0.2)",
              borderRadius: "20px 20px 0 0",
              padding: "24px",
              zIndex: 50,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(217,119,6,0.3) transparent",
            }}
          >
            {/* Minimize / Close button */}
            <button
              onClick={handleClose}
              onMouseEnter={() => setCloseHover(true)}
              onMouseLeave={() => setCloseHover(false)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: closeHover ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.4)",
                padding: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.15s ease",
              }}
              aria-label={allowMinimize ? "Minimize" : "Close"}
            >
              <IconX />
            </button>

            <FeedbackStatus isCorrect={isCorrect} visible={true} />
            <FeedbackWord word={word.word} phonetic={word.phonetic} visible={true} />
            {word.allDefinitions && word.allDefinitions.length > 1 ? (
              <FeedbackMultiDefinitions definitions={word.allDefinitions} />
            ) : (
              <div style={{ marginTop: 16 }}>
                {word.allDefinitions?.[0]?.part_of_speech && (
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "lowercase",
                    color: "rgba(199,184,232,0.5)",
                    fontStyle: "italic",
                    margin: "0 0 6px",
                  }}>
                    {word.allDefinitions[0].part_of_speech}
                  </p>
                )}
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: 20,
                  color: "#FFFFFF",
                  margin: 0,
                  lineHeight: 1.4,
                }}>
                  {lowercaseFirst(word.correctDefinition)}
                </p>
                {word.exampleSentence && (
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    fontSize: 16,
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.7)",
                    margin: "12px 0 0",
                    lineHeight: 1.5,
                  }}>
                    "{word.exampleSentence}"
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
            <FeedbackNextButton onClick={onNext} isLast={isLast} visible={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized pill bar — shown when card is set aside */}
      <AnimatePresence>
        {show && minimized && (
          <motion.div
            key="minimized-pills"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              bottom: 32,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              zIndex: 60,
              pointerEvents: "none",
            }}
          >
            {/* Show feedback pill — styled to match the Hint button (secondary, ghost) */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMinimized(false)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.85)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.6)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,0.8)";
              }}
              style={{
                pointerEvents: "auto",
                background: "none",
                border: "1px solid rgba(217,119,6,0.6)",
                borderRadius: 9999,
                padding: "4px 12px",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                fontSize: "0.72rem",
                color: "rgba(217,119,6,0.8)",
                letterSpacing: "0.03em",
                display: "flex",
                alignItems: "center",
                gap: 5,
                opacity: 0.7,
                outline: "none",
                transition: "color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
              }}
            >
              Show feedback <ChevronUp size={12} />
            </motion.button>

            {/* Next pill */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onNext}
              style={{
                pointerEvents: "auto",
                background: "linear-gradient(to right, #F59E0B, #EA580C)",
                border: "none",
                borderRadius: 9999,
                padding: "10px 22px",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                color: "#FFFFFF",
                boxShadow: "0 0 12px rgba(245,158,11,0.3)",
                outline: "none",
                letterSpacing: "0.02em",
              }}
            >
              {isLast ? "Finish" : "Next →"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(217,119,6,0.3); border-radius: 2px; }
      `}</style>
    </>
  );
}
