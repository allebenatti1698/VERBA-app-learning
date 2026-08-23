import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import AppBackground from "@/components/AppBackground";
import { SCREEN_MAX } from "@/components/ScreenColumn";
import { lowercaseFirst } from "@/lib/formatText";
import FeedbackCard, { type QuizWord as FeedbackQuizWord } from "@/components/FeedbackCard";
import { fetchQuizWords, fetchWordsByIds, type QuizWord, type QuizWordDefinition } from "@/lib/quizQueries";
import { parseSetsParam, getWordIdsForSelection } from "@/lib/studySets";
import { primaryButtonStyle } from "@/lib/primaryButtonStyle";
import { recordAnswer, getWordStat } from "@/lib/wordStats";
import { undismissTrouble } from "@/lib/troubleDismiss";
import { tapScale, TAP_SPRING } from "@/components/SpringTap";

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function playCorrectSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // AudioContext not available
  }
}

function toFeedbackWord(w: QuizWord): FeedbackQuizWord {
  return {
    word: w.word,
    phonetic: w.phonetic ?? "",
    correctDefinition: w.correctDefinition,
    exampleSentence: w.exampleSentence,
    synonyms: w.synonyms,
    antonyms: w.antonyms,
    etymology: w.etymology ?? "",
    italianTranslation: w.italianTranslation,
    italianDefinition: w.italianDefinition ?? "",
    allDefinitions: w.allDefinitions,
  };
}

function getOptionStyle(
  option: string,
  correctAnswer: string,
  selectedOption: string | null,
  isAnswered: boolean,
): React.CSSProperties {
  if (!isAnswered) {
    return { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(217,119,6,0.18)", boxShadow: "none" };
  }
  if (option === correctAnswer) {
    return { background: "rgba(16,185,129,0.08)", border: "1.5px solid #10B981", boxShadow: "0 0 16px rgba(16,185,129,0.25)" };
  }
  if (option === selectedOption) {
    return { background: "rgba(239,68,68,0.08)", border: "1.5px solid #EF4444", boxShadow: "0 0 16px rgba(239,68,68,0.2)" };
  }
  return { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(217,119,6,0.08)" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizScreen() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const requestedWords = Math.max(Number(params.get("words")) || 10, 1);
  const deckParam = params.get("deck") ?? null;
  const difficultyParam = params.get("difficulty") ?? null;
  const setsParam = params.get("sets") ?? null;
  const sourceParam = params.get("source") ?? null;

  // ── Shared state ────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // ── Normal mode state ────────────────────────────────────────────────────
  const [quizWords, setQuizWords] = useState<QuizWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordKey, setWordKey] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const wrongAnswersRef = useRef<Map<number, string>>(new Map());

  // ── Normal mode: fetch words ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const selection = parseSetsParam(setsParam);
    const hasSets = Object.keys(selection).length > 0;
    let dueIds: string[] = [];
    if (sourceParam === "due") {
      try { dueIds = JSON.parse(sessionStorage.getItem("verba_review_due") || "[]") as string[]; }
      catch { dueIds = []; }
    }
    let myVerbaIds: string[] = [];
    if (sourceParam === "myverba") {
      try { myVerbaIds = JSON.parse(sessionStorage.getItem("verba_myverba_ids") || "[]") as string[]; }
      catch { myVerbaIds = []; }
    }
    const loader =
      sourceParam === "due"
        ? fetchWordsByIds(dueIds).then((ws) => shuffleArray(ws))
        : sourceParam === "myverba"
          ? fetchWordsByIds(myVerbaIds).then((ws) => shuffleArray(ws).slice(0, requestedWords))
          : hasSets
            ? getWordIdsForSelection(deckParam || "gre", selection)
                .then((ids) => fetchWordsByIds(ids))
                .then((ws) => shuffleArray(ws).slice(0, requestedWords))
            : fetchQuizWords(deckParam || "gre", difficultyParam, requestedWords);
    loader
      .then((words) => {
        if (cancelled) return;
        setQuizWords(words);
        setCurrentIndex(0);
        setSelectedOption(null);
        setIsAnswered(false);
        setShowTranslation(false);
        setShowFeedback(false);
        setWordKey((k) => k + 1);
        startTimeRef.current = Date.now();
        wrongAnswersRef.current = new Map();
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load words");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [deckParam, difficultyParam, setsParam, sourceParam, requestedWords, fetchKey]);

  const handleRetry = useCallback(() => setFetchKey((k) => k + 1), []);

  // ── Normal mode: derived ─────────────────────────────────────────────────
  const currentWord: QuizWord | undefined = quizWords[currentIndex];

  const shuffledOptions = useMemo(() => {
    if (!currentWord) return [];
    return shuffleArray([currentWord.correctDefinition, ...currentWord.distractors]);
  }, [currentWord]);

  // ── Normal mode handlers ─────────────────────────────────────────────────
  function handleSelectOption(option: string) {
    if (isAnswered || !currentWord) return;
    const correct = option === currentWord.correctDefinition;
    setSelectedOption(option);
    setIsAnswered(true);
    // SRS: registra la PRIMA (e unica) risposta per questa parola in questa sessione.
    // Il guard isAnswered garantisce una sola chiamata per parola. Vale sia per i quiz
    // del Practice sia per la futura review: ogni prima-risposta alimenta wordStats.
    recordAnswer(currentWord.id, correct);
    if (correct) {
      playCorrectSound();
    } else {
      wrongAnswersRef.current.set(currentIndex, option);
      undismissTrouble(currentWord.id); // ri-sbagliata → rientra in trouble (annulla lo scarto)
    }
    setTimeout(() => setShowFeedback(true), 400);
  }

  function handleNext() {
    setShowFeedback(false);
    setTimeout(() => {
      if (currentIndex + 1 >= quizWords.length) {
        const elapsedMs = Date.now() - startTimeRef.current;

        // Review SRS (source=due): riepilogo dedicato → /review-summary (★ My Verba),
        // niente verbaSessionResult così non sporca le statistiche di pratica.
        if (sourceParam === "due") {
          const summary = quizWords.map((w) => ({
            id: w.id,
            word: w.word,
            status: getWordStat(w.id)?.status ?? "learning",
          }));
          sessionStorage.setItem("verba_review_summary", JSON.stringify(summary));
          setLocation("/review-summary");
          return;
        }

        const missedWords = Array.from(wrongAnswersRef.current.entries()).map(([idx, selectedAnswer]) => ({
          ...quizWords[idx],
          selectedAnswer,
        }));
        // Serie più lunga di risposte corrette consecutive
        let bestRun = 0;
        {
          let run = 0;
          for (let i = 0; i < quizWords.length; i++) {
            if (wrongAnswersRef.current.has(i)) { run = 0; }
            else { run += 1; if (run > bestRun) bestRun = run; }
          }
        }
        const result = {
          correct: quizWords.length - wrongAnswersRef.current.size,
          total: quizWords.length,
          missedWords,
          elapsedMs,
          wordCount: quizWords.length,
          deck: deckParam,
          difficulty: difficultyParam,
          bestRun,
          wordIds: quizWords.map((w) => String(w.id)),
        };
        sessionStorage.setItem("verbaSessionResult", JSON.stringify(result));
        setLocation("/results");
        return;
      }
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowTranslation(false);
      setShowFeedback(false);
      setWordKey((k) => k + 1);
    }, 300);
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", width: "100%", background: "#0A0A0A", position: "relative", overflow: "hidden" }}>
        <AppBackground showWords={true} />
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Loader2 size={32} strokeWidth={1.5} color="#F59E0B" className="animate-spin" />
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.85rem", color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em", margin: 0 }}>
            Loading words…
          </p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "100dvh", width: "100%", background: "#0A0A0A", position: "relative", overflow: "hidden" }}>
        <AppBackground showWords={false} />
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: "0 24px", textAlign: "center" }}>
          <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "1.1rem", color: "rgba(255,255,255,0.85)", margin: 0 }}>
            Couldn't load your words
          </p>
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", margin: 0, maxWidth: 340 }}>
            {error}
          </p>
          <button
            data-testid="button-retry"
            onClick={handleRetry}
            style={{ marginTop: 6, background: "transparent", border: "1px solid rgba(217,119,6,0.6)", borderRadius: 9999, padding: "10px 26px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: "0.9rem", color: "#F59E0B", letterSpacing: "0.04em", outline: "none" }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Guards ───────────────────────────────────────────────────────────────
  if (!currentWord) return null;

  // ── Computed values ──────────────────────────────────────────────────────
  const animKey = wordKey;
  const correctAnswer = currentWord!.correctDefinition;
  const activeOptions = shuffledOptions;
  const isCorrect = selectedOption === correctAnswer;
  const feedbackWord = toFeedbackWord(currentWord!);
  const handleSelectActive = handleSelectOption;
  const handleNextActive = handleNext;

  const progress = (currentIndex / Math.max(quizWords.length, 1)) * 100;

  const counterLabel = `${currentIndex + 1} / ${quizWords.length}`;

  const isLastNormal = currentIndex + 1 >= quizWords.length;

  const wlen = currentWord?.word.length ?? 0;
  const wordFontSize =
    wlen <= 13 ? "clamp(34px, 8.5vw, 50px)" :
    wlen <= 15 ? "clamp(28px, 7vw, 42px)" :
                 "clamp(26px, 6vw, 38px)";

  return (
    <div style={{ minHeight: "100dvh", width: "100%", background: "#0A0A0A", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <AppBackground showWords={false} />

      {/* Progress bar */}
      <div style={{ position: "relative", zIndex: 20 }}>
        <div style={{ width: "100%", height: 3, background: "#1F1F1F" }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ height: "100%", background: "linear-gradient(90deg, #F59E0B, #EA580C)" }}
          />
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 8, letterSpacing: "0.08em" }}>
          {counterLabel}
        </p>
      </div>

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", flex: 1, alignItems: "center", justifyContent: "flex-start", padding: "0 20px 120px", gap: 16 }}>

        {/* Prompt */}
        <AnimatePresence mode="wait">
          <motion.div
            key={animKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 24, paddingBottom: 8, width: "100%", maxWidth: SCREEN_MAX }}
          >
            <>
                {/* Normal: show word */}
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: wordFontSize, lineHeight: 1.3, color: "#C7B8E8", margin: 0, textAlign: "center", width: "100%", maxWidth: "100%", padding: "20px 14px 32px 14px", boxSizing: "border-box", overflow: "visible", whiteSpace: "nowrap", wordBreak: "keep-all" }}>
                  {currentWord!.word}
                </h2>

                {/* Hint */}
                <motion.button
                  onClick={() => setShowTranslation((v) => !v)}
                  whileTap={{ scale: 0.95 }}
                  style={{ marginTop: 8, background: "none", border: "1px solid rgba(217,119,6,0.6)", borderRadius: 9999, padding: "4px 12px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.72rem", color: "rgba(217,119,6,0.8)", letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 5, opacity: 0.7, transition: "color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,0.9)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.5)"; (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,0.5)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.25)"; (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
                >
                  💡 hint
                </motion.button>

                <AnimatePresence>
                  {showTranslation && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ overflow: "hidden", width: "100%" }}
                    >
                      <div style={{ marginTop: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 12, padding: "14px 18px" }}>
                        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "1rem", color: "#D97706", margin: 0 }}>
                          {currentWord!.italianTranslation}
                        </p>
                        {currentWord!.italianDefinition && (
                          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", margin: "6px 0 0", fontStyle: "italic" }}>
                            {currentWord!.italianDefinition}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
          </motion.div>
        </AnimatePresence>

        {/* Options */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${animKey}-opts`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: SCREEN_MAX }}
          >
            {activeOptions.map((option, i) => (
                <motion.button
                  key={option}
                  data-testid={`option-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25, ease: "easeOut" }}
                  onClick={() => handleSelectActive(option)}
                  disabled={isAnswered}
                  style={{
                    ...getOptionStyle(option, correctAnswer, selectedOption, isAnswered),
                    borderRadius: 12,
                    padding: "15px 18px",
                    cursor: isAnswered ? "default" : "pointer",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    fontSize: "0.88rem",
                    color: "rgba(255,255,255,0.85)",
                    textAlign: "left",
                    transition: "border 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
                    outline: "none",
                    lineHeight: 1.4,
                  }}
                >
                  {lowercaseFirst(option)}
                </motion.button>
              ))}
          </motion.div>
        </AnimatePresence>

        {/* Floating Next button — normal mode only */}
        <AnimatePresence>
            {isAnswered && !showFeedback && (
              <motion.button
                data-testid="button-next-floating"
                onClick={handleNext}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2, scale: TAP_SPRING }}
                whileTap={tapScale()}
                style={{ ...primaryButtonStyle, display: "block", margin: "8px auto 0", touchAction: "manipulation" }}
              >
                {isLastNormal ? "Finish" : "Next →"}
              </motion.button>
            )}
          </AnimatePresence>
      </div>

      {/* Feedback card — normal mode only */}
      <FeedbackCard
          show={showFeedback}
          word={feedbackWord}
          isCorrect={isCorrect}
          isLast={isLastNormal}
          onDismiss={() => setShowFeedback(false)}
          onNext={handleNext}
          allowMinimize={true}
        />
    </div>
  );
}
