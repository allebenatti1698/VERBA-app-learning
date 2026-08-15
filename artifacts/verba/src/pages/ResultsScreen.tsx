import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Star } from "lucide-react";
import AppBackground from "@/components/AppBackground";
import ScreenColumn, { SCREEN_MAX } from "@/components/ScreenColumn";
import { lowercaseFirst } from "@/lib/formatText";
import { getMomentum } from "@/lib/studyActivity";
import { getDueCount, getWordStat } from "@/lib/wordStats";
import StreakCelebration from "@/components/StreakCelebration";
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
  bestRun?: number;
  wordIds?: string[];
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 20px 34px",
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
  total: number;
  bestRun?: number;
  deck?: string | null;
  visible?: boolean;
}

// Identità cromatica del deck. Oggi solo GRE è attivo; gli altri sono pronti.
function deckLight(deck?: string | null): string {
  if (!deck) return "167,139,250";
  const d = deck.toLowerCase();
  if (d.includes("essential") || d.includes("advanced")) return "125,211,252";
  if (d.includes("verba") || d.includes("my")) return "232,232,232";
  return "167,139,250";
}

function QuickStats({ elapsedMs, total, bestRun, deck, visible = true }: QuickStatsProps) {
  if (!visible) return null;

  const rgb = deckLight(deck);
  // Stessa base di formatTime (secondi troncati), così il ritmo non può
  // mai risultare maggiore del tempo totale.
  const totalSec = Math.floor(elapsedMs / 1000);
  const paceSec = total > 0 ? Math.max(1, Math.round(totalSec / total)) : 0;

  const cards = [
    { label: "TIME",     value: formatTime(elapsedMs), sub: "total",    soft: false, strong: false },
    { label: "PACE",     value: paceSec >= 60 ? formatTime(paceSec * 1000) : `${paceSec}s`,
                                                       sub: "per word", soft: true,  strong: false },
    { label: "BEST RUN", value: bestRun && bestRun > 0 ? `×${bestRun}` : "—",
                                                       sub: "in a row", soft: false, strong: true  },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      style={{
        display: "flex",
        gap: 9,
        padding: "0 20px",
        maxWidth: SCREEN_MAX,
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
            padding: "12px 8px 13px",
            borderRadius: 12,
            textAlign: "center",
            // Grammatica app: fondo piatto + bordo del deck su tutti i lati.
            // La card della serie ha il bordo più marcato, come Easy/Medium/Hard.
            background: "rgba(255,255,255,0.02)",
            border: `0.5px solid rgba(${rgb},${card.strong ? 0.5 : 0.26})`,
          }}
        >

          <p style={{
            position: "relative",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            fontSize: 9,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.38)",
            margin: "0 0 7px",
          }}>
            {card.label}
          </p>
          <p style={{
            position: "relative",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(16px, 4.6vw, 19px)",
            letterSpacing: "-0.3px",
            color: card.soft ? "rgba(255,255,255,0.72)" : "#FFFFFF",
            margin: 0,
            lineHeight: 1.15,
            whiteSpace: "nowrap",
          }}>
            {card.value}
          </p>
          <p style={{
            position: "relative",
            fontFamily: "'Inter', sans-serif",
            fontSize: 9.5,
            color: "rgba(255,255,255,0.32)",
            margin: "4px 0 0",
          }}>
            {card.sub}
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
        maxWidth: SCREEN_MAX,
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
          fontSize: "clamp(13px, 3.7vw, 15px)",
          color: "#FFFFFF",
          cursor: "pointer",
          outline: "none",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        Another round
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
          fontSize: "clamp(13px, 3.7vw, 15px)",
          color: "#FFFFFF",
          cursor: "pointer",
          outline: "none",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
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

  if (!visible || missedWords.length === 0) return null;

  const mw = missedWords[currentIndex];
  const isStarred = myWords.has(String(mw.id));
  const reviewWord = reviewIndex !== null ? missedWords[reviewIndex] : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.4 }}
        style={{ padding: "32px 20px 0", maxWidth: SCREEN_MAX, margin: "0 auto", width: "100%", boxSizing: "border-box" }}
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
            Missed this session
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
              padding: "18px 16px 30px",
              cursor: "pointer",
              position: "relative",
              userSelect: "none",
              transition: "border-color 0.2s ease",
            }}
          >
            {/* Star — top right, does NOT propagate to card click */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => { e.stopPropagation(); toggleMyWord(String(mw.id)); }}
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
              {lowercaseFirst(mw.selectedAnswer)}
            </p>

            {/* Correct answer */}
            <p style={{ margin: "0 0 4px", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#84A98C" }}>✓</p>
            <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.95)", lineHeight: 1.5 }}>
              {lowercaseFirst(mw.correctDefinition)}
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

    </>
  );
}


// ─── Session outro: quando tornano + ponte verso Progress ────────────────────

/** Scadenza più vicina fra le parole della sessione. La più vicina è quella che
 *  ti riporta davvero nell'app, e resta vera qualunque cosa facciano le altre. */
function nextReturnLabel(wordIds?: string[]): string | null {
  if (!wordIds || wordIds.length === 0) return null;
  const now = Date.now();
  let soonest = Infinity;
  for (const id of wordIds) {
    const s = getWordStat(id);
    if (!s?.nextReviewAt) continue;
    const t = new Date(s.nextReviewAt).getTime();
    if (t > now && t < soonest) soonest = t;
  }
  if (!Number.isFinite(soonest)) return null;
  const days = Math.round((soonest - now) / 86400000);
  if (days <= 0) return "later today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

interface CleanNoteProps {
  wordIds?: string[];
}

/** Riga della sessione senza errori: resta agganciata al blocco centrale. */
function CleanNote({ wordIds }: CleanNoteProps) {
  const returnLabel = useMemo(() => nextReturnLabel(wordIds), [wordIds]);

  return (
    <motion.p
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.45 }}
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 15,
        fontWeight: 500,
        color: "rgba(255,255,255,0.72)",
        textAlign: "center",
        lineHeight: 1.5,
        padding: "0 20px",
        maxWidth: SCREEN_MAX,
        margin: "30px auto 0",
        boxSizing: "border-box",
      }}
    >
      Nothing missed
      {returnLabel && (
        <> — <span style={{ color: "#34D399" }}>these come back {returnLabel}</span></>
      )}
    </motion.p>
  );
}

interface ReviewBridgeProps {
  onGoToProgress: () => void;
}

/** Ponte verso Progress: sempre in fondo alla pagina, in entrambi gli stati. */
function ReviewBridge({ onGoToProgress }: ReviewBridgeProps) {
  const dueCount = useMemo(() => {
    try { return getDueCount(); } catch { return 0; }
  }, []);

  if (dueCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.9, duration: 0.45 }}
      style={{
        position: "relative",
        zIndex: 10,
        flex: "0 0 auto",
        textAlign: "center",
        padding: "26px 20px calc(30px + env(safe-area-inset-bottom))",
      }}
    >
      <button
        onClick={onGoToProgress}
        data-testid="button-review-bridge"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          outline: "none",
          fontFamily: "'Inter', sans-serif",
          fontSize: 12.5,
          color: "rgba(255,255,255,0.42)",
          padding: "6px 8px",
        }}
      >
        <span style={{ color: "#C7B8E8", fontWeight: 500 }}>
          {dueCount} {dueCount === 1 ? "word" : "words"}
        </span>
        {" "}are ready for review{" "}
        <span style={{ color: "#F59E0B" }}>→</span>
      </button>
    </motion.div>
  );
}

// ─── Main ResultsScreen ───────────────────────────────────────────────────────

export default function ResultsScreen() {
  const [, navigate] = useLocation();
  const [result, setResult] = useState<SessionResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("verbaSessionResult");
    if (!raw) {
      navigate("/setup");
      return;
    }
    try {
      const parsed: SessionResult = JSON.parse(raw);
      setResult(parsed);
      // Streak celebration: solo alla PRIMA Results del giorno. Il flag si scrive al DISMISS (non qui),
      // così un eventuale re-mount della schermata non "consuma" la celebrazione a metà.
      try {
        const now = new Date();
        const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        if (localStorage.getItem("verba_streak_celebrated") !== todayYMD && getMomentum() >= 1) {
          setShowCelebration(true);
        }
      } catch { /* storage non disponibile */ }
      // 1A — persist last session
      try {
        const session = {
          deck: parsed.deck ?? null,
          difficulty: parsed.difficulty ?? null,
          wordCount: parsed.wordCount,
          completedAt: new Date().toISOString(),
        };
        // Ricorda solo sessioni riprendibili: i flussi source-based non hanno deck → non sovrascrivere
        if (session.deck) {
          localStorage.setItem("verba_last_session", JSON.stringify(session));
        }
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
      {showCelebration && (
        <StreakCelebration
          onDismiss={() => {
            try {
              const now = new Date();
              const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
              localStorage.setItem("verba_streak_celebrated", todayYMD);
            } catch { /* storage */ }
            setShowCelebration(false);
          }}
        />
      )}
      <AppBackground showWords={false} />

      {/* Il contenuto occupa lo spazio disponibile: si centra quando la
          schermata è corta, resta in alto quando c'è la sezione errori. */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: result.missedWords.length === 0 ? "center" : "flex-start",
        }}
      >
      <ScreenColumn>
        <HeroScore correct={result.correct} total={result.total} visible={true} />
        <QuickStats
          elapsedMs={result.elapsedMs}
          total={result.total}
          bestRun={result.bestRun}
          deck={result.deck}
          visible={true}
        />
        <ActionButtons wordCount={result.wordCount} visible={true} />
        <MissedWordsList missedWords={result.missedWords} visible={true} />

        {result.missedWords.length === 0 && <CleanNote wordIds={result.wordIds} />}
      </ScreenColumn>
      </div>

      <ReviewBridge onGoToProgress={() => navigate("/progress")} />
    </div>
  );
}
