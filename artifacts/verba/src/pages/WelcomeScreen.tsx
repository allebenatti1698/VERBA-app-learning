import { motion } from "framer-motion";
import { useState } from "react";

// TODO: Replace with dynamic list of user's recently missed words from database (Step 4)
const FLOATING_WORDS = [
  // Higher opacity (~0.5) — feel "closer"
  { word: "luminous",    x: "70%",  y: "7%",  delay: 0.6,  opacity: 0.5,  fontSize: "0.82rem" },
  { word: "ephemeral",   x: "4%",   y: "22%", delay: 0.8,  opacity: 0.48, fontSize: "0.8rem"  },
  { word: "cogent",      x: "75%",  y: "44%", delay: 1.0,  opacity: 0.5,  fontSize: "0.82rem" },

  // Medium opacity (~0.3) — standard depth
  { word: "liminal",     x: "2%",   y: "50%", delay: 0.7,  opacity: 0.3,  fontSize: "0.75rem" },
  { word: "reverie",     x: "66%",  y: "74%", delay: 0.9,  opacity: 0.32, fontSize: "0.77rem" },
  { word: "querulous",   x: "14%",  y: "10%", delay: 1.2,  opacity: 0.28, fontSize: "0.73rem" },
  { word: "sanguine",    x: "58%",  y: "90%", delay: 1.3,  opacity: 0.3,  fontSize: "0.75rem" },

  // Lower opacity (~0.15) — feel "further away"
  { word: "ineffable",   x: "6%",   y: "80%", delay: 1.1,  opacity: 0.16, fontSize: "0.68rem" },
  { word: "tenuous",     x: "80%",  y: "62%", delay: 0.5,  opacity: 0.15, fontSize: "0.67rem" },
  { word: "obsequious",  x: "18%",  y: "90%", delay: 1.4,  opacity: 0.14, fontSize: "0.66rem" },
];

function FloatingWord({
  word,
  x,
  y,
  delay,
  opacity,
  fontSize,
}: {
  word: string;
  x: string;
  y: string;
  delay: number;
  opacity: number;
  fontSize: string;
}) {
  return (
    <motion.span
      data-testid={`floating-word-${word}`}
      className="absolute select-none pointer-events-none"
      style={{
        left: x,
        top: y,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 300,
        fontSize,
        letterSpacing: "0.13em",
        color: "#D97706",
        textShadow: "0 0 10px rgba(217, 119, 6, 0.55), 0 0 22px rgba(217, 119, 6, 0.25)",
        whiteSpace: "nowrap",
      }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, opacity, opacity * 0.75, opacity],
        y: [0, -5, 0, 5, 0],
      }}
      transition={{
        delay,
        duration: 9,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.25, 0.5, 0.75, 1],
      }}
    >
      {word}
    </motion.span>
  );
}

function LogoMark() {
  return (
    <motion.div
      data-testid="logo-mark"
      className="relative flex items-center justify-center"
      style={{ width: 40, height: 40 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.div
        className="absolute inset-0"
        animate={{
          boxShadow: [
            "0 0 18px 8px rgba(217, 119, 6, 0.18)",
            "0 0 32px 14px rgba(217, 119, 6, 0.32)",
            "0 0 18px 8px rgba(217, 119, 6, 0.18)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ borderRadius: "50%" }}
      />
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1px solid rgba(217, 119, 6, 0.7)",
          background: "rgba(217, 119, 6, 0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="15" height="11" viewBox="0 0 22 16" fill="none">
          <path
            d="M1 1L11 15L21 1"
            stroke="#D97706"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </motion.div>
  );
}

function VerbaTitle() {
  return (
    <motion.h1
      data-testid="title-verba"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: "clamp(72px, 18vw, 108px)",
        lineHeight: 1,
        background: "linear-gradient(120deg, #C17B1A 0%, #D97706 25%, #FFF8F0 50%, #D97706 75%, #C17B1A 100%)",
        backgroundSize: "300% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        color: "transparent",
        letterSpacing: "-0.02em",
        margin: 0,
        padding: 0,
        animation: "title-shimmer 4.5s ease-in-out infinite",
      }}
    >
      Verba
    </motion.h1>
  );
}

function Tagline() {
  return (
    <motion.p
      data-testid="tagline"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.25 }}
      style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 300,
        fontSize: "0.95rem",
        letterSpacing: "0.22em",
        color: "rgba(255,255,255,0.55)",
        margin: 0,
        padding: 0,
        textTransform: "lowercase",
      }}
    >
      words that stick
    </motion.p>
  );
}

function StartButton() {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.4 }}
      style={{ width: "100%" }}
    >
      <motion.button
        data-testid="button-start"
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        animate={{
          scale: isPressed ? 0.95 : 1,
          boxShadow: isPressed
            ? "0 0 20px 4px rgba(245, 158, 11, 0.3)"
            : [
                "0 0 20px 4px rgba(245, 158, 11, 0.4)",
                "0 0 36px 10px rgba(245, 158, 11, 0.6)",
                "0 0 20px 4px rgba(245, 158, 11, 0.4)",
              ],
        }}
        transition={
          isPressed
            ? { duration: 0.1, ease: "easeOut" }
            : {
                boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 0.1 },
              }
        }
        style={{
          width: "100%",
          padding: "18px 0",
          borderRadius: 9999,
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(90deg, #F59E0B 0%, #EA580C 100%)",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 400,
          fontSize: "1.1rem",
          letterSpacing: "0.04em",
          color: "#FFFFFF",
          outline: "none",
        }}
      >
        Start
      </motion.button>
    </motion.div>
  );
}

function BackgroundHalos() {
  return (
    <>
      <motion.div
        aria-hidden
        animate={{ opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "70vw",
          height: "55vh",
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(217, 119, 6, 0.28) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "70vw",
          height: "55vh",
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(217, 119, 6, 0.24) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
    </>
  );
}

export default function WelcomeScreen() {
  return (
    <div
      data-testid="welcome-screen"
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "#0A0A0A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <BackgroundHalos />

      {FLOATING_WORDS.map((fw) => (
        <FloatingWord key={fw.word} {...fw} />
      ))}

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          width: "min(420px, 88vw)",
          padding: "0 0 8px",
        }}
      >
        <LogoMark />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            marginTop: "4px",
          }}
        >
          <VerbaTitle />
          <Tagline />
        </div>

        <div style={{ height: "28px" }} />

        <StartButton />
      </div>
    </div>
  );
}
