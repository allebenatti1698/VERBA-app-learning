import { useState, useEffect, useRef } from "react";
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
}

export interface SessionResult {
  correct: number;
  total: number;
  missedWords: MissedWord[];
  elapsedMs: number;
  wordCount: number;
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
        onClick={() => navigate("/setup")}
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
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  // TODO: Migrate to user database (Step 7). Difficult words will sync across devices and influence spaced repetition algorithm.
  const [difficultWords, setDifficultWords] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("verba_difficult_words");
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  function toggleDifficult(word: string) {
    setDifficultWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      try {
        localStorage.setItem("verba_difficult_words", JSON.stringify([...next]));
      } catch { /* storage unavailable */ }
      return next;
    });
  }

  if (!visible || missedWords.length === 0) return null;

  const reviewWord = reviewIndex !== null ? missedWords[reviewIndex] : null;

  return (
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

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {missedWords.map((mw, i) => {
          const isMarked = difficultWords.has(mw.word);
          return (
          <div
            key={mw.id}
            style={{
              padding: 20,
              borderRadius: 16,
              border: "1px solid rgba(217,119,6,0.15)",
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(6px)",
              position: "relative",
            }}
          >
            {/* Mark as difficult star */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => toggleDifficult(mw.word)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 2,
                display: "flex",
                alignItems: "center",
                color: isMarked ? "#FBBF24" : "rgba(255,255,255,0.3)",
                boxShadow: isMarked ? "0 0 8px rgba(251,191,36,0.4)" : "none",
                borderRadius: "50%",
                transition: "color 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isMarked) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)";
              }}
              onMouseLeave={(e) => {
                if (!isMarked) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)";
              }}
              aria-label={isMarked ? "Unmark as difficult" : "Mark as difficult"}
            >
              <Star
                size={18}
                fill={isMarked ? "#FBBF24" : "none"}
                stroke={isMarked ? "#FBBF24" : "currentColor"}
              />
            </motion.button>

            {/* Word + phonetic */}
            <p style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 28,
              background: "linear-gradient(120deg, #C17B1A 0%, #D97706 30%, #FFF8F0 55%, #D97706 80%, #C17B1A 100%)",
              backgroundSize: "300% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "title-shimmer 4.5s ease-in-out infinite",
              margin: "0 0 4px",
            }}>
              {mw.word}
            </p>
            <p style={{
              fontFamily: "monospace",
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              margin: "0 0 16px",
            }}>
              {mw.phonetic}
            </p>

            {/* Wrong answer */}
            <p style={{ margin: "0 0 4px", fontFamily: "'Inter', sans-serif" }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#EF4444" }}>✗ Your answer:</span>
            </p>
            <p style={{ margin: "0 0 14px", fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.4, paddingLeft: 12 }}>
              "{mw.selectedAnswer}"
            </p>

            {/* Correct answer */}
            <p style={{ margin: "0 0 4px", fontFamily: "'Inter', sans-serif" }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: "#10B981" }}>✓ Correct answer:</span>
            </p>
            <p style={{ margin: "0 0 16px", fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 14, color: "#FFFFFF", lineHeight: 1.4, paddingLeft: 12 }}>
              "{mw.correctDefinition}"
            </p>

            {/* Review button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setReviewIndex(i)}
              style={{
                background: "none",
                border: "1px solid rgba(132,169,140,0.4)",
                borderRadius: 9999,
                padding: "7px 20px",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                fontSize: 13,
                color: "#84A98C",
                letterSpacing: "0.02em",
                outline: "none",
              }}
            >
              Review →
            </motion.button>
          </div>
          );
        })}
      </div>

      {/* Feedback Card for review */}
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

// ─── Activity heatmap ─────────────────────────────────────────────────────────

function generateHeatmapData(): number[] {
  return Array.from({ length: 84 }, () => {
    const r = Math.random();
    if (r < 0.28) return 0;
    if (r < 0.55) return Math.floor(Math.random() * 9) + 1;
    if (r < 0.75) return Math.floor(Math.random() * 20) + 10;
    if (r < 0.92) return Math.floor(Math.random() * 20) + 30;
    return Math.floor(Math.random() * 20) + 50;
  });
}
// TODO: Replace with real daily activity from database (Step 7)

const HEATMAP_DATA = generateHeatmapData();

function cellColor(count: number): string {
  if (count === 0) return "rgba(255,255,255,0.05)";
  if (count < 10) return "rgba(217,119,6,0.25)";
  if (count < 30) return "rgba(217,119,6,0.5)";
  if (count < 50) return "rgba(217,119,6,0.75)";
  return "rgba(217,119,6,1)";
}

interface ActivityHeatmapProps {
  visible?: boolean;
}
function ActivityHeatmap({ visible = true }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ index: number; x: number; y: number } | null>(null);

  if (!visible) return null;

  const today = new Date();
  const getDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.95, duration: 0.4 }}
      style={{ padding: "32px 20px 0", maxWidth: 480, margin: "0 auto", width: "100%", boxSizing: "border-box" }}
    >
      <h2 style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: 24,
        color: "#FFFFFF",
        margin: "0 0 20px",
      }}>
        Your study activity
      </h2>

      <div style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid rgba(217,119,6,0.12)",
        borderRadius: 16,
        padding: "20px 16px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Grid: 7 rows × 12 cols */}
        <div style={{ display: "flex", gap: 2, position: "relative" }}>
          {Array.from({ length: 12 }, (_, col) => (
            <div key={col} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {Array.from({ length: 7 }, (_, row) => {
                const index = col * 7 + row;
                const daysAgo = 83 - index;
                const count = HEATMAP_DATA[index];
                return (
                  <div
                    key={row}
                    onMouseEnter={(e) => setTooltip({ index, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: cellColor(count),
                      cursor: "default",
                      flexShrink: 0,
                    }}
                  />
                );
                void daysAgo;
              })}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip !== null && (
          <div style={{
            position: "fixed",
            left: tooltip.x + 10,
            top: tooltip.y - 40,
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
            {getDate(83 - tooltip.index)} — {HEATMAP_DATA[tooltip.index]} words
          </div>
        )}

        {/* Legend */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 6,
          marginTop: 12,
        }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Less</span>
          {[0, 1, 10, 30, 50].map((v, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: cellColor(v) }} />
          ))}
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>More</span>
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
      setResult(JSON.parse(raw));
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
      <AppBackground showWords={true} />

      <div style={{ position: "relative", zIndex: 10 }}>
        <HeroScore correct={result.correct} total={result.total} visible={true} />
        <QuickStats elapsedMs={result.elapsedMs} visible={true} />
        <ActionButtons wordCount={result.wordCount} visible={true} />
        <MissedWordsList missedWords={result.missedWords} visible={true} />
        <WeeklyChart visible={true} />
        <ActivityHeatmap visible={true} />

        {/* Bottom spacing */}
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}
