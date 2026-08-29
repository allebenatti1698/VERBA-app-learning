import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SCREEN_MAX } from "@/components/ScreenColumn";
import { lowercaseFirst } from "@/lib/formatText";
import { tapScale } from "@/components/SpringTap";
import type { QuestionProps } from "@/components/quiz/types";

// Gradino 1 — Recognize: vedi la parola, scegli la definizione.

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOptionStyle(
  option: string,
  correctAnswer: string,
  selectedOption: string | null,
  isAnswered: boolean,
): React.CSSProperties {
  if (!isAnswered) {
    return { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(217,119,6,0.18)", boxShadow: "none" };
  }
  if (option === correctAnswer) {
    return { background: "rgba(16,185,129,0.08)", border: "1.5px solid #10B981", boxShadow: "0 0 16px rgba(16,185,129,0.25)" };
  }
  if (option === selectedOption) {
    return { background: "rgba(239,68,68,0.08)", border: "1.5px solid #EF4444", boxShadow: "0 0 16px rgba(239,68,68,0.2)" };
  }
  return { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(217,119,6,0.08)" };
}

export default function RecognizeQuestion({
  word,
  isAnswered,
  selectedOption,
  onSelect,
  animKey,
}: QuestionProps) {
  const [showTranslation, setShowTranslation] = useState(false);

  // L'hint si richiude da solo alla parola successiva.
  useEffect(() => { setShowTranslation(false); }, [word.id]);

  const correctAnswer = word.correctDefinition;
  const options = useMemo(
    () => shuffleArray([word.correctDefinition, ...word.distractors]),
    [word],
  );

  const wlen = word.word.length;
  const wordFontSize =
    wlen <= 13 ? "clamp(34px, 8.5vw, 50px)" :
    wlen <= 15 ? "clamp(28px, 7vw, 42px)" :
                 "clamp(26px, 6vw, 38px)";

  return (
    <>
      {/* Prompt */}
      <AnimatePresence mode="wait">
        <motion.div
          key={animKey}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 24, paddingBottom: 8, width: "100%", maxWidth: SCREEN_MAX }}
        >
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: wordFontSize, lineHeight: 1.3, color: "#C7B8E8", margin: 0, textAlign: "center", width: "100%", maxWidth: "100%", padding: "20px 14px 32px 14px", boxSizing: "border-box", overflow: "visible", whiteSpace: "nowrap", wordBreak: "keep-all" }}>
            {word.word}
          </h2>

          <motion.button
            onClick={() => setShowTranslation((v) => !v)}
            whileTap={{ scale: 0.95 }}
            style={{ marginTop: 8, background: "none", border: "1px solid rgba(217,119,6,0.6)", borderRadius: 9999, padding: "4px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.72rem", color: "rgba(217,119,6,0.8)", letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 5, opacity: 0.7, transition: "color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,0.9)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.5)"; (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,0.5)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.25)"; (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
          >
            💡 hint
          </motion.button>

          <AnimatePresence>
            {showTranslation && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                style={{ overflow: "hidden", width: "100%" }}
              >
                <div style={{ marginTop: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 12, padding: "14px 18px" }}>
                  <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "1rem", color: "#D97706", margin: 0 }}>
                    {word.italianTranslation}
                  </p>
                  {word.italianDefinition && (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", margin: "6px 0 0", fontStyle: "italic" }}>
                      {word.italianDefinition}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${animKey}-opts`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: SCREEN_MAX }}
        >
          {options.map((option, i) => (
            <motion.button
              key={option}
              data-testid={`option-${i}`}
              className="lumen-opt"
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: isAnswered && option !== correctAnswer && option !== selectedOption ? 0.24 : 1,
                y: 0,
                x: isAnswered && option === selectedOption && option !== correctAnswer ? [0, -7, 6, -4, 2, 0] : 0,
              }}
              transition={{
                delay: i * 0.06,
                duration: 0.25,
                ease: "easeOut",
                opacity: { duration: 0.3, delay: isAnswered ? 0 : i * 0.06 },
                x: { duration: 0.34, ease: [0.36, 0.07, 0.19, 0.97], delay: 0 },
              }}
              whileTap={isAnswered ? undefined : tapScale("card")}
              onClick={() => onSelect(option, option === correctAnswer)}
              disabled={isAnswered}
              style={{
                ...getOptionStyle(option, correctAnswer, selectedOption, isAnswered),
                position: "relative",
                overflow: "hidden",
                borderRadius: 12,
                padding: "15px 18px",
                cursor: isAnswered ? "default" : "pointer",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                fontSize: "0.88rem",
                color: "rgba(255,255,255,0.85)",
                textAlign: "left",
                transition: "border 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
                outline: "none",
                lineHeight: 1.4,
              }}
            >
              <span aria-hidden className="lumen-glow" />
              <span style={{ position: "relative" }}>{lowercaseFirst(option)}</span>
            </motion.button>
          ))}
        </motion.div>
      </AnimatePresence>

      <style>{`
        .lumen-glow {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.25s ease;
          background: radial-gradient(ellipse at 50% 130%, rgba(245,158,11,0.13), transparent 70%);
        }
        .lumen-opt:not(:disabled):hover .lumen-glow { opacity: 1; }
        .lumen-opt:not(:disabled):hover { border-color: rgba(217,119,6,0.38) !important; }
      `}</style>
    </>
  );
}
