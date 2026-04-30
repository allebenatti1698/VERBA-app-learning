import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useSearch } from "wouter";
import AppBackground from "@/components/AppBackground";
import FeedbackCard from "@/components/FeedbackCard";

// TODO: Replace with database fetch from user's deck (Step 4)
const QUIZ_WORDS = [
  {
    id: 1,
    word: "ephemeral",
    phonetic: "/ɪˈfɛm.ər.əl/",
    correctDefinition: "Lasting for a very short time",
    distractors: [
      "Occurring at irregular intervals",
      "Lasting forever without end",
      "Happening repeatedly over time",
    ],
    italianTranslation: "effimero",
    italianDefinition: "che dura per un tempo molto breve",
    exampleSentence: "The ephemeral beauty of cherry blossoms makes them all the more precious.",
    synonyms: ["fleeting", "transient", "momentary"],
    antonyms: ["eternal", "perpetual", "enduring"],
    etymology: "From Greek 'ephēmeros', meaning 'lasting only a day' (epi- 'on' + hēmera 'day')",
  },
  {
    id: 2,
    word: "luminous",
    phonetic: "/ˈluː.mɪ.nəs/",
    correctDefinition: "Emitting or reflecting a bright, steady light",
    distractors: [
      "Characterized by darkness or shadow",
      "Extremely heavy and opaque",
      "Moving with great speed",
    ],
    italianTranslation: "luminoso",
    italianDefinition: "che emette o riflette una luce brillante",
    exampleSentence: "The luminous full moon cast silver shadows across the forest floor.",
    synonyms: ["radiant", "shining", "brilliant"],
    antonyms: ["dark", "dim", "murky"],
    etymology: "From Latin 'luminosus', from 'lumen' meaning 'light'",
  },
  {
    id: 3,
    word: "cogent",
    phonetic: "/ˈkəʊ.dʒənt/",
    correctDefinition: "Convincingly clear and logical",
    distractors: [
      "Confused and incoherent in reasoning",
      "Emotionally charged and passionate",
      "Repetitive and unnecessarily wordy",
    ],
    italianTranslation: "convincente",
    italianDefinition: "chiaro, logico e persuasivo",
    exampleSentence: "She presented a cogent argument that swayed the entire committee.",
    synonyms: ["compelling", "persuasive", "sound"],
    antonyms: ["weak", "unconvincing", "flawed"],
    etymology: "From Latin 'cogere', meaning 'to compel or drive together'",
  },
  {
    id: 4,
    word: "liminal",
    phonetic: "/ˈlɪm.ɪ.nəl/",
    correctDefinition: "Relating to a transitional or initial stage between two states",
    distractors: [
      "Marked by strong clarity and definition",
      "Relating to the innermost part of something",
      "Describing a state of permanent stability",
    ],
    italianTranslation: "liminale",
    italianDefinition: "relativo a uno stadio di transizione tra due condizioni",
    exampleSentence: "Graduation is a liminal moment — neither student nor professional.",
    synonyms: ["transitional", "threshold", "borderline"],
    antonyms: ["central", "established", "settled"],
    etymology: "From Latin 'limen', meaning 'threshold'",
  },
  {
    id: 5,
    word: "querulous",
    phonetic: "/ˈkwɛr.ʊ.ləs/",
    correctDefinition: "Complaining in a petulant or whining manner",
    distractors: [
      "Expressing joy and contentment openly",
      "Characterized by calm acceptance",
      "Tending to ask thoughtful questions",
    ],
    italianTranslation: "lamentoso",
    italianDefinition: "che si lamenta in modo petulante e piagnucoloso",
    exampleSentence: "The querulous passenger complained about every minor delay.",
    synonyms: ["petulant", "grumbling", "whining"],
    antonyms: ["content", "placid", "satisfied"],
    etymology: "From Latin 'querulus', from 'queri' meaning 'to complain'",
  },
  {
    id: 6,
    word: "ineffable",
    phonetic: "/ɪˈnɛf.ə.bəl/",
    correctDefinition: "Too great or extreme to be expressed in words",
    distractors: [
      "Easily described with simple language",
      "Offensive or inappropriate to say aloud",
      "Capable of being efficiently summarized",
    ],
    italianTranslation: "ineffabile",
    italianDefinition: "talmente grande da non poter essere espresso a parole",
    exampleSentence: "Standing before the Grand Canyon, she felt an ineffable sense of awe.",
    synonyms: ["inexpressible", "indescribable", "unspeakable"],
    antonyms: ["expressible", "describable", "mundane"],
    etymology: "From Latin 'in-' (not) + 'effabilis' (utterable), from 'effari' meaning 'to speak out'",
  },
  {
    id: 7,
    word: "tenuous",
    phonetic: "/ˈtɛn.ju.əs/",
    correctDefinition: "Very weak or slight; lacking substance",
    distractors: [
      "Extremely strong and firmly established",
      "Densely packed and highly concentrated",
      "Bold and unmistakably clear",
    ],
    italianTranslation: "tenue",
    italianDefinition: "molto debole o sottile; privo di sostanza",
    exampleSentence: "The detective's case rested on a tenuous chain of circumstantial evidence.",
    synonyms: ["fragile", "flimsy", "slight"],
    antonyms: ["strong", "solid", "substantial"],
    etymology: "From Latin 'tenuis', meaning 'thin' or 'slender'",
  },
  {
    id: 8,
    word: "obsequious",
    phonetic: "/əbˈsiː.kwi.əs/",
    correctDefinition: "Excessively eager to please or serve; servile",
    distractors: [
      "Proudly resistant to authority",
      "Indifferent to the opinions of others",
      "Straightforward and bluntly honest",
    ],
    italianTranslation: "ossequioso",
    italianDefinition: "eccessivamente desideroso di compiacere; servile",
    exampleSentence: "The obsequious waiter hovered constantly, refilling glasses after every sip.",
    synonyms: ["sycophantic", "fawning", "servile"],
    antonyms: ["assertive", "defiant", "independent"],
    etymology: "From Latin 'obsequium' meaning 'compliance', from 'obsequi' meaning 'to follow'",
  },
  {
    id: 9,
    word: "sanguine",
    phonetic: "/ˈsæŋ.ɡwɪn/",
    correctDefinition: "Optimistic, especially in a difficult situation",
    distractors: [
      "Deeply pessimistic about future outcomes",
      "Relating to blood or bloody conflict",
      "Cautious and reluctant to act",
    ],
    italianTranslation: "sanguigno",
    italianDefinition: "ottimista, specialmente in situazioni difficili",
    exampleSentence: "Despite the poor forecast, the coach remained sanguine about their chances.",
    synonyms: ["optimistic", "hopeful", "positive"],
    antonyms: ["pessimistic", "despondent", "gloomy"],
    etymology: "From Latin 'sanguineus' meaning 'of blood' — blood was thought to cause cheerfulness",
  },
  {
    id: 10,
    word: "reverie",
    phonetic: "/ˈrɛv.ər.i/",
    correctDefinition: "A state of pleasant, dreamy absorption in one's thoughts",
    distractors: [
      "A state of intense focused concentration",
      "A sudden feeling of dread or anxiety",
      "A period of intense physical activity",
    ],
    italianTranslation: "fantasticheria",
    italianDefinition: "uno stato di piacevole assorbimento nei propri pensieri",
    exampleSentence: "She was lost in reverie, picturing herself on a distant tropical beach.",
    synonyms: ["daydream", "musing", "meditation"],
    antonyms: ["alertness", "attentiveness", "reality"],
    etymology: "From Old French 'reverie', from 'rever' meaning 'to dream or wander in thought'",
  },
];

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

export default function QuizScreen() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const totalWords = Math.min(Math.max(Number(params.get("words")) || 10, 1), QUIZ_WORDS.length);

  const words = useMemo(() => QUIZ_WORDS.slice(0, totalWords), [totalWords]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [wordKey, setWordKey] = useState(0);

  const startTimeRef = useRef<number>(Date.now());
  const wrongAnswersRef = useRef<Map<number, string>>(new Map());

  const currentWord = words[currentIndex];

  const shuffledOptions = useMemo(() => {
    const opts = [currentWord.correctDefinition, ...currentWord.distractors];
    return shuffleArray(opts);
  }, [currentWord]);

  function handleSelectOption(option: string) {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    if (option === currentWord.correctDefinition) {
      playCorrectSound();
    } else {
      wrongAnswersRef.current.set(currentIndex, option);
    }
    setTimeout(() => setShowFeedback(true), 400);
  }

  function handleDismissFeedback() {
    setShowFeedback(false);
  }

  function handleNext() {
    setShowFeedback(false);
    setTimeout(() => {
      if (currentIndex + 1 >= words.length) {
        const elapsedMs = Date.now() - startTimeRef.current;
        const missedWords = Array.from(wrongAnswersRef.current.entries()).map(([idx, selectedAnswer]) => ({
          ...words[idx],
          selectedAnswer,
        }));
        const result = {
          correct: words.length - wrongAnswersRef.current.size,
          total: words.length,
          missedWords,
          elapsedMs,
          wordCount: totalWords,
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

  function getOptionStyle(option: string): React.CSSProperties {
    if (!isAnswered) {
      return {
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(217,119,6,0.18)",
        boxShadow: "none",
      };
    }
    if (option === currentWord.correctDefinition) {
      return {
        background: "rgba(16,185,129,0.08)",
        border: "1.5px solid #10B981",
        boxShadow: "0 0 16px rgba(16,185,129,0.25)",
      };
    }
    if (option === selectedOption) {
      return {
        background: "rgba(239,68,68,0.08)",
        border: "1.5px solid #EF4444",
        boxShadow: "0 0 16px rgba(239,68,68,0.2)",
      };
    }
    return {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(217,119,6,0.08)",
    };
  }

  const isCorrect = selectedOption === currentWord.correctDefinition;
  const progress = (currentIndex / words.length) * 100;

  return (
    <div style={{
      minHeight: "100dvh",
      width: "100%",
      background: "#0A0A0A",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
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
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 300,
          fontSize: "0.72rem",
          color: "rgba(255,255,255,0.3)",
          textAlign: "center",
          marginTop: 8,
          letterSpacing: "0.08em",
        }}>
          {currentIndex + 1} / {words.length}
        </p>
      </div>

      {/* Main content */}
      <div style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        flex: 1,
        alignItems: "center",
        padding: "0 20px 120px",
        gap: 16,
      }}>
        {/* Word display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={wordKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              paddingTop: 24,
              paddingBottom: 8,
              width: "100%",
              maxWidth: 440,
            }}
          >
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(36px, 9vw, 64px)",
              lineHeight: 1.3,
              color: "#C7B8E8",
              margin: 0,
              textAlign: "center",
              width: "100%",
              maxWidth: "100%",
              padding: "20px 32px 32px 32px",
              boxSizing: "border-box",
              overflow: "visible",
              whiteSpace: "nowrap",
              wordBreak: "keep-all",
            }}>
              {currentWord.word}
            </h2>

            {/* Hint button */}
            <motion.button
              onClick={() => setShowTranslation((v) => !v)}
              whileTap={{ scale: 0.95 }}
              style={{
                marginTop: 8,
                background: "none",
                border: "1px solid rgba(217,119,6,0.25)",
                borderRadius: 9999,
                padding: "4px 12px",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 300,
                fontSize: "0.72rem",
                color: "rgba(217,119,6,0.5)",
                letterSpacing: "0.03em",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",
                opacity: 0.7,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,0.9)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.5)";
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(217,119,6,0.5)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(217,119,6,0.25)";
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
              }}
            >
              💡 hint
            </motion.button>

            {/* Translation card */}
            <AnimatePresence>
              {showTranslation && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{ overflow: "hidden", width: "100%" }}
                >
                  <div style={{
                    marginTop: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(217,119,6,0.2)",
                    borderRadius: 12,
                    padding: "14px 18px",
                  }}>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "1rem", color: "#D97706", margin: 0 }}>
                      {currentWord.italianTranslation}
                    </p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", margin: "6px 0 0", fontStyle: "italic" }}>
                      {currentWord.italianDefinition}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Answer options */}
        <AnimatePresence mode="wait">
          <motion.div
            key={wordKey + "-opts"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 440 }}
          >
            {shuffledOptions.map((option, i) => (
              <motion.button
                key={option}
                data-testid={`option-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.25, ease: "easeOut" }}
                onClick={() => handleSelectOption(option)}
                disabled={isAnswered}
                style={{
                  ...getOptionStyle(option),
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
                {option}
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Floating Next button — visible only when answered and card is dismissed */}
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
              style={{
                display: "block",
                width: "auto",
                maxWidth: 200,
                margin: "8px auto 0",
                padding: "12px 32px",
                borderRadius: 9999,
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(to right, #B45309, #C2410C)",
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                fontSize: 15,
                letterSpacing: "0.04em",
                color: "#FFFFFF",
                outline: "none",
                boxShadow: "0 0 12px rgba(217,119,6,0.25)",
              }}
            >
              {currentIndex + 1 >= words.length ? "Finish" : "Next →"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Feedback card (modular) */}
      <FeedbackCard
        show={showFeedback}
        word={currentWord}
        isCorrect={isCorrect}
        isLast={currentIndex + 1 >= words.length}
        onDismiss={handleDismissFeedback}
        onNext={handleNext}
      />
    </div>
  );
}
