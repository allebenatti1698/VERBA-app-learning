import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Clock, Flame, BookOpen, Star } from "lucide-react";
import AppBackground from "@/components/AppBackground";
import FeedbackCard from "@/components/FeedbackCard";

// TODO: Replace `visible={true}` with user preferences from settings (Step 8)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MissedWord {
  id: number;
  word: string;
  phonetic: string;
  correctDefinition: string;
  distractors: string[];
  exampleSentence: string;
  synonyms: string[];
  antonyms: string[];
  etymology: string;
  italianTranslation: string;
  italianDefinition: string;
  selectedAnswer: string;
  allDefinitions?: {
    part_of_speech: string;
    definition: string;
    example: string;
    display_order: number;
  }[];
}

export interface SessionResult {
  correct: number;
  total: number;
  missedWords: MissedWord[];
  elapsedMs: number;
  wordCount: number;
  deck?: string | null;
  difficulty?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function getMotivationalTitle(pct: number): string {
  if (pct >= 90) return "Outstanding!";
  if (pct >= 70) return "Great work";
  if (pct >= 50) return "Keep going";
  return "Every word counts";
}

function useCountUp(target: number, duration: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, active]);
  return value;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

function Confetti() {
  const particles = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 300,
      y: -(80 + Math.random() * 200),
      rotate: Math.random() * 720 - 360,
      color: ["#D97706", "#F59E0B", "#FFFFFF", "#84A98C", "#FCD34D"][Math.floor(Math.random() * 5)],
      size: 4 + Math.random() * 6,
      delay: Math.random() * 0.5,
    }))
  ).current;

  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", pointerEvents: "none", zIndex: 5 }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.5 }}
          transition={{ duration: 1.8, delay: p.delay, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface HeroScoreProps {
  correct: number;
  total: number;
  visible?: boolean;
}
function HeroScore({ correct, total, visible = true }: HeroScoreProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const pct = Math.round((correct / total) * 100);
  const isPerfect = correct === total;
  const countedCorrect = useCountUp(correct, 1500, mounted);
  const title = getMotivationalTitle(pct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: visible ? 1 : 0, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 24px 40px",
        position: "relative",
        textAlign: "center",
      }}
    >
      {isPerfect && (
        <>
          <Confetti />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.1, 0] }}
            transition={{ duration: 3, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(132,169,140,0.1), rgba(139,92,246,0.1))",
              borderRadius: 0,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* Motivational title */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: 18,
          letterSpacing: "0.05em",
          color: "#D97706",
          margin: "0 0 24px",
        }}
      >
        {title}
      </motion.p>

      {/* Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(64px, 18vw, 96px)",
          lineHeight: 1,
          background: "linear-gradient(120deg, #C17B1A 0%, #D97706 25%, #FFF8F0 50%, #D97706 75%, #C17B1A 100%)",
          backgroundSize: "300% 100%",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "title-shimmer 4.5s ease-in-out infinite",
        }}
      >
        {countedCorrect} / {total}
      </motion.div>

      {/* Percentage */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 400,
          fontSize: 24,
          color: "rgba(255,255,255,0.7)",
          margin: "16px 0 0",
        }}
      >
        {pct}% accuracy
      </motion.p>
    </motion.div>
  );
}

interface QuickStatsProps {
  elapsedMs: number;
  visible?: boolean;
}
function QuickStats({ elapsedMs, visible = true }: QuickStatsProps) {
  // TODO: Replace with real streak from database (Step 7)
  const streak = 7;
  // TODO: Replace with real count from database (Step 7)
  const mastered = 47;

  const streakIconColor =
    streak >= 365 ? "url(#streakGrad)"
    : streak >= 90 ? "#EA580C"
    : streak >= 30 ? "#F59E0B"
    : streak >= 7  ? "#FBBF24"
    : "#FFFFFF";

  if (!visible) return null;

  const cards = [
    {
      icon: <Clock size={18} color="#3B82F6" />,
      label: "TIME",
      labelColor: "rgba(59,130,246,0.7)",
      border: "1px solid rgba(59,130,246,0.2)",
      glow: "rgba(59,130,246,0.08)",
      value: formatTime(elapsedMs),
    },
    {
      icon: (
        <>
          <svg width="0" height="0">
            <defs>
              <linearGradient id="streakGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
            </defs>
          </svg>
          <Flame size={18} color={streakIconColor} />
        </>
      ),
      label: "STREAK",
      labelColor: "rgba(217,119,6,0.7)",
      border: "1px solid rgba(217,119,6,0.2)",
      glow: "rgba(217,119,6,0.08)",
      value: `${streak} days`,
    },
    {
      icon: <BookOpen size={18} color="#10B981" />,
      label: "MASTERED",
      labelColor: "rgba(16,185,129,0.7)",
      border: "1px solid rgba(16,185,129,0.2)",
      glow: "rgba(16,185,129,0.08)",
      value: `${mastered} words`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      style={{
        display: "flex",
        gap: 10,
        padding: "0 20px",
        maxWidth: 480,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            flex: 1,
            padding: 16,
            borderRadius: 12,
            border: card.border,
            background: `rgba(0,0,0,0.4)`,
            boxShadow: `inset 0 0 24px ${card.glow}`,
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          {card.icon}
          <p style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: card.labelColor,
            margin: 0,
          }}>
            {card.label}
          </p>
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 20,
            color: "#FFFFFF",
            margin: 0,
            textAlign: "center",
            lineHeight: 1.2,
          }}>
            {card.value}
          </p>
        </div>
      ))}
    </motion.div>
  );
}

interface ActionButtonsProps {
  wordCount: number;
  visible?: boolean;
}
function ActionButtons({ wordCount, visible = true }: ActionButtonsProps) {
  const [, navigate] = useLocation();
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65, duration: 0.4 }}
      style={{
        display: "flex",
        gap: 12,
        padding: "24px 20px 0",
        maxWidth: 480,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Try again */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(`/quiz?words=${wordCount}`)}
        style={{
          flex: 1,
          padding: "14px 0",
          borderRadius: 9999,
          border: "1px solid rgba(217,119,6,0.5)",
          background: "transparent",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: 15,
          color: "#FFFFFF",
          cursor: "pointer",
          outline: "none",
          letterSpacing: "0.02em",
        }}
      >
        Try again
      </motion.button>

      {/* New session */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate("/decks")}
        style={{
          flex: 1,
          padding: "14px 0",
          borderRadius: 9999,
          border: "none",
          background: "linear-gradient(to right, #B45309, #C2410C)",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          fontSize: 15,
          color: "#FFFFFF",
          cursor: "pointer",
          outline: "none",
          letterSpacing: "0.02em",
          boxShadow: "0 0 12px rgba(217,119,6,0.25)",
        }}
      >
        New session
      </motion.button>
    </motion.div>
  );
}

interface MissedWordsListProps {
  missedWords: MissedWord[];
  visible?: boolean;
}
function MissedWordsList({ missedWords, visible = true }: MissedWordsListProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TODO: Migrate to user database (Step 7). My Words syncs across devices and drives spaced repetition.
  const [myWords, setMyWords] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("verba_my_words");
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  function toggleMyWord(word: string) {
    setMyWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      try {
        localStorage.setItem("verba_my_words", JSON.stringify([...next]));
      } catch { /* storage unavailable */ }
      return next;
    });
  }

  function goTo(index: number) {
    setCurrentIndex(Math.max(0, Math.min(index, missedWords.length - 1)));
  }

  function handleQuickReview() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setShowToast(true);
    toastTimer.current = setTimeout(() => setShowToast(false), 2500);
  }

  if (!visible || missedWords.length === 0) return null;

  const mw = missedWords[currentIndex];
  const isStarred = myWords.has(mw.word);
  const reviewWord = reviewIndex !== null ? missedWords[reviewIndex] : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.4 }}
        style={{ padding: "32px 20px 0", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}
      >
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 24,
            color: "#FFFFFF",
            margin: 0,
          }}>
            Words to review
          </h2>
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            color: "#D97706",
            background: "rgba(217,119,6,0.12)",
            border: "1px solid rgba(217,119,6,0.3)",
            borderRadius: 9999,
            padding: "2px 10px",
          }}>
            {missedWords.length}
          </span>
        </div>

        {/* Counter */}
        <p style={{
          textAlign: "center",
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: 500,
          color: "rgba(255,255,255,0.45)",
          margin: "0 0 10px",
          letterSpacing: "0.04em",
        }}>
          {currentIndex + 1} / {missedWords.length}
        </p>

        {/* Carousel card — crossfade only */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -50 && currentIndex < missedWords.length - 1) goTo(currentIndex + 1);
              else if (info.offset.x > 50 && currentIndex > 0) goTo(currentIndex - 1);
            }}
            onClick={() => setReviewIndex(currentIndex)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(217,119,6,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(217,119,6,0.18)";
            }}
            style={{
              background: "rgba(255,255,255,0.015)",
              border: "0.5px solid rgba(217,119,6,0.18)",
              borderRadius: 12,
              padding: "18px 16px",
              cursor: "pointer",
              position: "relative",
              userSelect: "none",
              transition: "border-color 0.2s ease",
            }}
          >
            {/* Star — top right, does NOT propagate to card click */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); toggleMyWord(mw.word); }}
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center",
                color: isStarred ? "#D97706" : "rgba(255,255,255,0.35)",
                transition: "color 0.15s ease",
                outline: "none",
              }}
              aria-label={isStarred ? "Remove from My Words" : "Add to My Words"}
            >
              <Star
                size={15}
                fill={isStarred ? "#D97706" : "none"}
                stroke={isStarred ? "#D97706" : "currentColor"}
              />
            </motion.button>

            {/* Word */}
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 500,
              fontSize: 22,
              color: "#C7B8E8",
              margin: "0 0 18px",
              letterSpacing: "-0.2px",
              paddingRight: 26,
            }}>
              {mw.word}
            </p>

            {/* Wrong answer */}
            <p style={{ margin: "0 0 4px", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#F87171" }}>✗</p>
            <p style={{ margin: "0 0 14px", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              {mw.selectedAnswer}
            </p>

            {/* Correct answer */}
            <p style={{ margin: "0 0 4px", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#84A98C" }}>✓</p>
            <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.95)", lineHeight: 1.5 }}>
              {mw.correctDefinition}
            </p>

            {/* Three-dots hint — decorative, bottom right */}
            <span style={{
              position: "absolute",
              bottom: 10,
              right: 14,
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              letterSpacing: 1,
              color: "rgba(217,119,6,0.75)",
              pointerEvents: "none",
              userSelect: "none",
            }}>
              ⋯
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Navigation row: ‹ dots › */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            style={{
              background: "none",
              border: "none",
              cursor: currentIndex === 0 ? "default" : "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              lineHeight: 1,
              color: currentIndex === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.5)",
              padding: "4px 10px",
              outline: "none",
              transition: "color 0.15s ease",
            }}
          >
            ‹
          </motion.button>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {missedWords.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => goTo(i)}
                whileTap={{ scale: 0.85 }}
                animate={{
                  width: i === currentIndex ? 16 : 6,
                  background: i === currentIndex ? "#D97706" : "rgba(255,255,255,0.18)",
                }}
                style={{
                  height: 6,
                  borderRadius: 9999,
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  outline: "none",
                }}
              />
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex === missedWords.length - 1}
            style={{
              background: "none",
              border: "none",
              cursor: currentIndex === missedWords.length - 1 ? "default" : "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              lineHeight: 1,
              color: currentIndex === missedWords.length - 1 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.5)",
              padding: "4px 10px",
              outline: "none",
              transition: "color 0.15s ease",
            }}
          >
            ›
          </motion.button>
        </div>

        {/* Quick review button */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleQuickReview}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.85)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.6)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,0.8)";
            }}
            style={{
              background: "none",
              border: "1px solid rgba(217,119,6,0.6)",
              borderRadius: 9999,
              padding: "8px 20px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: 13,
              color: "rgba(217,119,6,0.8)",
              letterSpacing: "0.02em",
              opacity: 0.7,
              outline: "none",
              transition: "color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
            }}
          >
            Test these again →
          </motion.button>
        </div>

        {/* Feedback Card overlay for card click */}
        {reviewWord && (
          <FeedbackCard
            show={reviewIndex !== null}
            word={reviewWord}
            isCorrect={false}
            isLast={reviewIndex === missedWords.length - 1}
            onDismiss={() => setReviewIndex(null)}
            onNext={() => {
              if (reviewIndex !== null && reviewIndex < missedWords.length - 1) {
                setReviewIndex(reviewIndex + 1);
              } else {
                setReviewIndex(null);
              }
            }}
          />
        )}
      </motion.div>

      {/* Toast — rendered via portal so position:fixed is unaffected by ancestor transforms */}
      {createPortal(
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25 }}
              style={{
                position: "fixed",
                bottom: 28,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(217,119,6,0.15)",
                border: "0.5px solid rgba(217,119,6,0.4)",
                color: "#D97706",
                padding: "10px 16px",
                borderRadius: 12,
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                zIndex: 300,
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              Coming in Step 9 — practice missed words with Reverse mode 🔁
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// ─── Weekly chart ─────────────────────────────────────────────────────────────

const weeklyData = [
  { day: "Mon", score: 70 },
  { day: "Tue", score: 80 },
  { day: "Wed", score: 60 },
  { day: "Thu", score: 85 },
  { day: "Fri", score: 75 },
  { day: "Sat", score: 90 },
  { day: "Sun", score: 80 },
];
// TODO: Replace with real data from database (Step 7)

function scoreColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 50) return "#FBBF24";
  return "#EF4444";
}

interface WeeklyChartProps {
  visible?: boolean;
}
function WeeklyChart({ visible = true }: WeeklyChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!visible) return null;

  const n = weeklyData.length;
  const VW = 400;
  const VH = 160;
  const PAD_X = 24;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 32; // space for x-axis labels
  const chartH = VH - PAD_TOP - PAD_BOTTOM;

  const xs = weeklyData.map((_, i) => PAD_X + (i / (n - 1)) * (VW - PAD_X * 2));
  const ys = weeklyData.map((d) => PAD_TOP + chartH - (d.score / 100) * chartH);

  // Bezier control points (smooth curve)
  const cpX = (i: number, next: number) => xs[i] + (xs[next] - xs[i]) * 0.45;

  // Area fill path (amber gradient, closed shape)
  const baselineY = PAD_TOP + chartH;
  let areaPath = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < n - 1; i++) {
    areaPath += ` C ${cpX(i, i + 1)} ${ys[i]} ${cpX(i + 1, i)} ${ys[i + 1]} ${xs[i + 1]} ${ys[i + 1]}`;
  }
  areaPath += ` L ${xs[n - 1]} ${baselineY} L ${xs[0]} ${baselineY} Z`;

  // Individual line segments (each colored by avg score of its endpoints)
  const segments = weeklyData.slice(0, n - 1).map((d, i) => {
    const avgScore = (d.score + weeklyData[i + 1].score) / 2;
    const path = `M ${xs[i]} ${ys[i]} C ${cpX(i, i + 1)} ${ys[i]} ${cpX(i + 1, i)} ${ys[i + 1]} ${xs[i + 1]} ${ys[i + 1]}`;
    return { path, color: scoreColor(avgScore) };
  });

  const hovered = hoveredIdx !== null ? weeklyData[hoveredIdx] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.4 }}
      style={{ padding: "32px 20px 0", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}
    >
      <h2 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: 24,
        color: "#FFFFFF",
        margin: "0 0 20px",
      }}>
        This week
      </h2>

      <div style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(217,119,6,0.12)",
        borderRadius: 16,
        padding: "16px 8px 8px",
        position: "relative",
      }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          height={VH}
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D97706" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#D97706" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Amber area fill */}
          <path d={areaPath} fill="url(#areaFill)" />

          {/* Colored line segments */}
          {segments.map((seg, i) => (
            <path
              key={i}
              d={seg.path}
              stroke={seg.color}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          ))}

          {/* Data point dots */}
          {weeklyData.map((d, i) => (
            <circle
              key={i}
              cx={xs[i]}
              cy={ys[i]}
              r={hoveredIdx === i ? 5 : 3.5}
              fill={scoreColor(d.score)}
              style={{ cursor: "pointer", transition: "r 0.15s ease" }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}

          {/* X-axis labels */}
          {weeklyData.map((d, i) => (
            <text
              key={i}
              x={xs[i]}
              y={VH - 6}
              textAnchor="middle"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fill: "rgba(255,255,255,0.4)",
              }}
            >
              {d.day}
            </text>
          ))}

          {/* Tooltip vertical line */}
          {hoveredIdx !== null && (
            <line
              x1={xs[hoveredIdx]}
              y1={PAD_TOP}
              x2={xs[hoveredIdx]}
              y2={PAD_TOP + chartH}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
        </svg>

        {/* Floating tooltip */}
        {hovered && hoveredIdx !== null && (
          <div style={{
            position: "absolute",
            top: 8,
            left: `clamp(8px, calc(${(xs[hoveredIdx] / VW) * 100}% - 48px), calc(100% - 96px))`,
            background: "#1A1A1A",
            border: `1px solid ${scoreColor(hovered.score)}40`,
            borderRadius: 8,
            padding: "5px 10px",
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>{hovered.day} — </span>
            <span style={{ color: scoreColor(hovered.score), fontWeight: 600 }}>{hovered.score}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Streak journey ────────────────────────────────────────────────────────────

// TODO: Calculate from real session data + streak logic in database (Step 7)
// Active streak = consecutive days from today backwards with at least 1 session.

const STREAK_DATA: number[] = [
  // col 0 (83–77 days ago)
  0, 12, 8, 0, 15, 0, 0,
  // col 1 (76–70 days ago)
  20, 0, 14, 18, 0, 10, 6,
  // col 2 (69–63 days ago)
  0, 0, 8, 12, 16, 0, 22,
  // col 3 (62–56 days ago)
  14, 9, 0, 0, 11, 18, 0,
  // col 4 (55–49 days ago)
  0, 13, 19, 8, 0, 0, 14,
  // col 5 (48–42 days ago)
  7, 0, 22, 15, 12, 0, 0,
  // col 6 (41–35 days ago)
  10, 18, 0, 14, 8, 0, 20,
  // col 7 (34–28 days ago)
  0, 0, 15, 11, 0, 18, 14,
  // col 8 (27–21 days ago)
  20, 8, 12, 0, 0, 15, 9,
  // col 9 (20–14 days ago)
  0, 14, 0, 18, 10, 12, 0,
  // col 10 (13–7 days ago) — index 76 = 7 days ago, no study → breaks streak
  8, 0, 22, 15, 0, 14, 0,
  // col 11 (6–0 days ago) — active 7-day streak
  15, 12, 18, 22, 16, 20, 19,
];

function getActiveStreakSet(data: number[]): Set<number> {
  const set = new Set<number>();
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i] > 0) {
      set.add(i);
    } else {
      break;
    }
  }
  return set;
}

interface StreakJourneyProps {
  visible?: boolean;
}
function StreakJourney({ visible = true }: StreakJourneyProps) {
  const [tooltip, setTooltip] = useState<{ index: number; x: number; y: number } | null>(null);

  if (!visible) return null;

  const activeStreakSet = getActiveStreakSet(STREAK_DATA);
  const streakLength = activeStreakSet.size;
  const isLongStreak = streakLength >= 30;
  const streakStart = activeStreakSet.size > 0 ? Math.min(...activeStreakSet) : 84;

  const today = new Date();
  function getDateLabel(daysAgo: number): string {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function getTooltipText(index: number): string {
    const daysAgo = 83 - index;
    const dateLabel = getDateLabel(daysAgo);
    const words = STREAK_DATA[index];
    if (words === 0) return `${dateLabel} — No study`;
    if (activeStreakSet.has(index)) {
      const streakDay = index - streakStart + 1;
      return `${dateLabel} — Streak day ${streakDay} · ${words} words`;
    }
    return `${dateLabel} — Studied · ${words} words`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.95, duration: 0.4 }}
      style={{ padding: "32px 20px 0", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 24,
          color: "#FFFFFF",
          margin: 0,
        }}>
          Your streak journey
        </h2>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(217,119,6,0.35)",
          borderRadius: 9999,
          padding: "3px 10px",
          backdropFilter: "blur(6px)",
          flexShrink: 0,
        }}>
          <Flame size={13} color="#D97706" />
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "#D97706",
          }}>
            {streakLength} days
          </span>
        </div>
      </div>

      <div style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(217,119,6,0.12)",
        borderRadius: 16,
        padding: "20px 16px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* 7 × 12 grid */}
        <div style={{ display: "flex", gap: 2 }}>
          {Array.from({ length: 12 }, (_, col) => (
            <div key={col} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {Array.from({ length: 7 }, (_, row) => {
                const index = col * 7 + row;
                const words = STREAK_DATA[index];
                const isStreak = activeStreakSet.has(index);
                const staggerDelay = index * 0.010;

                const baseBg = words === 0
                  ? "rgba(255,255,255,0.05)"
                  : isStreak
                    ? "rgba(16,185,129,0.9)"
                    : "rgba(217,119,6,0.5)";

                const baseBoxShadow = isStreak ? "0 0 6px rgba(16,185,129,0.5)" : "none";

                return (
                  <motion.div
                    key={row}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={isStreak && isLongStreak
                      ? {
                          opacity: [0.82, 1, 0.82],
                          boxShadow: [
                            "0 0 4px rgba(16,185,129,0.35)",
                            "0 0 10px rgba(16,185,129,0.7)",
                            "0 0 4px rgba(16,185,129,0.35)",
                          ],
                        }
                      : { opacity: 1, scale: 1 }
                    }
                    transition={isStreak && isLongStreak
                      ? { delay: staggerDelay, duration: 3, repeat: Infinity, ease: "easeInOut" }
                      : { delay: staggerDelay, duration: 0.22, ease: "easeOut" }
                    }
                    onMouseEnter={(e) => setTooltip({ index, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: baseBg,
                      boxShadow: baseBoxShadow,
                      flexShrink: 0,
                      cursor: "default",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip !== null && (
          <div style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 44,
            background: "#1A1A1A",
            border: "1px solid rgba(217,119,6,0.3)",
            borderRadius: 8,
            padding: "5px 10px",
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            color: "#D97706",
            zIndex: 200,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}>
            {getTooltipText(tooltip.index)}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
          {[
            { bg: "rgba(255,255,255,0.05)", shadow: "none", label: "No study" },
            { bg: "rgba(217,119,6,0.5)", shadow: "none", label: "Studied" },
            { bg: "rgba(16,185,129,0.9)", shadow: "0 0 5px rgba(16,185,129,0.5)", label: "Active streak" },
          ].map(({ bg, shadow, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: bg,
                boxShadow: shadow,
                flexShrink: 0,
              }} />
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 400,
                color: "rgba(255,255,255,0.4)",
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main ResultsScreen ───────────────────────────────────────────────────────

export default function ResultsScreen() {
  const [, navigate] = useLocation();
  const [result, setResult] = useState<SessionResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("verbaSessionResult");
    if (!raw) {
      navigate("/setup");
      return;
    }
    try {
      const parsed: SessionResult = JSON.parse(raw);
      setResult(parsed);
      // 1A — persist last session
      try {
        const session = {
          deck: parsed.deck ?? null,
          difficulty: parsed.difficulty ?? null,
          wordCount: parsed.wordCount,
          completedAt: new Date().toISOString(),
        };
        localStorage.setItem("verba_last_session", JSON.stringify(session));
        // 1B — persist last difficulty per deck
        if (parsed.deck && parsed.difficulty) {
          localStorage.setItem(`verba_last_difficulty_${parsed.deck}`, parsed.difficulty);
        }
        // 1C — ensure verba_my_verba exists
        if (!localStorage.getItem("verba_my_verba")) {
          localStorage.setItem("verba_my_verba", JSON.stringify([]));
        }
      } catch { /* storage unavailable */ }
    } catch {
      navigate("/setup");
    }
  }, [navigate]);

  if (!result) return null;

  return (
    <div style={{
      minHeight: "100dvh",
      width: "100%",
      background: "#0A0A0A",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflowX: "hidden",
    }}>
      <AppBackground showWords={false} />

      <div style={{ position: "relative", zIndex: 10 }}>
        <HeroScore correct={result.correct} total={result.total} visible={true} />
        <QuickStats elapsedMs={result.elapsedMs} visible={true} />
        <ActionButtons wordCount={result.wordCount} visible={true} />
        <MissedWordsList missedWords={result.missedWords} visible={true} />
        <WeeklyChart visible={true} />
        <StreakJourney visible={true} />

        {/* Bottom spacing */}
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}
