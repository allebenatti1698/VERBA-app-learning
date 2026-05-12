import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { BookOpen, Library, GraduationCap, Star } from "lucide-react";
import { getDifficultyLabel } from "@/lib/difficultyLabel";
import AppBackground from "@/components/AppBackground";

// ─── Family palette tokens ────────────────────────────────────────────────────
const BLUE  = { label: "rgba(125,211,252,0.55)", border: "rgba(125,211,252,0.35)", hover: "rgba(125,211,252,0.7)"  };
const MAUVE = { label: "rgba(167,139,250,0.55)", border: "rgba(167,139,250,0.4)",  hover: "rgba(167,139,250,0.7)"  };
const GREY  = { label: "rgba(255,255,255,0.45)", border: "rgba(255,255,255,0.18)", hover: "rgba(255,255,255,0.4)"  };

// ─── Icon system ──────────────────────────────────────────────────────────────
type KnownDeckId = "essential" | "advanced" | "gre" | "myverba";

const DECK_META: Record<KnownDeckId, { Icon: React.FC<{ size?: number; strokeWidth?: number; color?: string }>; color: string; name: string }> = {
  essential: { Icon: BookOpen,       color: "rgba(125,211,252,0.9)",  name: "Essential English" },
  advanced:  { Icon: Library,        color: "rgba(125,211,252,0.9)",  name: "Advanced English"  },
  gre:       { Icon: GraduationCap,  color: "rgba(167,139,250,0.95)", name: "GRE Vocabulary"    },
  myverba:   { Icon: Star,           color: "rgba(255,255,255,0.85)", name: "My Verba"          },
};

function getDeckMeta(deckId: string | null) {
  if (deckId && deckId in DECK_META) return DECK_META[deckId as KnownDeckId];
  return { Icon: BookOpen, color: "rgba(125,211,252,0.9)", name: "Vocabulary" };
}

function DeckIcon({ deckId, size = 20 }: { deckId: string | null; size?: number }) {
  const { Icon, color } = getDeckMeta(deckId);
  return <Icon size={size} strokeWidth={1.5} color={color} />;
}

function deckDisplayName(deckId: string | null): string {
  return getDeckMeta(deckId).name;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
interface LastSession {
  deck: string | null;
  difficulty: string | null;
  wordCount: number;
  completedAt: string;
}

function loadLastSession(): LastSession | null {
  try {
    const raw = localStorage.getItem("verba_last_session");
    if (!raw) return null;
    const s: LastSession = JSON.parse(raw);
    const age = Date.now() - new Date(s.completedAt).getTime();
    if (age > 7 * 24 * 60 * 60 * 1000) return null;
    return s;
  } catch { return null; }
}

function loadMyVerba(): string[] {
  try {
    const raw = localStorage.getItem("verba_my_verba");
    if (!raw) {
      localStorage.setItem("verba_my_verba", JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw) as string[];
  } catch { return []; }
}

function relativeTime(completedAt: string): string {
  const diffMs = Date.now() - new Date(completedAt).getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
}

// ─── Continue / Last session card ─────────────────────────────────────────────
function ContinueCard({ session }: { session: LastSession }) {
  const [, navigate] = useLocation();
  const [btnHovered, setBtnHovered] = useState(false);

  const isMyVerba = session.deck === "myverba";
  const name = deckDisplayName(session.deck);
  const diffLabel = !isMyVerba && session.difficulty && session.deck
    ? ` · ${getDifficultyLabel(session.difficulty, session.deck)}`
    : "";

  function resume() {
    navigate(`/quiz?words=${session.wordCount}&deck=${session.deck}&difficulty=${session.difficulty ?? ""}`);
  }

  return (
    <div style={{
      background: "rgba(217,119,6,0.08)",
      border: "0.5px solid rgba(217,119,6,0.5)",
      borderRadius: 14,
      padding: "14px 16px",
      marginBottom: 22,
    }}>
      <p style={{
        fontFamily: "'Inter', sans-serif",
        color: "rgba(217,119,6,0.85)",
        fontSize: 8,
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        fontWeight: 600,
        margin: "0 0 6px",
      }}>
        Last session
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 2,
          }}>
            <DeckIcon deckId={session.deck} size={14} />
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color: "#FFFFFF",
              margin: 0,
            }}>
              {name}{diffLabel}
            </p>
          </div>
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 9,
            color: "rgba(255,255,255,0.55)",
            margin: 0,
          }}>
            {session.wordCount} words · {relativeTime(session.completedAt)}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={resume}
          onMouseEnter={() => setBtnHovered(true)}
          onMouseLeave={() => setBtnHovered(false)}
          style={{
            background: "linear-gradient(90deg, #D97706 0%, #F59E0B 100%)",
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: 500,
            padding: "6px 14px",
            borderRadius: 14,
            border: "none",
            cursor: "pointer",
            outline: "none",
            whiteSpace: "nowrap",
            transform: btnHovered ? "scale(1.05)" : "scale(1)",
            transition: "transform 0.2s ease",
          }}
        >
          Quick start →
        </motion.button>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
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

// ─── Progress bar ─────────────────────────────────────────────────────────────
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

// ─── Deck card ────────────────────────────────────────────────────────────────
interface DeckCardProps {
  deckId: KnownDeckId;
  name: string;
  description: string;
  statsPrefix: string;
  masteredCount?: number;
  statsSuffix?: string;
  noMastered?: boolean;
  progress?: number;
  borderDefault: string;
  borderHover: string;
  isEmpty?: boolean;
  onEmptyClick?: () => void;
  visible?: boolean;
}

function DeckCard({
  deckId, name, description,
  statsPrefix, masteredCount, statsSuffix, noMastered,
  progress, borderDefault, borderHover,
  isEmpty, onEmptyClick, visible = true,
}: DeckCardProps) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);

  if (!visible) return null;

  function handleClick() {
    if (isEmpty && onEmptyClick) { onEmptyClick(); return; }
    if (deckId !== "myverba") navigate(`/difficulty?deck=${deckId}`);
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
        opacity: isEmpty ? 0.6 : 1,
      }}
    >
      <div style={{ marginBottom: 8, lineHeight: 1 }}>
        <DeckIcon deckId={deckId} size={20} />
      </div>

      <p style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500,
        fontSize: 13,
        color: "#FFFFFF",
        margin: "0 0 3px",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}>
        {name}
        {isEmpty && (
          <span style={{
            fontSize: 11,
            opacity: 0.5,
            cursor: "pointer",
            marginLeft: 2,
          }} title="Your collection is empty">ⓘ</span>
        )}
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
        {isEmpty ? (
          "Your collection is empty"
        ) : noMastered ? (
          statsPrefix
        ) : (
          <>
            {statsPrefix}
            <span style={{ color: "rgba(217,119,6,0.85)" }}>{masteredCount}</span>
            {statsSuffix}
          </>
        )}
      </p>

      {progress !== undefined && !isEmpty && <AmberProgressBar value={progress} />}
    </motion.div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DeckSelectionScreen() {
  const [, navigate] = useLocation();
  const [lastSession] = useState<LastSession | null>(loadLastSession);
  const [myVerba] = useState<string[]>(loadMyVerba);
  const [showEmptyToast, setShowEmptyToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myVerbaEmpty = myVerba.length === 0;

  function handleMyVerbaEmptyClick() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setShowEmptyToast(true);
    toastTimer.current = setTimeout(() => setShowEmptyToast(false), 3000);
  }

  return (
    <>
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
          {/* LAST SESSION card — only when within 7 days */}
          {lastSession && <ContinueCard session={lastSession} />}

          {/* FOUNDATIONS */}
          <div>
            <SectionHeader label="Foundations" color={BLUE.label} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <DeckCard
                deckId="essential"
                name="Essential English"
                description="Words you need to know"
                statsPrefix="1000 words · "
                masteredCount={0}
                statsSuffix=" mastered"
                progress={0}
                borderDefault={BLUE.border}
                borderHover={BLUE.hover}
              />
              <DeckCard
                deckId="advanced"
                name="Advanced English"
                description="Read newspapers and books fluently"
                statsPrefix="1000 words · "
                masteredCount={0}
                statsSuffix=" mastered"
                progress={0}
                borderDefault={BLUE.border}
                borderHover={BLUE.hover}
              />
            </div>
          </div>

          {/* TEST PREP */}
          <div>
            <SectionHeader label="Test Prep" color={MAUVE.label} />
            <DeckCard
              deckId="gre"
              name="GRE Vocabulary"
              description="Advanced words for the GRE exam"
              statsPrefix="800 words · "
              // TODO: Replace with real count from DB after Fase 2 (auth)
              masteredCount={0}
              statsSuffix=" mastered"
              // TODO: Calculate dynamically as (masteredCount / 800) * 100 after Fase 2 (auth)
              progress={0}
              borderDefault={MAUVE.border}
              borderHover={MAUVE.hover}
            />
          </div>

          {/* PERSONAL */}
          <div>
            <SectionHeader label="Personal" color={GREY.label} />
            <DeckCard
              deckId="myverba"
              name="My Verba"
              description="Words you've saved or added"
              statsPrefix="12 saved"
              noMastered
              borderDefault={GREY.border}
              borderHover={GREY.hover}
              isEmpty={myVerbaEmpty}
              onEmptyClick={handleMyVerbaEmptyClick}
            />
          </div>
        </motion.div>
      </div>

      {/* Empty My Verba toast */}
      {createPortal(
        <AnimatePresence>
          {showEmptyToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              data-testid="toast-empty-myverba"
              style={{
                position: "fixed",
                bottom: 20,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(217,119,6,0.15)",
                border: "0.5px solid rgba(217,119,6,0.4)",
                color: "rgba(255,255,255,0.9)",
                padding: "10px 16px",
                borderRadius: 12,
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                maxWidth: 320,
                textAlign: "center",
                zIndex: 300,
                pointerEvents: "none",
                boxSizing: "border-box",
              }}
            >
              Save words from quizzes by tapping the ⭐ next to them
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
