import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import AppBackground from "@/components/AppBackground";

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
  const [wordCount, setWordCount] = useState(10);

  function handleBegin() {
    setLocation(`/quiz?words=${wordCount}`);
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

      {/* Back arrow */}
      <motion.button
        data-testid="button-back"
        onClick={() => window.history.back()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute",
          top: 28,
          left: 24,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(255,255,255,0.45)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 300,
          fontSize: "0.85rem",
          letterSpacing: "0.04em",
          padding: "8px 4px",
          zIndex: 20,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </motion.button>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          width: "min(440px, 90vw)",
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
          style={cardStyle}
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
              max={50}
              step={5}
              value={wordCount}
              onChange={(e) => setWordCount(Number(e.target.value))}
              style={{
                width: "100%",
                height: 4,
                appearance: "none",
                WebkitAppearance: "none",
                background: `linear-gradient(to right, #D97706 0%, #F59E0B ${((wordCount - 5) / 45) * 100}%, rgba(255,255,255,0.1) ${((wordCount - 5) / 45) * 100}%, rgba(255,255,255,0.1) 100%)`,
                borderRadius: 2,
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }}>5</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }}>50</span>
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
