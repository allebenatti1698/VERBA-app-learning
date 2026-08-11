import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, Play, Eye, EyeOff, Star, GraduationCap, BookOpen, Library, Search } from "lucide-react";
import { getWordStat } from "@/lib/wordStats";
import ParallaxPager from "@/components/ParallaxPager";
import AppBackground from "@/components/AppBackground";
import StreakChip from "@/components/StreakChip";
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
  { id: "gre", name: "GRE Vocabulary", short: "GRE", Icon: GraduationCap, color: "#A78BFA", active: true },
  { id: "essential", name: "Essential English", short: "Essential", Icon: BookOpen, color: "#7DD3FC", active: false },
  { id: "advanced", name: "Advanced English", short: "Advanced", Icon: Library, color: "#7DD3FC", active: false },
  { id: "myverba", name: "My Verba", short: "My Verba", Icon: Star, color: "#E8E8E8", active: true },
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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  const [selectedDeck, setSelectedDeck] = useState("gre");

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
    if (browse.difficulty === "myverba") {
      const ids = [...loadMyWords()].filter((x) => UUID_RE.test(x));
      const mvSet = { setNumber: 0, wordIds: ids, wordCount: ids.length } as unknown as StudySet;
      return <BrowseView difficulty="myverba" label="My Verba" set={mvSet} onBack={() => setBrowse(null)} />;
    }
    const sets = setsByDiff[browse.difficulty] ?? [];
    const set = sets.find((s) => s.setNumber === browse.setNumber);
    const label = TIERS.find((t) => t.difficulty === browse.difficulty)?.label ?? "";
    return <BrowseView difficulty={browse.difficulty} label={label} set={set} onBack={() => setBrowse(null)} />;
  }

  const myWordIds = selectedDeck === "myverba" ? [...loadMyWords()].filter((x) => UUID_RE.test(x)) : [];
  const selDeck = DECK_OPTIONS.find((d) => d.id === selectedDeck) ?? DECK_OPTIONS[0];

  return (
    <div style={{ minHeight: "100%", width: "100%", background: "#0A0A0A", position: "relative", overflow: "hidden" }}>
      <AppBackground showWords={false} />
      <div style={{ position: "absolute", top: -40, left: -30, width: 220, height: 200, background: "radial-gradient(circle, rgba(167,139,250,0.16), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -70, right: -40, width: 230, height: 210, background: "radial-gradient(circle, rgba(245,158,11,0.10), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 10, padding: "18px 18px 0", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontStyle: "italic", fontSize: 13, fontWeight: 400, color: "rgba(245,158,11,0.8)", letterSpacing: "0.04em" }}>Verba</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <StreakChip />
          <div style={{ position: "relative" }}>
            <button onClick={() => setDeckMenuOpen((v) => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 12, color: selDeck.color, border: `0.5px solid ${selDeck.id === "gre" ? "rgba(167,139,250,0.45)" : "rgba(232,232,232,0.30)"}`, borderRadius: 20, padding: "5px 11px", background: selDeck.id === "gre" ? "rgba(167,139,250,0.07)" : "rgba(255,255,255,0.05)", cursor: "pointer", outline: "none" }}>
              <selDeck.Icon size={14} color={selDeck.color} />
              {selDeck.short}
              <ChevronDown size={14} color={selDeck.color} style={{ transform: deckMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
            </button>
            {deckMenuOpen && (
              <>
                <div onClick={() => setDeckMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50, width: 210, background: "rgba(20,18,26,0.97)", border: "0.5px solid rgba(199,184,232,0.28)", borderRadius: 14, padding: 6, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                  {DECK_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      disabled={!d.active}
                      onClick={() => { if (d.active) { setSelectedDeck(d.id); setDeckMenuOpen(false); } }}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px", borderRadius: 10, border: "none", background: d.id === selectedDeck ? "rgba(167,139,250,0.12)" : "transparent", cursor: d.active ? "pointer" : "default", opacity: d.active ? 1 : 0.4, outline: "none", textAlign: "left" }}
                    >
                      <d.Icon size={17} color={d.color} strokeWidth={1.6} />
                      <span style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12, color: d.active ? "#F0EDF7" : "#C8C8C8" }}>{d.name}</span>
                      {d.active
                        ? (d.id === selectedDeck ? <Check size={15} color="#C7B8E8" /> : null)
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
            {selectedDeck === "gre" && <ContinueCard setsByDiff={setsByDiff} onOpen={(d, n) => setBrowse({ difficulty: d, setNumber: n })} />}
            {selectedDeck === "myverba" && (myWordIds.length === 0 ? (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "48px 20px", lineHeight: 1.5 }}>Star words while studying to add them here.</p>
            ) : (
              <>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#7E7E7E", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>Saved</p>
                <button onClick={() => setBrowse({ difficulty: "myverba", setNumber: 0 })} style={{ width: "100%", textAlign: "left", border: "0.5px solid rgba(232,232,232,0.16)", background: "rgba(255,255,255,0.02)", borderRadius: 14, padding: "16px 15px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", outline: "none" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Star size={18} color="#F59E0B" fill="#F59E0B" /></span>
                  <span><span style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, color: "#fff" }}>My Verba</span><span style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{myWordIds.length} words</span></span>
                  <ChevronRight size={18} color="rgba(255,255,255,0.4)" style={{ marginLeft: "auto" }} />
                </button>
              </>
            ))}
            {selectedDeck === "gre" && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#7E7E7E", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>By difficulty</p>}
            {selectedDeck === "gre" && TIERS.map((tier) => {
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
  const [mode, setMode] = useState<"stack" | "list">("stack");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "learn" | "mast" | "new">("all");

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
      if (mode !== "stack") return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, mode]);

  function toggleStar() { if (!current) return; setSaved(toggleMyWord(current.id)); }

  const blurDef = selfTest && !revealed;
  function toggleEye() {
    if (blurDef) { setSelfTest(false); }
    else { setSelfTest(true); setRevealed(false); }
  }

  const renderBands = (i: number) => {
    const w = words[i];
    if (!w) return [];
    return [
      <FeedbackWord word={w.word} phonetic={w.phonetic ?? ""} visible={true} />,
      <div onClick={() => { if (blurDef) setRevealed(true); }} style={{ position: "relative", marginTop: 16, cursor: blurDef ? "pointer" : "default" }}>
        <div style={{ filter: blurDef ? "blur(7px)" : "none", transition: "filter 0.3s ease", userSelect: blurDef ? "none" : "auto", pointerEvents: blurDef ? "none" : "auto" }}>
          {w.allDefinitions && w.allDefinitions.length > 1 ? (
            <FeedbackMultiDefinitions definitions={w.allDefinitions} />
          ) : (
            <>
              {w.allDefinitions?.[0]?.part_of_speech && (
                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 11, letterSpacing: "0.12em", textTransform: "lowercase", color: "rgba(199,184,232,0.5)", fontStyle: "italic", margin: "0 0 6px" }}>{w.allDefinitions[0].part_of_speech}</p>
              )}
              <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 20, color: "#FFFFFF", margin: 0, lineHeight: 1.4 }}>{lowercaseFirst(w.correctDefinition)}</p>
              {w.exampleSentence && (<p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, fontSize: 16, fontStyle: "italic", color: "rgba(255,255,255,0.7)", margin: "12px 0 0", lineHeight: 1.5 }}>"{highlightWord(w.exampleSentence, w.word)}"</p>)}
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
      </div>,
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        <FeedbackSynonyms synonyms={w.synonyms} visible={true} />
        <FeedbackAntonyms antonyms={w.antonyms} visible={true} />
      </div>,
      <FeedbackTranslation italianTranslation={w.italianTranslation} italianDefinition={w.italianDefinition ?? ""} visible={true} />,
      <FeedbackEtymology etymology={w.etymology ?? ""} visible={true} />,
    ];
  };

  function wordMastery(id: string): "learn" | "mast" | "new" {
    const st = getWordStat(id);
    if (!st) return "new";
    return st.status === "mastered" ? "mast" : "learn";
  }
  const dotColor = { learn: "#F59E0B", mast: "#34D399", new: "rgba(255,255,255,0.28)" };
  const FILTERS: Array<["all" | "learn" | "mast" | "new", string]> = [["all", "All"], ["learn", "Learning"], ["mast", "Mastered"], ["new", "New"]];

  return (
    <div style={{ minHeight: "100%", width: "100%", background: "#0A0A0A", position: "relative", overflow: "hidden" }}>
      <AppBackground showWords={false} />
      <div style={{ position: "relative", zIndex: 10, padding: "18px 18px 0", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.55)", fontFamily: "'Inter', sans-serif", fontSize: 12, padding: 0, outline: "none" }}>
            <ChevronLeft size={18} /> {label}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: 9999, padding: 3, gap: 2 }}>
              <button onClick={() => setMode("stack")} aria-label="Stacked" style={{ border: "none", background: mode === "stack" ? "rgba(199,184,232,0.16)" : "none", cursor: "pointer", padding: "5px 8px", borderRadius: 9999, display: "flex", outline: "none" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={mode === "stack" ? LAVENDER : "rgba(255,255,255,0.4)"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="12" rx="2" /><path d="M6.5 19h11M8 21.5h8" /></svg>
              </button>
              <button onClick={() => setMode("list")} aria-label="List" style={{ border: "none", background: mode === "list" ? "rgba(199,184,232,0.16)" : "none", cursor: "pointer", padding: "5px 8px", borderRadius: 9999, display: "flex", outline: "none" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={mode === "list" ? LAVENDER : "rgba(255,255,255,0.4)"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="4" width="17" height="5" rx="1.5" /><rect x="3.5" y="14" width="17" height="5" rx="1.5" /></svg>
              </button>
            </div>
            {mode === "stack" && (
              <>
                <button onClick={toggleEye} aria-label="Self-test" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", outline: "none" }}>
                  {blurDef ? <EyeOff size={18} color={LAVENDER} /> : <Eye size={18} color="rgba(255,255,255,0.45)" />}
                </button>
                <button onClick={toggleStar} aria-label="Save to My Verba" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", outline: "none" }}>
                  <Star size={19} color={saved ? "#F59E0B" : "rgba(255,255,255,0.45)"} fill={saved ? "#F59E0B" : "none"} />
                </button>
              </>
            )}
          </div>
        </div>

        {loading && (<div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><Loader2 size={26} color={LAVENDER} className="animate-spin" /></div>)}
        {error && (<p style={{ fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "center", padding: "40px 0" }}>{error}</p>)}

        {mode === "stack" && !loading && !error && current && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 210px)" }}>
            <div style={{ flex: "1 1 auto", minHeight: 0 }}>
              <ParallaxPager
                index={index}
                total={total}
                onIndexChange={(i) => { if (i > index) goNext(); else if (i < index) goPrev(); }}
                renderBands={renderBands}
              />
            </div>

            <div style={{ flex: "0 0 auto", paddingBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "26px 0 16px", color: "#5A5A5A", fontFamily: "'Inter', sans-serif", fontSize: 11 }}>
                <ChevronLeft size={13} /> swipe to flip <ChevronRight size={13} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: LAVENDER, letterSpacing: "0.04em", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {index + 1} / {total}
                </span>
                <div style={{ flex: "1 1 auto", height: 1.5, background: "rgba(255,255,255,0.08)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
                  <motion.div
                    initial={false}
                    animate={{ width: `${total > 0 ? ((index + 1) / total) * 100 : 0}%` }}
                    transition={{ type: "spring", stiffness: 210, damping: 27 }}
                    style={{ position: "absolute", left: 0, top: 0, height: "100%", background: "#F59E0B", opacity: 0.8, borderRadius: 2 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === "list" && !loading && !error && (
          <div style={{ paddingBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "9px 12px", marginBottom: 10 }}>
              <Search size={15} color="rgba(255,255,255,0.4)" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your words…" style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 13 }} />
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
              {FILTERS.map(([f, lbl]) => (
                <button key={f} onClick={() => setFilter(f)} style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, padding: "4px 10px", borderRadius: 9999, cursor: "pointer", outline: "none", border: filter === f ? "0.5px solid rgba(199,184,232,0.5)" : "0.5px solid rgba(255,255,255,0.14)", color: filter === f ? LAVENDER : "rgba(255,255,255,0.55)", background: filter === f ? "rgba(199,184,232,0.08)" : "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {f !== "all" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor[f] }} />}
                  {lbl}
                </button>
              ))}
            </div>
            <div>
              {words
                .filter((w) => {
                  const m = wordMastery(w.id);
                  if (filter !== "all" && m !== filter) return false;
                  const q = query.trim().toLowerCase();
                  if (q && w.word.toLowerCase().indexOf(q) === -1 && (w.correctDefinition ?? "").toLowerCase().indexOf(q) === -1) return false;
                  return true;
                })
                .map((w) => {
                  const m = wordMastery(w.id);
                  const realIdx = words.indexOf(w);
                  return (
                    <button key={w.id} onClick={() => { setDir(1); setIndex(realIdx); setMode("stack"); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "0.5px solid rgba(255,255,255,0.05)", cursor: "pointer", outline: "none", display: "flex", alignItems: "center", gap: 11, padding: "13px 4px" }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor[m], flex: "none" }} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, color: LAVENDER }}>{w.word}</span>
                        <span style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lowercaseFirst(w.correctDefinition)}</span>
                      </span>
                      <ChevronRight size={16} color="rgba(255,255,255,0.3)" style={{ flex: "none" }} />
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
