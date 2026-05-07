import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import AppBackground from "@/components/AppBackground";

declare global {
  interface Window {
    twemoji?: { parse: (node: Node | string, options?: Record<string, unknown>) => string };
  }
}

// ─── Family palette tokens ────────────────────────────────────────────────────
const BLUE  = { label: "rgba(125,211,252,0.55)", border: "rgba(125,211,252,0.35)", hover: "rgba(125,211,252,0.7)"  };
const MAUVE = { label: "rgba(167,139,250,0.55)", border: "rgba(167,139,250,0.4)",  hover: "rgba(167,139,250,0.7)"  };
const GREY  = { label: "rgba(255,255,255,0.45)", border: "rgba(255,255,255,0.18)", hover: "rgba(255,255,255,0.4)"  };

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <p style={{
      fontFamily: "'Inter', sans-serif",
      fontWeight: 600,
      fontSize: 9,
      letterSpacing: "1.6px",
      color,
      textTransform: "uppercase",
      margin: "0 0 10px",
    }}>
      {label}
    </p>
  );
}

function AmberProgressBar({ value }: { value: number }) {
  return (
    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.25 }}
        style={{ height: "100%", background: "#D97706", borderRadius: 2 }}
      />
    </div>
  );
}

interface DeckCardProps {
  emoji: string;
  name: string;
  description: string;
  statsPrefix: string;
  masteredCount?: number;
  statsSuffix?: string;
  noMastered?: boolean;
  progress?: number;
  borderDefault: string;
  borderHover: string;
  deckId?: string;
  visible?: boolean;
}

function DeckCard({
  emoji, name, description,
  statsPrefix, masteredCount, statsSuffix, noMastered,
  progress, borderDefault, borderHover, deckId, visible = true,
}: DeckCardProps) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  function handleClick() {
    if (deckId) navigate(`/difficulty?deck=${deckId}`);
    else navigate("/setup");
  }

  return (
    <motion.div
      onClick={handleClick}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border: `0.5px solid ${hovered ? borderHover : borderDefault}`,
        borderRadius: 12,
        padding: 14,
        cursor: "pointer",
        userSelect: "none",
        transform: hovered ? "scale(1.03)" : "scale(1)",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 8, lineHeight: 1 }}>{emoji}</div>

      <p style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500,
        fontSize: 13,
        color: "#FFFFFF",
        margin: "0 0 3px",
      }}>
        {name}
      </p>

      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        color: "rgba(255,255,255,0.5)",
        margin: "0 0 6px",
        lineHeight: 1.4,
      }}>
        {description}
      </p>

      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        color: "rgba(255,255,255,0.45)",
        margin: 0,
        lineHeight: 1.4,
      }}>
        {noMastered ? (
          statsPrefix
        ) : (
          <>
            {statsPrefix}
            <span style={{ color: "rgba(217,119,6,0.85)" }}>{masteredCount}</span>
            {statsSuffix}
          </>
        )}
      </p>

      {progress !== undefined && <AmberProgressBar value={progress} />}
    </motion.div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DeckSelectionScreen() {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (window.twemoji) window.twemoji.parse(document.body);
  }, []);

  return (
    <div style={{
      minHeight: "100dvh",
      width: "100%",
      background: "#0A0A0A",
      position: "relative",
      overflowX: "hidden",
    }}>
      <AppBackground showWords={false} />

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px 16px 0",
      }}>
        <button
          onClick={() => window.history.back()}
          style={{
            position: "absolute",
            left: 16,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            fontSize: 22,
            color: "rgba(255,255,255,0.55)",
            padding: "2px 6px",
            lineHeight: 1,
            outline: "none",
          }}
          aria-label="Go back"
        >
          ‹
        </button>

        <button
          onClick={() => navigate("/")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            fontStyle: "italic",
            fontSize: 12,
            fontWeight: 400,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "0.04em",
            outline: "none",
          }}
        >
          Verba
        </button>
      </div>

      {/* ── Page title ───────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 10, padding: "20px 16px 0" }}>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500,
          fontSize: 20,
          color: "#FFFFFF",
          margin: "0 0 4px",
        }}>
          Choose a deck
        </h1>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          margin: 0,
        }}>
          Pick what you want to study today
        </p>
      </div>

      {/* ── Sections ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
        style={{
          position: "relative",
          zIndex: 10,
          padding: "24px 16px 48px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {/* FOUNDATIONS */}
        <div>
          <SectionHeader label="Foundations" color={BLUE.label} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <DeckCard
              emoji="📖"
              name="Essential English"
              description="Words you need to know"
              statsPrefix="1000 words · "
              masteredCount={0}
              statsSuffix=" mastered"
              progress={0}
              borderDefault={BLUE.border}
              borderHover={BLUE.hover}
              deckId="essential"
            />
            <DeckCard
              emoji="📚"
              name="Advanced English"
              description="Read newspapers and books fluently"
              statsPrefix="1000 words · "
              masteredCount={0}
              statsSuffix=" mastered"
              progress={0}
              borderDefault={BLUE.border}
              borderHover={BLUE.hover}
              deckId="advanced"
            />
          </div>
        </div>

        {/* TEST PREP */}
        <div>
          <SectionHeader label="Test Prep" color={MAUVE.label} />
          <DeckCard
            emoji="🎓"
            name="GRE Vocabulary"
            description="Advanced words for the GRE exam"
            statsPrefix="800 words · "
            masteredCount={245}
            statsSuffix=" mastered"
            progress={30}
            borderDefault={MAUVE.border}
            borderHover={MAUVE.hover}
            deckId="gre"
          />
        </div>

        {/* PERSONAL */}
        <div>
          <SectionHeader label="Personal" color={GREY.label} />
          <DeckCard
            emoji="⭐"
            name="My Verba"
            description="Words you've saved or added"
            statsPrefix="12 saved"
            noMastered
            borderDefault={GREY.border}
            borderHover={GREY.hover}
          />
        </div>
      </motion.div>
    </div>
  );
}
