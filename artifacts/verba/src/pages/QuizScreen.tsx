import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import AppBackground from "@/components/AppBackground";
import FeedbackCard, { type QuizWord as FeedbackQuizWord } from "@/components/FeedbackCard";
import { fetchQuizWords, fetchWordsByIds, type QuizWord } from "@/lib/quizQueries";
import { parseSetsParam, getWordIdsForSelection } from "@/lib/studySets";
import { primaryButtonStyle } from "@/lib/primaryButtonStyle";
import { recordAnswer, getWordStat, formatForWord, type AnswerFormat } from "@/lib/wordStats";
import { undismissTrouble } from "@/lib/troubleDismiss";
import { tapScale, TAP_SPRING } from "@/components/SpringTap";
import RecognizeQuestion from "@/components/quiz/RecognizeQuestion";
import ContextQuestion from "@/components/quiz/ContextQuestion";
// I ritardi di rivelazione appartengono al formato, non all'orchestratore:
// se cambia la durata del vortice devono cambiare da soli.

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

// ─── Orchestratore ────────────────────────────────────────────────────────────
// Questo componente NON disegna le domande. Sceglie il formato, tiene lo stato
// di sessione e registra la risposta. Ogni formato è un componente in
// src/components/quiz/, e nessuno di loro tocca wordStats.

export default function QuizScreen() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);

  const requestedWords = Math.max(Number(params.get("words")) || 10, 1);
  const deckParam = params.get("deck") ?? null;
  const difficultyParam = params.get("difficulty") ?? null;
  const setsParam = params.get("sets") ?? null;
  const sourceParam = params.get("source") ?? null;

  // ── Stato di sessione ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  // Il Next non appare a risposta data, ma a rivelazione avvenuta: nel gradino 2
  // la parola giusta impiega più di un secondo a comporsi, ed è lì che si impara.
  const [revealReady, setRevealReady] = useState(false);

  const [quizWords, setQuizWords] = useState<QuizWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordKey, setWordKey] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const wrongAnswersRef = useRef<Map<number, string>>(new Map());

  // ── Caricamento parole ───────────────────────────────────────────────────
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
        ? fetchWordsByIds(dueIds.slice(0, requestedWords)).then((ws) => shuffleArray(ws))
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
        setIsCorrect(false);
        setShowFeedback(false);
        setRevealReady(false);
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

  const currentWord: QuizWord | undefined = quizWords[currentIndex];

  /**
   * Il formato con cui questa parola va interrogata ADESSO.
   * Calcolato una volta sola quando la parola diventa corrente, e tenuto fermo
   * fino alla successiva: recordAnswer modifica il gradino della parola, quindi
   * ricalcolarlo dopo la risposta darebbe un valore diverso da quello con cui
   * l'utente ha effettivamente risposto.
   */
  const currentFormat: AnswerFormat = useMemo(() => {
    if (!currentWord) return 1;
    const f = formatForWord(currentWord.id);
    // Ripiego: se la parola non ha i dati del gradino 2, si interroga con quello
    // che c'è. Un formato senza dati deve degradare a una domanda che funziona,
    // mai a una schermata vuota. Il gradino registrato è quello EFFETTIVO.
    if (f === 2 && !currentWord.contextStem) return 1;
    if (f === 2 && (currentWord.contextDistractors ?? []).length < 3) return 1;
    return f;
  }, [currentWord]);

  // ── Risposta ─────────────────────────────────────────────────────────────
  // Unico punto dell'app in cui una risposta del quiz entra nell'SRS.
  function handleSelect(option: string, correct: boolean, revealDelayMs = 400) {
    if (isAnswered || !currentWord) return;
    setSelectedOption(option);
    setIsAnswered(true);
    setIsCorrect(correct);
    recordAnswer(currentWord.id, correct, currentFormat);
    if (correct) {
      playCorrectSound();
    } else {
      wrongAnswersRef.current.set(currentIndex, option);
      undismissTrouble(currentWord.id);
    }
    setTimeout(() => {
      setRevealReady(true);
      setShowFeedback(true);
    }, revealDelayMs);
  }

  function handleNext() {
    setShowFeedback(false);
    setTimeout(() => {
      if (currentIndex + 1 >= quizWords.length) {
        const elapsedMs = Date.now() - startTimeRef.current;

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
      setIsCorrect(false);
      setShowFeedback(false);
      setRevealReady(false);
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

  if (!currentWord) return null;

  const feedbackWord = toFeedbackWord(currentWord);
  const progress = (currentIndex / Math.max(quizWords.length, 1)) * 100;
  const counterLabel = `${currentIndex + 1} / ${quizWords.length}`;
  const isLast = currentIndex + 1 >= quizWords.length;

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

        {/*
          Selettore di formato. Oggi MAX_AVAILABLE_LEVEL = 1 in wordStats.ts,
          quindi formatForWord() restituisce sempre 1 e passa sempre di qui.
          Il gradino 2 (ContextQuestion) e il 3 (ProduceQuestion) si aggiungono
          come rami accanto a questo, senza toccare la logica di sessione.
          Il default resta Recognize: un formato non ancora costruito deve
          degradare a una domanda che funziona, mai a una schermata vuota.
        */}
        {currentFormat === 2 ? (
          <ContextQuestion
            word={currentWord}
            isAnswered={isAnswered}
            selectedOption={selectedOption}
            onSelect={handleSelect}
            animKey={wordKey}
          />
        ) : (
          <RecognizeQuestion
            word={currentWord}
            isAnswered={isAnswered}
            selectedOption={selectedOption}
            onSelect={handleSelect}
            animKey={wordKey}
          />
        )}

        {/* Floating Next button */}
        <AnimatePresence>
          {revealReady && !showFeedback && (
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
              {isLast ? "Finish" : "Next →"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <FeedbackCard
        show={showFeedback}
        word={feedbackWord}
        isCorrect={isCorrect}
        isLast={isLast}
        onDismiss={() => setShowFeedback(false)}
        onNext={handleNext}
        allowMinimize={true}
      />
    </div>
  );
}
