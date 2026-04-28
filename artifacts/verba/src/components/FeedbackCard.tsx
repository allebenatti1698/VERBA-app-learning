import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

function speakWord(word: string) {
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    // SpeechSynthesis not available
  }
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
          background: "linear-gradient(120deg, #C17B1A 0%, #D97706 30%, #FFF8F0 55%, #D97706 80%, #C17B1A 100%)",
          backgroundSize: "300% 100%",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "title-shimmer 4.5s ease-in-out infinite",
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
            color: speakerHover ? "#D97706" : "rgba(217,119,6,0.6)",
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
      {definition}
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

interface FeedbackSynonymsProps {
  synonyms: string[];
  visible?: boolean;
}
export function FeedbackSynonyms({ synonyms, visible = true }: FeedbackSynonymsProps) {
  if (!visible) return null;
  return (
    <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
      <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: "0.05em", color: "rgba(255,255,255,0.5)" }}>Synonyms: </span>
      <span style={{ fontWeight: 400, fontSize: 15, color: "#D97706" }}>{synonyms.join(", ")}</span>
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
      <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: "0.05em", color: "rgba(255,255,255,0.5)" }}>Antonyms: </span>
      <span style={{ fontWeight: 400, fontSize: 15, color: "#84A98C" }}>{antonyms.join(", ")}</span>
    </p>
  );
}

interface FeedbackEtymologyProps {
  etymology: string;
  visible?: boolean;
}
export function FeedbackEtymology({ etymology, visible = true }: FeedbackEtymologyProps) {
  if (!visible) return null;
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
      style={{
        display: "block",
        width: "auto",
        maxWidth: 200,
        margin: "24px auto 0 auto",
        padding: "12px 32px",
        borderRadius: 9999,
        border: "none",
        cursor: "pointer",
        background: "linear-gradient(to right, #B45309, #C2410C)",
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        fontSize: 15,
        letterSpacing: "0.04em",
        color: "#FFFFFF",
        outline: "none",
        boxShadow: "0 0 12px rgba(217,119,6,0.25)",
      }}
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
}

interface FeedbackCardProps {
  show: boolean;
  word: QuizWord;
  isCorrect: boolean;
  isLast: boolean;
  onDismiss: () => void;
  onNext: () => void;
}

export default function FeedbackCard({ show, word, isCorrect, isLast, onDismiss, onNext }: FeedbackCardProps) {
  const [closeHover, setCloseHover] = useState(false);
  const swipeStartY = useRef<number | null>(null);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {show && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onDismiss}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 40,
            }}
          />
        )}
      </AnimatePresence>

      {/* Card */}
      <AnimatePresence>
        {show && (
          <motion.div
            key="feedback"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            onTouchStart={(e) => { swipeStartY.current = e.touches[0].clientY; }}
            onTouchMove={(e) => {
              if (swipeStartY.current !== null) {
                const delta = e.touches[0].clientY - swipeStartY.current;
                if (delta > 80) onDismiss();
              }
            }}
            onTouchEnd={() => { swipeStartY.current = null; }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
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
            {/* Close button */}
            <button
              onClick={onDismiss}
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
              aria-label="Close"
            >
              <IconX />
            </button>

            <FeedbackStatus isCorrect={isCorrect} visible={true} />
            <FeedbackWord word={word.word} phonetic={word.phonetic} visible={true} />
            <FeedbackDefinition definition={word.correctDefinition} visible={true} />
            <FeedbackExample sentence={word.exampleSentence} visible={true} />

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <FeedbackSynonyms synonyms={word.synonyms} visible={true} />
              <FeedbackAntonyms antonyms={word.antonyms} visible={true} />
            </div>

            <FeedbackEtymology etymology={word.etymology} visible={true} />
            <FeedbackNextButton onClick={onNext} isLast={isLast} visible={true} />
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
