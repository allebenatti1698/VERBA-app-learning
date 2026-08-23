> ATTENZIONE — file di sola documentazione. NON è codice compilato, NON va
> importato. Conserva verbatim la schermata di digitazione rimossa da
> QuizScreen.tsx, per ricostruirla come "gradino 3 — Produce".

## 1. Il tipo ReviewItem

```tsx
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
```

## 2. Dichiarazioni di state e ref reverse-only

```tsx
  // ── Reverse mode state ───────────────────────────────────────────────────
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [initialQueueSize, setInitialQueueSize] = useState(0);
  const [reverseMasteredCount, setReverseMasteredCount] = useState(0);
  const [reverseWordKey, setReverseWordKey] = useState(0);
  const originalQueueRef = useRef<ReviewItem[]>([]);
  const reverseRetryCountRef = useRef<Map<string, number>>(new Map());
  const reviewDeckRef = useRef<string>("gre");
  const reviewDifficultyRef = useRef<string | null>(null);

  // Free-text reverse typing state
  const [typedAnswer, setTypedAnswer] = useState("");
  const [reverseResult, setReverseResult] = useState<null | "correct" | "near" | "wrong">(null);
  const reverseInputRef = useRef<HTMLInputElement>(null);
  const shakeControls = useAnimationControls();
  const reverseAdvancingRef = useRef(false);
```

## 3. I due useEffect reverse-only

```tsx
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
```

```tsx
  // ── Reverse mode: reset typing + autofocus on word change ────────────────
  useEffect(() => {
    if (!isReverseMode) return;
    setTypedAnswer("");
    setReverseResult(null);
    reverseAdvancingRef.current = false;
    const t = setTimeout(() => reverseInputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [isReverseMode, reverseWordKey]);
```

## 4. shakeReverse, submitReverseTyping, handleReverseNext, reviewItemToFeedbackWord

```tsx
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
```

```tsx
  // ── Reverse mode handlers ────────────────────────────────────────────────
  function shakeReverse(kind: "hard" | "soft") {
    shakeControls.start({
      x: kind === "hard" ? [0, -11, 10, -8, 6, -4, 2, 0] : [0, -4, 3, -2, 0],
      transition: { duration: kind === "hard" ? 0.42 : 0.3, ease: "easeInOut" },
    });
  }

  function submitReverseTyping() {
    if (!currentReviewWord || reverseResult === "correct" || reverseResult === "wrong") return;
    const target = currentReviewWord.word;
    const guess = typedAnswer.trim().toLowerCase();
    if (!guess) return;
    const dist = damerauLevenshtein(guess, target.toLowerCase());
    const thr = nearMissThreshold(target.length);
    if (dist === 0) {
      setReverseResult("correct");
      playCorrectSound();
    } else if (dist <= thr) {
      setReverseResult("near");
      shakeReverse("soft");
      setTimeout(() => reverseInputRef.current?.focus(), 0);
    } else {
      setReverseResult("wrong");
      shakeReverse("hard");
      const key = String(currentReviewWord.id);
      reverseRetryCountRef.current.set(key, (reverseRetryCountRef.current.get(key) ?? 0) + 1);
    }
  }

  function handleReverseNext(wasCorrect: boolean) {
    if (reverseAdvancingRef.current) return;
    reverseAdvancingRef.current = true;
    setShowFeedback(false);
    setTimeout(() => {
      if (!currentReviewWord) return;
      let newQueue = reviewQueue.slice(1);

      if (!wasCorrect) {
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
```

## 5. Ramo TRUE del ternario che mostra la definizione (~riga 499)

```tsx
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
                  {lowercaseFirst(currentReviewWord!.correctDefinition)}
                </p>

              </>
```

## 6. Ramo TRUE del ternario che mostra l'input di digitazione (~riga 571)

```tsx
              <motion.div animate={shakeControls} style={{ width: "100%" }}>
                {reverseResult === "correct" || reverseResult === "wrong" ? (
                  <>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13,
                      letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center", margin: 0,
                      color: reverseResult === "correct" ? "#10B981" : "#EF4444" }}>
                      {reverseResult === "correct" ? "✓ Correct" : "✗ Incorrect"}
                    </p>
                    {reverseResult === "correct" && (
                      <motion.p
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.34, ease: [0.2, 1.3, 0.4, 1] }}
                        style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 26,
                          color: "#C7B8E8", margin: "12px 0 0", textAlign: "center" }}
                      >
                        {currentReviewWord!.word}
                      </motion.p>
                    )}
                    {reverseResult === "wrong" && (
                      <div style={{ textAlign: "center", marginTop: 12 }}>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 11,
                          letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)",
                          margin: "0 0 2px" }}>the word was</p>
                        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 26,
                          color: "#C7B8E8", margin: 0 }}>{currentReviewWord!.word}</p>
                      </div>
                    )}
                    <motion.button
                      whileTap={tapScale()}
                      transition={TAP_SPRING}
                      onClick={() => handleReverseNext(reverseResult === "correct")}
                      style={{ ...primaryButtonStyle, display: "block", margin: "20px auto 0", touchAction: "manipulation" }}>
                      {reverseResult === "correct" && reviewQueue.length <= 1 ? "Finish" : "Next →"}
                    </motion.button>
                  </>
                ) : (
                  <>
                    {reverseResult === "near" && (
                      <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13,
                        letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center",
                        color: "#FACC15", margin: "0 0 12px" }}>
                        ≈ Almost — check your spelling
                      </p>
                    )}
                    <input
                      ref={reverseInputRef}
                      value={typedAnswer}
                      onChange={(e) => { setTypedAnswer(e.target.value); if (reverseResult === "near") setReverseResult(null); }}
                      onKeyDown={(e) => { if (e.key === "Enter") submitReverseTyping(); }}
                      placeholder="type the word…"
                      autoComplete="off"
                      style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${reverseResult === "near" ? "rgba(250,204,21,0.65)" : "rgba(217,119,6,0.28)"}`,
                        borderRadius: 14, padding: "14px 18px", fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 500, fontSize: "1.05rem", color: "#C7B8E8", textAlign: "left", outline: "none" }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={submitReverseTyping}
                      style={{ ...primaryButtonStyle, display: "block", margin: "10px auto 0" }}>
                      Check
                    </motion.button>
                  </>
                )}
              </motion.div>
```

## 7. Valori di stile reverse-only presi dai ternari inline

Formato: "proprietà: valore-reverse (valore-normale)"

- justifyContent: space-between (flex-start)
- padding (wrapper contenuto principale): 0 20px 40px (0 20px 120px)
- paddingTop (wrapper del prompt animato): 80 (24)
- padding (bottone opzione): 14px 18px (15px 18px)
- fontFamily (bottone opzione): 'Space Grotesk', sans-serif ('Inter', sans-serif)
- fontWeight (bottone opzione): 500 (300)
- fontSize (bottone opzione): 1.1rem (0.88rem)
- color (bottone opzione): #C7B8E8 (rgba(255,255,255,0.85))
- textAlign (bottone opzione): center (left)
- testo bottone opzione: option (lowercaseFirst(option))
