import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation, useSearch } from "wouter";
import { BookOpen, Library, GraduationCap } from "lucide-react";
import AppBackground from "@/components/AppBackground";

// ─── Colour tokens per family ─────────────────────────────────────────────────
const FAMILY = {
  blue:  (a: number) => `rgba(125,211,252,${a})`,
  mauve: (a: number) => `rgba(167,139,250,${a})`,
};

type DeckId = "essential" | "advanced" | "gre";
type Difficulty = "easy" | "medium" | "hard";

const VALID_DECKS: DeckId[] = ["essential", "advanced", "gre"];

function deckColor(deck: DeckId) {
  return deck === "gre" ? FAMILY.mauve : FAMILY.blue;
}

const DECK_ICON_MAP: Record<DeckId, { Icon: React.FC<{ size?: number; strokeWidth?: number; color?: string }>; color: string; name: string }> = {
  essential: { Icon: BookOpen,      color: "rgba(125,211,252,0.9)",  name: "Essential English" },
  advanced:  { Icon: Library,       color: "rgba(125,211,252,0.9)",  name: "Advanced English"  },
  gre:       { Icon: GraduationCap, color: "rgba(167,139,250,0.95)", name: "GRE Vocabulary"    },
};

function DeckHeaderLabel({ deck }: { deck: DeckId }) {
  const { Icon, color, name } = DECK_ICON_MAP[deck];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <Icon size={13} strokeWidth={1.5} color={color} />
      <span>{name}</span>
    </div>
  );
}

function loadLastDifficulty(deck: DeckId): Difficulty | null {
  try {
    const v = localStorage.getItem(`verba_last_difficulty_${deck}`);
    if (v === "easy" || v === "medium" || v === "hard") return v;
    return null;
  } catch { return null; }
}

// ─── Difficulty dot indicator ─────────────────────────────────────────────────
function DotIndicator({ filled, color }: { filled: number; color: (a: number) => string }) {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: i < filled ? color(0.85) : color(0.15),
          }}
        />
      ))}
    </div>
  );
}

// ─── LAST tag ─────────────────────────────────────────────────────────────────
function LastTag() {
  return (
    <div style={{
      position: "absolute",
      top: 10,
      right: 10,
      background: "rgba(217,119,6,0.15)",
      border: "0.5px solid rgba(217,119,6,0.4)",
      color: "rgba(217,119,6,0.95)",
      fontSize: 7,
      fontWeight: 600,
      fontFamily: "'Inter', sans-serif",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      padding: "2px 6px",
      borderRadius: 4,
    }}>
      Last
    </div>
  );
}

// ─── Single difficulty card ───────────────────────────────────────────────────
interface DiffCardProps {
  label: string;
  description: string;
  filledDots: number;
  borderDefault: string;
  borderHover: string;
  color: (a: number) => string;
  difficulty: Difficulty;
  deck: DeckId;
  isLast?: boolean;
  visible?: boolean;
}

function DiffCard({
  label, description, filledDots,
  borderDefault, borderHover, color,
  difficulty, deck, isLast, visible = true,
}: DiffCardProps) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  function handleClick() {
    navigate(`/setup?deck=${deck}&difficulty=${difficulty}`);
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
        padding: 16,
        cursor: "pointer",
        userSelect: "none",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: "all 0.2s ease",
        position: "relative",
      }}
    >
      {isLast && <LastTag />}
      <DotIndicator filled={filledDots} color={color} />
      <p style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500,
        fontSize: 13,
        color: "#FFFFFF",
        margin: "10px 0 2px",
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 10,
        color: "rgba(255,255,255,0.5)",
        margin: 0,
      }}>
        {description}
      </p>
    </motion.div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DifficultyScreen() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const rawDeck = params.get("deck") ?? "";

  const isValid = VALID_DECKS.includes(rawDeck as DeckId);

  useEffect(() => {
    if (!isValid) { navigate("/decks"); }
  }, [isValid, navigate]);

  if (!isValid) return null;

  const deck = rawDeck as DeckId;
  const color = deckColor(deck);
  const lastDifficulty = loadLastDifficulty(deck);

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

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.08 }}
        style={{ position: "relative", zIndex: 10, padding: "20px 16px 48px" }}
      >
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          color: "rgba(255,255,255,0.5)",
          margin: "0 0 4px",
        }}>
          <DeckHeaderLabel deck={deck} />
        </div>

        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 500,
          fontSize: 20,
          color: "#FFFFFF",
          margin: "0 0 20px",
        }}>
          Choose difficulty
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <DiffCard
            label="Easy"
            description="Most common words"
            filledDots={1}
            borderDefault={color(0.25)}
            borderHover={color(0.55)}
            color={color}
            difficulty="easy"
            deck={deck}
            isLast={lastDifficulty === "easy"}
          />
          <DiffCard
            label="Medium"
            description="Mid-frequency"
            filledDots={2}
            borderDefault={color(0.5)}
            borderHover={color(0.75)}
            color={color}
            difficulty="medium"
            deck={deck}
            isLast={lastDifficulty === "medium"}
          />
          <DiffCard
            label="Hard"
            description="Rare and tricky"
            filledDots={3}
            borderDefault={color(0.75)}
            borderHover={color(1.0)}
            color={color}
            difficulty="hard"
            deck={deck}
            isLast={lastDifficulty === "hard"}
          />
        </div>
      </motion.div>
    </div>
  );
}
