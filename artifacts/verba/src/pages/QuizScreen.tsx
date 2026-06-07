import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import AppBackground from "@/components/AppBackground";
import FeedbackCard, { type QuizWord as FeedbackQuizWord } from "@/components/FeedbackCard";
import { fetchQuizWords, getReverseDistractors, type QuizWord, type QuizWordDefinition } from "@/lib/quizQueries";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewItem = {
  id: string | number;
  word: string;
  correctDefinition: string;
  italianTranslation: string;
  italianDefinition?: string;
  exampleSentence: string;
  synonyms: string[];
  antonyms: string[];
  etymology?: string;
  allDefinitions?: QuizWordDefinition[];
};

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

function reviewItemToFeedbackWord(item: ReviewItem): FeedbackQuizWord {
  return {
    word: item.word,
    phonetic: "",
    correctDefinition: item.correctDefinition,
    exampleSentence: item.exampleSentence,
    synonyms: item.synonyms,
    antonyms: item.antonyms,
    etymology: item.etymology ?? "",
    italianTranslation: item.italianTranslation,
    italianDefinition: item.italianDefinition ?? "",
    allDefinitions: item.allDefinitions,
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
  const isReverseMode = params.get("mode") === "reverse";

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

  // ── Reverse mode state ───────────────────────────────────────────────────
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [initialQueueSize, setInitialQueueSize] = useState(0);
  const [reverseOptions, setReverseOptions] = useState<string[]>([]);
  const [reverseOptionsLoading, setReverseOptionsLoading] = useState(false);
  const [reverseMasteredCount, setReverseMasteredCount] = useState(0);
  const [reverseWordKey, setReverseWordKey] = useState(0);
  const originalQueueRef = useRef<ReviewItem[]>([]);
  const reverseRetryCountRef = useRef<Map<string, number>>(new Map());
  const reviewDeckRef = useRef<string>("gre");
  const reviewDifficultyRef = useRef<string | null>(null);

  // ── Normal mode: fetch words ─────────────────────────────────────────────
  useEffect(() => {
    if (isReverseMode) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchQuizWords(deckParam || "gre", difficultyParam, requestedWords)
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
  }, [deckParam, difficultyParam, requestedWords, fetchKey, isReverseMode]);

  // ── Reverse mode: init from sessionStorage ───────────────────────────────
  useEffect(() => {
    if (!isReverseMode) return;
    try {
      const raw = sessionStorage.getItem("verbaReviewQueue");
      if (!raw) { setLocation("/results"); return; }
      const queue = JSON.parse(raw) as ReviewItem[];
      if (!queue || queue.length === 0) { setLocation("/results"); return; }

      const resultRaw = sessionStorage.getItem("verbaSessionResult");
      if (resultRaw) {
        const result = JSON.parse(resultRaw) as { deck?: string | null; difficulty?: string | null };
        reviewDeckRef.current = result.deck ?? "gre";
        reviewDifficultyRef.current = result.difficulty ?? null;
      }

      originalQueueRef.current = queue;
      setReviewQueue(queue);
      setInitialQueueSize(queue.length);
      setLoading(false);
    } catch {
      setLocation("/results");
    }
  }, [isReverseMode]);

  // ── Reverse mode: load fresh distractors on word change ─────────────────
  useEffect(() => {
    if (!isReverseMode || reviewQueue.length === 0) return;
    const current = reviewQueue[0];
    setReverseOptionsLoading(true);
    setReverseOptions([]);
    getReverseDistractors(current.word, reviewDeckRef.current, reviewDifficultyRef.current)
      .then((distractors) => {
        setReverseOptions(shuffleArray([current.word, ...distractors]));
        setReverseOptionsLoading(false);
      })
      .catch(() => {
        setReverseOptions([current.word]);
        setReverseOptionsLoading(false);
      });
  }, [isReverseMode, reverseWordKey, reviewQueue[0]?.id]);

  const handleRetry = useCallback(() => setFetchKey((k) => k + 1), []);

  // ── Normal mode: derived ─────────────────────────────────────────────────
  const currentWord: QuizWord | undefined = quizWords[currentIndex];

  const shuffledOptions = useMemo(() => {
    if (!currentWord || isReverseMode) return [];
    return shuffleArray([currentWord.correctDefinition, ...currentWord.distractors]);
  }, [currentWord, isReverseMode]);

  // ── Reverse mode: derived ────────────────────────────────────────────────
  const currentReviewWord: ReviewItem | undefined = reviewQueue[0];

  // ── Normal mode handlers ─────────────────────────────────────────────────
  function handleSelectOption(option: string) {
    if (isAnswered || !currentWord) return;
    setSelectedOption(option);
    setIsAnswered(true);
    if (option === currentWord.correctDefinition) {
      playCorrectSound();
    } else {
      wrongAnswersRef.current.set(currentIndex, option);
    }
    setTimeout(() => setShowFeedback(true), 400);
  }

  function handleNext() {
    setShowFeedback(false);
    setTimeout(() => {
      if (currentIndex + 1 >= quizWords.length) {
        const elapsedMs = Date.now() - startTimeRef.current;
        const missedWords = Array.from(wrongAnswersRef.current.entries()).map(([idx, selectedAnswer]) => ({
          ...quizWords[idx],
          selectedAnswer,
        }));
        const result = {
          correct: quizWords.length - wrongAnswersRef.current.size,
          total: quizWords.length,
          missedWords,
          elapsedMs,
          wordCount: quizWords.length,
          deck: deckParam,
          difficulty: difficultyParam,
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

  // ── Reverse mode handlers ────────────────────────────────────────────────
  function handleSelectReverseOption(option: string) {
    if (isAnswered || !currentReviewWord || reverseOptionsLoading) return;
    setSelectedOption(option);
    setIsAnswered(true);
    if (option === currentReviewWord.word) {
      playCorrectSound();
    } else {
      const key = String(currentReviewWord.id);
      reverseRetryCountRef.current.set(key, (reverseRetryCountRef.current.get(key) ?? 0) + 1);
    }
  }

  // Auto-advance in reverse mode after the user picks an option
  useEffect(() => {
    if (!isReverseMode || !isAnswered) return;
    const correct = selectedOption === currentReviewWord?.word;
    const t = setTimeout(() => handleReverseNext(), correct ? 900 : 1300);
    return () => clearTimeout(t);
  }, [isReverseMode, isAnswered, selectedOption, currentReviewWord]);

  function handleReverseNext() {
    setShowFeedback(false);
    setTimeout(() => {
      if (!currentReviewWord) return;
      const isCorrect = selectedOption === currentReviewWord.word;
      let newQueue = reviewQueue.slice(1);

      if (!isCorrect) {
        newQueue = [...newQueue, currentReviewWord];
      } else {
        setReverseMasteredCount((c) => c + 1);
      }

      if (newQueue.length === 0) {
        const mastered = originalQueueRef.current.map((item) => ({
          id: item.id,
          word: item.word,
          retries: reverseRetryCountRef.current.get(String(item.id)) ?? 0,
        }));
        try {
          const existing = new Set(
            JSON.parse(localStorage.getItem("verba_mastered_words") ?? "[]") as string[],
          );
          originalQueueRef.current.forEach((item) => existing.add(String(item.id)));
          localStorage.setItem("verba_mastered_words", JSON.stringify([...existing]));
        } catch { /* storage unavailable */ }
        sessionStorage.setItem("verbaReviewMastered", JSON.stringify(mastered));
        setLocation("/review-complete");
        return;
      }

      setReviewQueue(newQueue);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowTranslation(false);
      setShowFeedback(false);
      setReverseWordKey((k) => k + 1);
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
  if (!isReverseMode && !currentWord) return null;
  if (isReverseMode && !currentReviewWord) return null;

  // ── Computed values ──────────────────────────────────────────────────────
  const animKey = isReverseMode ? reverseWordKey : wordKey;
  const correctAnswer = isReverseMode ? currentReviewWord!.word : currentWord!.correctDefinition;
  const activeOptions = isReverseMode ? reverseOptions : shuffledOptions;
  const isCorrect = selectedOption === correctAnswer;
  const feedbackWord = isReverseMode ? reviewItemToFeedbackWord(currentReviewWord!) : toFeedbackWord(currentWord!);
  const handleSelectActive = isReverseMode ? handleSelectReverseOption : handleSelectOption;
  const handleNextActive = isReverseMode ? handleReverseNext : handleNext;

  const progress = isReverseMode
    ? (reverseMasteredCount / Math.max(initialQueueSize, 1)) * 100
    : (currentIndex / Math.max(quizWords.length, 1)) * 100;

  const counterLabel = isReverseMode
    ? `${reverseMasteredCount} / ${initialQueueSize}`
    : `${currentIndex + 1} / ${quizWords.length}`;

  const isLastNormal = !isReverseMode && currentIndex + 1 >= quizWords.length;

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
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", flex: 1, alignItems: "center", padding: "0 20px 120px", gap: 16 }}>

        {/* Prompt */}
        <AnimatePresence mode="wait">
          <motion.div
            key={animKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 24, paddingBottom: 8, width: "100%", maxWidth: 440 }}
          >
            {isReverseMode ? (
              <>
                {/* Reverse: show definition */}
                <p style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 400,
                  fontSize: "clamp(18px, 4.5vw, 24px)",
                  lineHeight: 1.4,
                  color: "rgba(255,255,255,0.95)",
                  margin: 0,
                  textAlign: "center",
                  padding: "20px 8px 28px",
                }}>
                  {currentReviewWord!.correctDefinition}
                </p>

              </>
            ) : (
              <>
                {/* Normal: show word */}
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(36px, 9vw, 64px)", lineHeight: 1.3, color: "#C7B8E8", margin: 0, textAlign: "center", width: "100%", maxWidth: "100%", padding: "20px 32px 32px 32px", boxSizing: "border-box", overflow: "visible", whiteSpace: "nowrap", wordBreak: "keep-all" }}>
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
            )}
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
            style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 440 }}
          >
            {isReverseMode && reverseOptionsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                <Loader2 size={22} strokeWidth={1.5} color="#F59E0B" className="animate-spin" />
              </div>
            ) : (
              activeOptions.map((option, i) => (
                <motion.button
                  key={option}
                  data-testid={`option-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25, ease: "easeOut" }}
                  onClick={() => handleSelectActive(option)}
                  disabled={isAnswered || (isReverseMode && reverseOptionsLoading)}
                  style={{
                    ...getOptionStyle(option, correctAnswer, selectedOption, isAnswered),
                    borderRadius: 12,
                    padding: isReverseMode ? "14px 18px" : "15px 18px",
                    cursor: isAnswered ? "default" : "pointer",
                    fontFamily: isReverseMode ? "'Space Grotesk', sans-serif" : "'Inter', sans-serif",
                    fontWeight: isReverseMode ? 500 : 300,
                    fontSize: isReverseMode ? "1.1rem" : "0.88rem",
                    color: isReverseMode ? "#C7B8E8" : "rgba(255,255,255,0.85)",
                    textAlign: isReverseMode ? "center" : "left",
                    transition: "border 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
                    outline: "none",
                    lineHeight: 1.4,
                  }}
                >
                  {option}
                </motion.button>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* Floating Next button — normal mode only */}
        {!isReverseMode && (
          <AnimatePresence>
            {isAnswered && !showFeedback && (
              <motion.button
                data-testid="button-next-floating"
                onClick={handleNext}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                whileTap={{ scale: 0.96 }}
                style={{ display: "block", width: "auto", maxWidth: 200, margin: "8px auto 0", padding: "12px 32px", borderRadius: 9999, border: "none", cursor: "pointer", background: "linear-gradient(to right, #B45309, #C2410C)", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 15, letterSpacing: "0.04em", color: "#FFFFFF", outline: "none", boxShadow: "0 0 12px rgba(217,119,6,0.25)" }}
              >
                {isLastNormal ? "Finish" : "Next →"}
              </motion.button>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Feedback card — normal mode only */}
      {!isReverseMode && (
        <FeedbackCard
          show={showFeedback}
          word={feedbackWord}
          isCorrect={isCorrect}
          isLast={isLastNormal}
          onDismiss={() => setShowFeedback(false)}
          onNext={handleNext}
          allowMinimize={true}
        />
      )}
    </div>
  );
}
