import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import AppBackground from "@/components/AppBackground";

function LogoMark() {
  return (
    <motion.div
      data-testid="logo-mark"
      data-roam-exclude
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: "transparent",
        border: "1.5px solid #D97706",
        boxShadow: "0 0 40px 8px rgba(217, 119, 6, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 300,
          fontSize: "36px",
          color: "#D97706",
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        V
      </span>
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
  const [, setLocation] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.4 }}
      style={{ width: "100%" }}
    >
      <motion.button
        data-testid="button-start"
        onClick={() => setLocation("/study")}
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
      <AppBackground />

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
