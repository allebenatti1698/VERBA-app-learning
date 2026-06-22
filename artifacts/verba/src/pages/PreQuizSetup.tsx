import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, useSearch } from "wouter";
import AppBackground from "@/components/AppBackground";
import ScreenColumn, { SCREEN_MAX } from "@/components/ScreenColumn";
import { parseSetsParam, getWordIdsForSelection } from "@/lib/studySets";

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(217,119,6,0.25)",
  borderRadius: 16,
  padding: "24px 28px",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
};

export default function PreQuizSetup() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const deck = params.get("deck") ?? null;
  const difficulty = params.get("difficulty") ?? null;
  const setsParam = params.get("sets") ?? null;
  const deckBorder =
    deck === "gre" ? "rgba(199,184,232,0.55)" :
    deck === "essential" || deck === "advanced" ? "rgba(125,211,252,0.5)" :
    deck === "myverba" ? "rgba(255,255,255,0.4)" :
    "rgba(255,255,255,0.3)";
  const deckHalo =
    deck === "gre" ? "rgba(167,139,250,0.16)" :
    deck === "essential" || deck === "advanced" ? "rgba(125,211,252,0.14)" :
    "transparent";
  const [wordCount, setWordCount] = useState(10);

  const [maxWords, setMaxWords] = useState(50);
  useEffect(() => {
    const selection = parseSetsParam(setsParam);
    if (Object.keys(selection).length === 0) { setMaxWords(50); return; }
    let active = true;
    getWordIdsForSelection(deck || "gre", selection)
      .then((ids) => { if (active) setMaxWords(Math.max(5, ids.length)); })
      .catch(() => { if (active) setMaxWords(50); });
    return () => { active = false; };
  }, [setsParam, deck]);
  const sliderMax = Math.min(50, maxWords);
  useEffect(() => { setWordCount((w) => Math.min(w, sliderMax)); }, [sliderMax]);

  function handleBegin() {
    const finalWords = Math.min(wordCount, maxWords);
    const queryParts = [`words=${finalWords}`];
    if (deck) queryParts.push(`deck=${deck}`);
    if (setsParam) queryParts.push(`sets=${setsParam}`);
    else if (difficulty) queryParts.push(`difficulty=${difficulty}`);
    setLocation(`/quiz?${queryParts.join("&")}`);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "#0A0A0A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <AppBackground />

      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 360, height: 260, background: `radial-gradient(ellipse, ${deckHalo}, transparent 70%)`, pointerEvents: "none", zIndex: 1 }} />

      {/* Header — back + wordmark, dentro la colonna 640 (come Difficulty) */}
      <ScreenColumn style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, padding: "18px 16px 0" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button
            onClick={() => window.history.back()}
            style={{ position: "absolute", left: 16, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 22, color: "rgba(245,158,11,0.8)", padding: "2px 6px", lineHeight: 1, outline: "none" }}
            aria-label="Go back"
          >
            ‹
          </button>
          <button
            onClick={() => setLocation("/")}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontStyle: "italic", fontSize: 12, fontWeight: 400, color: "rgba(245,158,11,0.8)", letterSpacing: "0.04em", outline: "none" }}
          >
            Verba
          </button>
        </div>
      </ScreenColumn>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          width: `min(${SCREEN_MAX}px, 90vw)`,
        }}
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ marginBottom: 8 }}
        >
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 7vw, 36px)",
              color: "#FFFFFF",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            Set up your session
          </h1>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.4)",
              marginTop: 10,
              letterSpacing: "0.02em",
            }}
          >
            Choose how many words to practice
          </p>
        </motion.div>

        {/* Words slider card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
          style={{ ...cardStyle, border: `1px solid ${deckBorder}` }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.02em",
              }}
            >
              Words per session
            </span>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                fontSize: "1.5rem",
                background: "linear-gradient(to right, #D97706, #F5DEB3, #FFFFFF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {wordCount}
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <input
              data-testid="slider-words"
              type="range"
              min={5}
              max={sliderMax}
              step={5}
              value={wordCount}
              onChange={(e) => setWordCount(Number(e.target.value))}
              style={{
                width: "100%",
                height: 4,
                appearance: "none",
                WebkitAppearance: "none",
                background: `linear-gradient(to right, #D97706 0%, #F59E0B ${((wordCount - 5) / Math.max(1, sliderMax - 5)) * 100}%, rgba(255,255,255,0.1) ${((wordCount - 5) / Math.max(1, sliderMax - 5)) * 100}%, rgba(255,255,255,0.1) 100%)`,
                borderRadius: 2,
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }}>5</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }}>{sliderMax}</span>
          </div>
        </motion.div>

        {/* Begin button */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.25 }}
          style={{ marginTop: 8 }}
        >
          <motion.button
            data-testid="button-begin"
            onClick={handleBegin}
            whileTap={{ scale: 0.96 }}
            style={{
              width: "100%",
              padding: "18px 0",
              borderRadius: 9999,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(90deg, #F59E0B 0%, #EA580C 100%)",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "1.05rem",
              letterSpacing: "0.04em",
              color: "#FFFFFF",
              outline: "none",
              boxShadow: "0 0 24px 4px rgba(245,158,11,0.35)",
            }}
          >
            Begin
          </motion.button>
        </motion.div>
      </div>

      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #F59E0B;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(245,158,11,0.6);
        }
        input[type='range']::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #F59E0B;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 8px rgba(245,158,11,0.6);
        }
      `}</style>
    </div>
  );
}
