import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Star } from "lucide-react";
import AppBackground from "@/components/AppBackground";

type MasteredWord = {
  id: string | number;
  word: string;
  retries: number;
};

function loadMyWords(): Set<string> {
  try {
    const raw = localStorage.getItem("verba_my_words");
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveMyWords(set: Set<string>) {
  try {
    localStorage.setItem("verba_my_words", JSON.stringify([...set]));
  } catch { /* storage unavailable */ }
}

export default function ReviewCompleteScreen() {
  const [, navigate] = useLocation();
  const [words, setWords] = useState<MasteredWord[]>([]);
  const [myWords, setMyWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("verbaReviewMastered");
      if (raw) setWords(JSON.parse(raw) as MasteredWord[]);
    } catch { /* ignore */ }
    setMyWords(loadMyWords());
  }, []);

  function toggleStar(word: string, e: React.MouseEvent) {
    e.stopPropagation();
    setMyWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      saveMyWords(next);
      return next;
    });
  }

  return (
    <div style={{ minHeight: "100dvh", width: "100%", background: "#0A0A0A", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <AppBackground showWords={false} />

      {/* Soft amber radial orb */}
      <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,6,0.12) 0%, transparent 70%)", pointerEvents: "none", zIndex: 1 }} />

      {/* Top content — vertically centred in remaining space */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", maxWidth: 440, padding: "48px 24px 0", boxSizing: "border-box" }}
      >
        {/* Check circle */}
        <div style={{ width: 50, height: 50, borderRadius: "50%", border: "0.5px solid rgba(217,119,6,0.6)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Title */}
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 22, color: "#FFFFFF", margin: "0 0 6px", textAlign: "center" }}>
          Review complete
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 0 28px", textAlign: "center" }}>
          All {words.length} word{words.length !== 1 ? "s" : ""} mastered
        </p>

        {/* Word list */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, padding: "0 6px", boxSizing: "border-box" }}>
          {words.map((item, idx) => {
            const starred = myWords.has(item.word);
            return (
              <motion.div
                key={String(item.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.25, ease: "easeOut" }}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                {/* Number */}
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 10, letterSpacing: "0.12em", color: "#BA7517", width: 18, flexShrink: 0, textAlign: "right" }}>
                  {String(idx + 1).padStart(2, "0")}
                </span>

                {/* Word */}
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, color: "#C7B8E8", letterSpacing: "-0.2px", flex: 1 }}>
                  {item.word}
                </span>

                {/* Star */}
                <button
                  onClick={(e) => toggleStar(item.word, e)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", color: starred ? "#D97706" : "rgba(255,255,255,0.3)", transition: "color 0.15s ease", outline: "none", flexShrink: 0 }}
                  aria-label={starred ? "Remove from My Words" : "Add to My Words"}
                >
                  <Star size={14} fill={starred ? "#D97706" : "none"} stroke={starred ? "#D97706" : "currentColor"} />
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Continue button — anchored to bottom */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "center", padding: "20px 24px", paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)", boxSizing: "border-box" }}>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/results")}
          style={{ width: 280, padding: "12px 32px", borderRadius: 9999, border: "none", background: "linear-gradient(to right, #B45309, #C2410C)", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14, color: "#FFFFFF", cursor: "pointer", outline: "none", letterSpacing: "0.02em", boxShadow: "0 0 12px rgba(217,119,6,0.25)", margin: "0 auto" }}
        >
          Continue →
        </motion.button>
      </div>
    </div>
  );
}
