import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, GraduationCap, ChevronDown, ChevronRight, Info, Star, Trash2 } from "lucide-react";
import AppBackground from "@/components/AppBackground";
import { computeProgress, type ProgressSnapshot } from "@/lib/progressStats";
import { getDueWordIds } from "@/lib/wordStats";
import { fetchWordsByIds } from "@/lib/quizQueries";
import { motion } from "framer-motion";
import { dismissTrouble } from "@/lib/troubleDismiss";

const DECK = "gre";
const AMBER = "#F59E0B";
const AMBER_SOFT = "#F8B84E";
const GREEN = "#34D399";
const VIOLET = "#A78BFA";
const LAVENDER = "#C7B8E8";
const RED = "#EF4444";
const REVIEW_DUE_KEY = "verba_review_due";

type TroubleEntry = { id: string; word: string; wrong: number };

  const MY_WORDS_KEY = "verba_my_words";
  function loadMyWords(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(MY_WORDS_KEY) ?? "[]") as string[]); }
    catch { return new Set(); }
  }
  function saveMyWords(set: Set<string>) {
    try { localStorage.setItem(MY_WORDS_KEY, JSON.stringify([...set])); } catch { /* storage non disponibile */ }
  }

  function TroubleRow({ entry, last, starred, onToggleStar, onDismiss }: { entry: TroubleEntry; last: boolean; starred: boolean; onToggleStar: (id: string) => void; onDismiss: (id: string) => void }) {
    return (
      <div style={{ position: "relative", overflow: "hidden", borderBottom: last ? "none" : "0.5px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 18, background: "rgba(239,68,68,0.14)" }}>
          <Trash2 size={16} color="rgba(239,68,68,0.85)" />
        </div>
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          onDragEnd={(_, info) => { if (info.offset.x < -64) onDismiss(entry.id); }}
          style={{ position: "relative", background: "#0B0B0D", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", touchAction: "pan-y", cursor: "grab" }}
        >
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: LAVENDER }}>{entry.word}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: RED }}>✗ {entry.wrong} wrong</span>
            <button onClick={(e) => { e.stopPropagation(); onToggleStar(entry.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }} aria-label={starred ? "Remove from My Verba" : "Add to My Verba"}>
              <Star size={15} fill={starred ? AMBER : "none"} stroke={starred ? AMBER : "rgba(255,255,255,0.26)"} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

function SectionLabel({ children, extra }: { children: string; extra?: string }) {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
      {children}
      {extra && <span style={{ letterSpacing: 0, textTransform: "none", color: "rgba(255,255,255,0.22)" }}> {extra}</span>}
    </div>
  );
}

function HeroRing({ mastered, practiced, totalDeck }: { mastered: number; practiced: number; totalDeck: number }) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const pct = practiced > 0 ? mastered / practiced : 0;
  const offset = C * (1 - pct);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 22 }}>
      <div style={{ position: "relative", width: 182, height: 182 }}>
        <svg viewBox="0 0 120 120" style={{ width: 182, height: 182, transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
          <circle cx="60" cy="60" r={R} fill="none" stroke={GREEN} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 36, color: "#fff", lineHeight: 1 }}>{mastered}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: GREEN, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6 }}>mastered</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
            {practiced > 0 ? `of ${practiced} practiced` : "start a quiz"}
          </span>
        </div>
      </div>
      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 11 }}>
        {practiced} of {totalDeck} in the GRE deck
      </span>
    </div>
  );
}

function MasteryBar({ mastered, inProgress, newCount }: { mastered: number; inProgress: number; newCount: number }) {
  const total = Math.max(1, mastered + inProgress + newCount);
  const pm = (mastered / total) * 100;
  const pi = (inProgress / total) * 100;
  const pn = Math.max(0, 100 - pm - pi);
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 9 }}>
        <div style={{ width: `${pm}%`, background: GREEN }} />
        <div style={{ width: `${pi}%`, background: AMBER }} />
        <div style={{ width: `${pn}%`, background: "rgba(255,255,255,0.08)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: 10 }}>
        <span style={{ color: GREEN }}>● {mastered} mastered</span>
        <span style={{ color: AMBER }}>● {inProgress} learning</span>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>● {newCount} new</span>
      </div>
    </div>
  );
}

function CoverageRow({ label, seen, total }: { label: string; seen: number; total: number }) {
  const pct = total > 0 ? Math.round((seen / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#fff" }}>{label}</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{seen} / {total}</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: AMBER, borderRadius: 3 }} />
      </div>
    </div>
  );
}

export default function ProgressScreen() {
  const [, navigate] = useLocation();
  const [snap, setSnap] = useState<ProgressSnapshot | null>(null);
  const [trouble, setTrouble] = useState<TroubleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myWords, setMyWords] = useState<Set<string>>(new Set());
  const [swipeHintDone, setSwipeHintDone] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    computeProgress(DECK)
      .then(async (s) => {
        if (!active) return;
        setSnap(s);
        if (s.trouble.length > 0) {
          try {
            const words = await fetchWordsByIds(s.trouble.map((t) => t.id));
            if (!active) return;
            const byId = new Map(words.map((w) => [w.id, w.word]));
            setTrouble(
              s.trouble
                .map((t) => ({ id: t.id, word: byId.get(t.id) ?? "", wrong: t.wrong }))
                .filter((t) => t.word),
            );
          } catch { /* trouble resta vuoto */ }
        } else {
          setTrouble([]);
        }
        setLoading(false);
      })
      .catch((e) => { if (active) { setError(e?.message ?? "Errore di caricamento"); setLoading(false); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setMyWords(loadMyWords());
    try { setSwipeHintDone(localStorage.getItem("verba_hint_trouble_swipe") === "1"); } catch { /* */ }
  }, []);

  function startReview(ids: string[]) {
    if (ids.length === 0) return;
    try { sessionStorage.setItem(REVIEW_DUE_KEY, JSON.stringify(ids)); } catch { /* */ }
    navigate("/quiz?source=due");
  }

  function toggleStar(id: string) {
    setMyWords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveMyWords(next);
      return next;
    });
  }

  function dismissOne(id: string) {
    dismissTrouble(id);
    setTrouble((prev) => prev.filter((t) => t.id !== id));
    if (!swipeHintDone) {
      setSwipeHintDone(true);
      try { localStorage.setItem("verba_hint_trouble_swipe", "1"); } catch { /* */ }
    }
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
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, color: "#F0EDF7", margin: 0 }}>Progress</h1>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 12, color: VIOLET, border: "0.5px solid rgba(167,139,250,0.45)", borderRadius: 20, padding: "5px 11px", background: "rgba(167,139,250,0.07)" }}>
            <GraduationCap size={14} color={VIOLET} /> GRE <ChevronDown size={14} color={VIOLET} />
          </span>
        </div>

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <Loader2 size={26} color={VIOLET} className="animate-spin" />
          </div>
        )}

        {!loading && error && (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif", fontSize: 13, padding: "40px 0" }}>{error}</p>
        )}

        {!loading && !error && snap && (
          <>
            <HeroRing mastered={snap.mastered} practiced={snap.practiced} totalDeck={snap.totalDeck} />

            <div style={{ marginBottom: 22 }}>
              {snap.dueCount > 0 ? (
                <>
                <div onClick={() => startReview(getDueWordIds())} style={{ position: "relative", background: "rgba(245,158,11,0.1)", border: "0.5px solid rgba(245,158,11,0.4)", borderRadius: 16, padding: "15px 48px 15px 16px", cursor: "pointer" }}>
                  <ChevronRight size={22} color={AMBER_SOFT} style={{ position: "absolute", top: "50%", right: 16, transform: "translateY(-50%)" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 23, color: AMBER_SOFT }}>{snap.dueCount}</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: AMBER_SOFT }}>words to review</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setInfoOpen((o) => !o); }}
                      aria-label="What is this?"
                      style={{ background: "none", border: "none", padding: 0, display: "inline-flex", alignItems: "center", cursor: "pointer", color: infoOpen ? "rgba(248,184,78,0.95)" : "rgba(248,184,78,0.5)" }}
                    >
                      <Info size={14} />
                    </button>
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(248,184,78,0.7)", lineHeight: 1.5, marginTop: 5 }}>
                    Resurfaced right before you'd forget them — review to make them stick.
                  </div>
                </div>
                {infoOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{ marginTop: 8, background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "13px 15px" }}
                  >
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>
                      Memory fades on a predictable curve. Verba resurfaces each word right as you're about to forget it — a quick review now resets the curve, so it sticks for longer and you avoid relearning it later.
                    </p>
                  </motion.div>
                )}
                </>
              ) : (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "15px 16px" }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>You're all caught up — no words due right now.</div>
                </div>
              )}
            </div>

            <SectionLabel>Mastery</SectionLabel>
            <MasteryBar mastered={snap.mastered} inProgress={snap.learning + snap.reviewing} newCount={snap.newCount} />

            <SectionLabel>Words studied</SectionLabel>
            <div style={{ marginBottom: 22 }}>
              {snap.bands.map((b) => (
                <CoverageRow key={b.difficulty} label={b.label} seen={b.seen} total={b.total} />
              ))}
            </div>

            {trouble.length > 0 && (
              <>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Trouble words</span>
                </div>
                <div style={{ border: "0.5px solid rgba(239,68,68,0.22)", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                  {trouble.map((t, i) => (
                    <TroubleRow
                      key={t.id}
                      entry={t}
                      last={i === trouble.length - 1}
                      starred={myWords.has(t.id)}
                      onToggleStar={toggleStar}
                      onDismiss={dismissOne}
                    />
                  ))}
                </div>
                {!swipeHintDone ? (
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.35)", margin: "0 0 28px", paddingLeft: 2 }}>
                    ← swipe a word to dismiss · tap ★ to add to My Verba
                  </p>
                ) : (
                  <div style={{ height: 28 }} />
                )}
              </>
            )}

            <div style={{ height: 24 }} />
          </>
        )}
      </div>
    </div>
  );
}
