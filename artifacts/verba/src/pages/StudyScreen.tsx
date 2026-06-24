import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, Play, Eye, EyeOff, Star, GraduationCap, BookOpen, Library } from "lucide-react";
import AppBackground from "@/components/AppBackground";
import { lowercaseFirst } from "@/lib/formatText";
import { getStudySets, type StudySet } from "@/lib/studySets";
import { getCompletedSetNumbers, getLastStudied, getSeenCount, markWordsSeen, setLastStudied } from "@/lib/studyProgress";
import { fetchWordsByIds, type QuizWord } from "@/lib/quizQueries";
import { FeedbackWord, FeedbackSynonyms, FeedbackAntonyms, FeedbackTranslation, FeedbackEtymology, FeedbackMultiDefinitions } from "@/components/FeedbackCard";

const DECK = "gre";
const LAVENDER = "#C7B8E8";
const TIERS = [
  { difficulty: "easy", label: "Common" },
  { difficulty: "medium", label: "Uncommon" },
  { difficulty: "hard", label: "Rare" },
];

const DECK_OPTIONS = [
  { id: "gre", name: "GRE Vocabulary", Icon: GraduationCap, color: "#A78BFA", active: true },
  { id: "essential", name: "Essential English", Icon: BookOpen, color: "#7DD3FC", active: false },
  { id: "advanced", name: "Advanced English", Icon: Library, color: "#7DD3FC", active: false },
  { id: "myverba", name: "My Verba", Icon: Star, color: "#E8E8E8", active: false },
];

type SetsByDifficulty = Record<string, StudySet[]>;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function highlightWord(text: string, word: string) {
  if (!text || !word) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(word)})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === word.toLowerCase()
      ? <span key={i} style={{ color: "#C7B8E8" }}>{p}</span>
      : <span key={i}>{p}</span>,
  );
}
const MY_WORDS_KEY = "verba_my_words";
function loadMyWords(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(MY_WORDS_KEY) ?? "[]") as string[]); }
  catch { return new Set(); }
}
function isInMyWords(id: string): boolean {
  return loadMyWords().has(id);
}
function toggleMyWord(id: string): boolean {
  const set = loadMyWords();
  let nowSaved: boolean;
  if (set.has(id)) { set.delete(id); nowSaved = false; }
  else { set.add(id); nowSaved = true; }
  try { localStorage.setItem(MY_WORDS_KEY, JSON.stringify([...set])); } catch { /* storage non disponibile */ }
  return nowSaved;
}

export default function StudyScreen() {
  const [setsByDiff, setSetsByDiff] = useState<SetsByDifficulty>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [browse, setBrowse] = useState<{ difficulty: string; setNumber: number } | null>(null);
  const [deckMenuOpen, setDeckMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all(TIERS.map((t) => getStudySets(DECK, t.difficulty)))
      .then((results) => {
        if (!active) return;
        const map: SetsByDifficulty = {};
        TIERS.forEach((t, i) => { map[t.difficulty] = results[i]; });
        setSetsByDiff(map);
        setLoading(false);
      })
      .catch((e) => { if (active) { setError(e?.message ?? "Errore di caricamento"); setLoading(false); } });
    return () => { active = false; };
  }, []);

  if (browse) {
    const sets = setsByDiff[browse.difficulty] ?? [];
    const set = sets.find((s) => s.setNumber === browse.setNumber);
    const label = TIERS.find((t) => t.difficulty === browse.difficulty)?.label ?? "";
    return <BrowseView difficulty={browse.difficulty} label={label} set={set} onBack={() => setBrowse(null)} />;
  }

  return (
    <div style={{ minHeight: "100%", width: "100%", background: "#0A0A0A", position: "relative", overflow: "hidden" }}>
      <AppBackground showWords={false} />
      <div style={{ position: "absolute", top: -40, left: -30, width: 220, height: 200, background: "radial-gradient(circle, rgba(167,139,250,0.16), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -70, right: -40, width: 230, height: 210, background: "radial-gradient(circle, rgba(245,158,11,0.10), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 10, padding: "22px 18px 0", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontStyle: "italic", fontSize: 12, fontWeight: 400, color: "rgba(245,158,11,0.8)", letterSpacing: "0.04em" }}>Verba</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, color: "#F0EDF7", margin: 0 }}>Study</h1>
          <div style={{ position: "relative" }}>
            <button onClick={() => setDeckMenuOpen((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#A78BFA", border: "0.5px solid rgba(167,139,250,0.45)", borderRadius: 20, padding: "5px 11px", background: "rgba(167,139,250,0.07)", cursor: "pointer", outline: "none" }}>
              <GraduationCap size={14} color="#A78BFA" />
              GRE
              <ChevronDown size={14} color="#A78BFA" style={{ transform: deckMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
            </button>
            {deckMenuOpen && (
              <>
                <div onClick={() => setDeckMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, width: 210, background: "rgba(20,18,26,0.97)", border: "0.5px solid rgba(199,184,232,0.28)", borderRadius: 14, padding: 6, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                  {DECK_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      disabled={!d.active}
                      onClick={() => { if (d.active) setDeckMenuOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 10, border: "none", background: d.active ? "rgba(167,139,250,0.12)" : "transparent", cursor: d.active ? "pointer" : "default", opacity: d.active ? 1 : 0.4, outline: "none", textAlign: "left" }}
                    >
                      <d.Icon size={17} color={d.color} strokeWidth={1.6} />
                      <span style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12, color: d.active ? "#F0EDF7" : "#C8C8C8" }}>{d.name}</span>
                      {d.active
                        ? <Check size={15} color="#C7B8E8" />
                        : <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.06em", color: "#8A8A8A", border: "0.5px solid rgba(255,255,255,0.18)", borderRadius: 6, padding: "1px 6px" }}>SOON</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {loading && (<div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Loader2 size={26} color={LAVENDER} className="animate-spin" /></div>)}
        {error && (<p style={{ fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>{error}</p>)}

        {!loading && !error && (
          <>
            <ContinueCard setsByDiff={setsByDiff} onOpen={(d, n) => setBrowse({ difficulty: d, setNumber: n })} />
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#7E7E7E", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>By difficulty</p>
            {TIERS.map((tier) => {
              const sets = setsByDiff[tier.difficulty] ?? [];
              const completed = getCompletedSetNumbers(DECK, tier.difficulty, sets);
              const totalWords = sets.reduce((acc, s) => acc + s.wordCount, 0);
              const isOpen = expanded === tier.difficulty;
              return (
                <div key={tier.difficulty} style={{ border: "0.5px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: "12px 13px", marginBottom: 9 }}>
                  <button onClick={() => setExpanded(isOpen ? null : tier.difficulty)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0, outline: "none" }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, color: "#FFFFFF" }}>{tier.label}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#7E7E7E" }}>{totalWords} · {sets.length} sets</span>
                      {isOpen ? <ChevronUp size={15} color="#9A9A9A" /> : <ChevronDown size={15} color="#9A9A9A" />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }} style={{ overflow: "hidden" }}>
                        <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.08)", marginTop: 10, paddingTop: 4 }}>
                          {sets.map((s) => {
                            const seen = getSeenCount(DECK, tier.difficulty, s.setNumber);
                            const isDone = completed.includes(s.setNumber);
                            const pct = s.wordCount > 0 ? Math.min(100, Math.round((seen / s.wordCount) * 100)) : 0;
                            return (
                              <button key={s.setNumber} onClick={() => setBrowse({ difficulty: tier.difficulty, setNumber: s.setNumber })} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 2px", outline: "none" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: isDone ? "#E8E8E8" : "#C8C8C8" }}>Set {s.setNumber}</span>
                                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#6E6E6E" }}>{s.wordCount} words</span>
                                </span>
                                {isDone ? <Check size={16} color="#F59E0B" /> : seen > 0 ? (
                                  <span style={{ width: 46, height: 4, background: "rgba(255,255,255,0.10)", borderRadius: 2, display: "inline-block" }}><span style={{ display: "block", width: `${pct}%`, height: "100%", background: "#F59E0B", borderRadius: 2 }} /></span>
                                ) : <ChevronRight size={15} color="#5A5A5A" />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function ContinueCard({ setsByDiff, onOpen }: { setsByDiff: SetsByDifficulty; onOpen: (d: string, n: number) => void }) {
  const last = getLastStudied();
  if (!last || last.deck !== DECK) return null;
  const tier = TIERS.find((t) => t.difficulty === last.difficulty);
  const set = (setsByDiff[last.difficulty] ?? []).find((s) => s.setNumber === last.setNumber);
  if (!tier || !set) return null;
  const seen = getSeenCount(DECK, last.difficulty, last.setNumber);
  const pct = set.wordCount > 0 ? Math.min(100, Math.round((seen / set.wordCount) * 100)) : 0;
  return (
    <button onClick={() => onOpen(last.difficulty, last.setNumber)} style={{ width: "100%", textAlign: "left", border: "0.5px solid rgba(167,139,250,0.35)", background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(167,139,250,0.03))", borderRadius: 16, padding: 15, marginBottom: 20, cursor: "pointer", outline: "none" }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#A99CC4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Continue</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, color: "#E8E4F0" }}>{tier.label} · Set {set.setNumber}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#9A93AC", marginTop: 3 }}>{seen} of {set.wordCount} words</div>
        </div>
        <span style={{ width: 38, height: 38, borderRadius: "50%", background: "#A78BFA", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Play size={16} color="#1A1622" fill="#1A1622" /></span>
      </div>
      <div style={{ height: 4, background: "rgba(255,255,255,0.10)", borderRadius: 2, marginTop: 12 }}><div style={{ width: `${pct}%`, height: "100%", background: "#F59E0B", borderRadius: 2 }} /></div>
    </button>
  );
}

function BrowseView({ difficulty, label, set, onBack }: { difficulty: string; label: string; set?: StudySet; onBack: () => void }) {
  const [words, setWords] = useState<QuizWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [selfTest, setSelfTest] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!set) { setError("Set non trovato"); setLoading(false); return; }
    let active = true;
    setLoading(true); setError(null);
    fetchWordsByIds(set.wordIds)
      .then((w) => { if (!active) return; setWords(w); setIndex(0); setDir(1); setLoading(false); })
      .catch((e) => { if (active) { setError(e?.message ?? "Errore di caricamento"); setLoading(false); } });
    return () => { active = false; };
  }, [set]);

  const total = words.length;
  const current = words[index];

  useEffect(() => {
    if (!set || !current) return;
    markWordsSeen(DECK, difficulty, set.setNumber, [current.id]);
    setLastStudied(DECK, difficulty, set.setNumber);
  }, [index, current, set, difficulty]);

  useEffect(() => { setRevealed(false); }, [index, selfTest]);
  useEffect(() => { if (current) setSaved(isInMyWords(current.id)); }, [current]);

  function goNext() { setDir(1); setIndex((i) => Math.min(total - 1, i + 1)); }
  function goPrev() { setDir(-1); setIndex((i) => Math.max(0, i - 1)); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total]);

  function toggleStar() { if (!current) return; setSaved(toggleMyWord(current.id)); }

  const blurDef = selfTest && !revealed;
  function toggleEye() {
    if (blurDef) { setSelfTest(false); }
    else { setSelfTest(true); setRevealed(false); }
  }

  return (
    <div style={{ minHeight: "100%", width: "100%", background: "#0A0A0A", position: "relative", overflow: "hidden" }}>
      <AppBackground showWords={false} />
      <div style={{ position: "relative", zIndex: 10, padding: "18px 18px 0", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif", fontSize: 12, padding: 0, outline: "none" }}>
            <ChevronLeft size={18} /> {label}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {total > 0 && (<span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: LAVENDER }}>{index + 1} / {total}</span>)}
            <button onClick={toggleEye} aria-label="Self-test" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", outline: "none" }}>
              {blurDef ? <EyeOff size={18} color={LAVENDER} /> : <Eye size={18} color="rgba(255,255,255,0.45)" />}
            </button>
            <button onClick={toggleStar} aria-label="Save to My Verba" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", outline: "none" }}>
              <Star size={19} color={saved ? "#F59E0B" : "rgba(255,255,255,0.45)"} fill={saved ? "#F59E0B" : "none"} />
            </button>
          </div>
        </div>

        {loading && (<div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Loader2 size={26} color={LAVENDER} className="animate-spin" /></div>)}
        {error && (<p style={{ fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>{error}</p>)}

        {!loading && !error && current && (
          <>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={index}
                custom={dir}
                drag="x"
                dragSnapToOrigin
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  const swipe = info.offset.x;
                  const vel = info.velocity.x;
                  if ((swipe < -60 || vel < -450) && index < total - 1) goNext();
                  else if ((swipe > 60 || vel > 450) && index > 0) goPrev();
                }}
                initial={{ opacity: 0, x: dir >= 0 ? 48 : -48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir >= 0 ? -48 : 48 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                style={{ cursor: "grab", touchAction: "pan-y" }}
              >
                <FeedbackWord word={current.word} phonetic={current.phonetic ?? ""} visible={true} />

                <div onClick={() => { if (blurDef) setRevealed(true); }} style={{ position: "relative", marginTop: 16, cursor: blurDef ? "pointer" : "default" }}>
                  <div style={{ filter: blurDef ? "blur(7px)" : "none", transition: "filter 0.3s ease", userSelect: blurDef ? "none" : "auto", pointerEvents: blurDef ? "none" : "auto" }}>
                    {current.allDefinitions && current.allDefinitions.length > 1 ? (
                      <FeedbackMultiDefinitions definitions={current.allDefinitions} />
                    ) : (
                      <>
                        {current.allDefinitions?.[0]?.part_of_speech && (
                          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 11, letterSpacing: "0.12em", textTransform: "lowercase", color: "rgba(199,184,232,0.5)", fontStyle: "italic", margin: "0 0 6px" }}>{current.allDefinitions[0].part_of_speech}</p>
                        )}
                        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 20, color: "#FFFFFF", margin: 0, lineHeight: 1.4 }}>{lowercaseFirst(current.correctDefinition)}</p>
                        {current.exampleSentence && (<p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 16, fontStyle: "italic", color: "rgba(255,255,255,0.7)", margin: "12px 0 0", lineHeight: 1.5 }}>"{highlightWord(current.exampleSentence, current.word)}"</p>)}
                      </>
                    )}
                  </div>
                  {blurDef && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.75)", background: "rgba(10,10,10,0.55)", padding: "5px 13px", borderRadius: 9999, display: "flex", alignItems: "center", gap: 6 }}>
                        <Eye size={13} /> tap to reveal
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                  <FeedbackSynonyms synonyms={current.synonyms} visible={true} />
                  <FeedbackAntonyms antonyms={current.antonyms} visible={true} />
                </div>
                <FeedbackTranslation italianTranslation={current.italianTranslation} italianDefinition={current.italianDefinition ?? ""} visible={true} />
                <FeedbackEtymology etymology={current.etymology ?? ""} visible={true} />
              </motion.div>
            </AnimatePresence>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "26px 0 10px", color: "#5A5A5A", fontFamily: "'Inter', sans-serif", fontSize: 11 }}>
              <ChevronLeft size={13} /> swipe to flip <ChevronRight size={13} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
