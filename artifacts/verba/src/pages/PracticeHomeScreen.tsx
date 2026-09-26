import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { GraduationCap, ChevronDown, Play, BookOpen, Library, Check } from "lucide-react";
import AppBackground from "@/components/AppBackground";
import { tapScale, TAP_SPRING } from "@/components/SpringTap";
import { computeProgress, type ProgressSnapshot } from "@/lib/progressStats";
import { getDueWordIds, getAllWordStats } from "@/lib/wordStats";
import { getStudySets, type StudySet } from "@/lib/studySets";
import { fetchWordsByIds } from "@/lib/quizQueries";

// La scheda Practice: due card gemelle e Quick start.
//
// · Practice — "you choose": incontri parole nuove e ti alleni. Porta alla scelta
//   dei set. Le risposte qui sono allenamento: la scala si muove solo per far
//   entrare le parole mai viste (vedi recordAnswer in wordStats.ts).
// · Review — "Verba chooses": le parole dovute, l'unico posto in cui si sale.
//   Toccare il GRAFICO gira la card e mostra la settimana; toccare il resto della
//   card fa partire la Review. Un gesto, un significato.
//
// Questa schermata non registra niente: legge e lancia sessioni che esistono già.

const DECK = "gre";
const AMBER = "#F59E0B";
const AMBER_SOFT = "#FCD34D";
const VIOLET = "#A78BFA";
const LAVENDER = "#C7B8E8";
const GREEN = "#34D399";
const RED = "#EF4444";

const TIERS = [
  { difficulty: "easy", label: "Common" },
  { difficulty: "medium", label: "Uncommon" },
  { difficulty: "hard", label: "Rare" },
] as const;

/**
 * I deck della tendina, con le stesse sezioni, icone e colori della schermata
 * dei deck. Per ora scegliere un deck diverso porta alla sua scelta dei set,
 * come faceva la schermata dei deck: diventerà un cambio di deck vero quando
 * esisterà il deck corrente unico.
 */
const DECKS = [
  { id: "essential", sec: "Foundations", name: "Essential English", line: "Words you need to know", color: "#60A5FA", Icon: BookOpen },
  { id: "advanced", sec: "Foundations", name: "Advanced English", line: "Read newspapers and books fluently", color: "#60A5FA", Icon: Library },
  { id: "gre", sec: "Test prep", name: "GRE Vocabulary", line: "Advanced words for the GRE exam", color: "#A78BFA", Icon: GraduationCap },
];

const REVIEW_DUE_KEY = "verba_review_due";
const MY_WORDS_KEY = "verba_my_words";
const HINT_KEY = "verba_hint_practice_loop";
const QUICK_WORDS = 16;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type NextUp = { difficulty: string; label: string; set: StudySet; unmet: number };

function loadMyWords(): string[] {
  try { return (JSON.parse(localStorage.getItem(MY_WORDS_KEY) ?? "[]") as string[]).filter((x) => UUID_RE.test(x)); }
  catch { return []; }
}

/**
 * Quante parole tornano in ciascuno dei prossimi sette giorni.
 * Giorno 0 = dovute ADESSO (quelle che la Review ti darà toccando la card).
 * Giorno i = quelle che scadono tra (i-1)×24h e i×24h da ora: una finestra di
 * 24 ore approssima "domani" senza che una parola in scadenza stasera finisca
 * contata in un giorno che nella Review non esiste ancora.
 */
function weekAhead(dueNow: number): number[] {
  const out = [dueNow, 0, 0, 0, 0, 0, 0];
  const now = Date.now();
  for (const s of Object.values(getAllWordStats())) {
    if (!s.nextReviewAt) continue;
    const t = new Date(s.nextReviewAt).getTime();
    if (!Number.isFinite(t) || t <= now) continue;
    const i = Math.ceil((t - now) / 86_400_000);
    if (i >= 1 && i <= 6) out[i] += 1;
  }
  return out;
}

function dayLabel(i: number): string {
  if (i === 0) return "today";
  if (i === 1) return "tmrw";
  return DAY_NAMES[new Date(Date.now() + i * 86_400_000).getDay()];
}

const tile: React.CSSProperties = {
  position: "relative", display: "flex", flexDirection: "column", textAlign: "left", width: "100%",
  borderRadius: 22, padding: "14px 14px 16px", minHeight: 244, color: "#fff",
  border: "1px solid rgba(255,255,255,0.09)", background: "#111013", cursor: "pointer", outline: "none",
};
const stage: React.CSSProperties = {
  height: 78, borderRadius: 14, background: "rgba(0,0,0,0.45)", position: "relative", overflow: "hidden", marginBottom: 14,
};
const cardTitle: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, margin: "0 0 8px" };
const bigNum: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 38, letterSpacing: "-1.4px", lineHeight: 1,
  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", alignSelf: "flex-start",
};
const caption: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.62)", marginTop: 4, lineHeight: 1.35 };
const who: React.CSSProperties = {
  marginTop: "auto", paddingTop: 12, fontFamily: "'Inter', sans-serif", fontSize: 9.5, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
};
const label: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.14em",
  textTransform: "uppercase", margin: "0 0 14px",
};
const row: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 16, width: "100%", textAlign: "left", minHeight: 80,
  padding: "14px 16px 14px 14px", marginBottom: 14, borderRadius: 18, cursor: "pointer", color: "#fff", outline: "none",
  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)",
};
const emblem: React.CSSProperties = {
  flex: "0 0 auto", width: 48, height: 48, borderRadius: 13, position: "relative",
  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
};
const rowTitle: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15.5, display: "block",
  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
};
const rowSub: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.45)" };

export default function PracticeHomeScreen() {
  const [, navigate] = useLocation();
  const [snap, setSnap] = useState<ProgressSnapshot | null>(null);
  const [nextUp, setNextUp] = useState<NextUp | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [savedPreview, setSavedPreview] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [hintSeen, setHintSeen] = useState(true);
  const [deckOpen, setDeckOpen] = useState(false);

  useEffect(() => {
    if (!deckOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDeckOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deckOpen]);

  const dueIds = useMemo(() => getDueWordIds(), []);
  const due = dueIds.length;
  const week = useMemo(() => weekAhead(due), [due]);
  // Scala a radice quadrata: con un arretrato di centinaia di parole oggi, una
  // scala lineare schiaccerebbe gli altri giorni a zero. I numeri esatti sono
  // sul retro della card. Un giorno con poche parole resta comunque visibile
  // (almeno 6px); un giorno vuoto è una linea sottile.
  const weekPeak = Math.max(12, ...week.map((v) => Math.min(v, 60)));
  const barH = (v: number, max: number) =>
    v <= 0 ? 3 : Math.max(6, (Math.sqrt(Math.min(v, 60)) / Math.sqrt(weekPeak)) * max);

  useEffect(() => {
    let active = true;
    computeProgress(DECK).then((s) => { if (active) setSnap(s); }).catch(() => { /* le card mostrano un trattino */ });

    // Next up: il primo set, in ordine di fascia, che contiene parole mai incontrate.
    Promise.all(TIERS.map((t) => getStudySets(DECK, t.difficulty)))
      .then((all) => {
        if (!active) return;
        const met = getAllWordStats();
        for (let k = 0; k < TIERS.length; k++) {
          for (const set of all[k]) {
            const unmet = set.wordIds.filter((id) => !met[id]).length;
            if (unmet > 0) { setNextUp({ difficulty: TIERS[k].difficulty, label: TIERS[k].label, set, unmet }); return; }
          }
        }
        setNextUp(null);
      })
      .catch(() => { /* la riga non compare */ });

    const ids = loadMyWords();
    setSaved(ids);
    if (ids.length > 0) {
      fetchWordsByIds(ids.slice(0, 3))
        .then((ws) => { if (active) setSavedPreview(ws.map((w) => w.word)); })
        .catch(() => { /* solo il conteggio */ });
    }
    try { setHintSeen(localStorage.getItem(HINT_KEY) === "1"); } catch { /* resta nascosto */ }
    return () => { active = false; };
  }, []);

  function startReview() {
    if (due === 0) { setFlipped(true); return; }
    try { sessionStorage.setItem(REVIEW_DUE_KEY, JSON.stringify(dueIds)); } catch { /* */ }
    navigate("/setup?source=due");
  }
  function onReviewTap(e: React.MouseEvent) {
    // il grafico è la settimana: toccarlo gira la card
    if ((e.target as HTMLElement).closest("[data-week]")) { setFlipped(true); return; }
    startReview();
  }
  function startNextUp() {
    if (!nextUp) return;
    const n = Math.min(25, nextUp.set.wordCount);
    navigate(`/quiz?words=${n}&deck=${DECK}&sets=${nextUp.difficulty}:${nextUp.set.setNumber}`);
  }
  function startTrouble() {
    const ids = (snap?.trouble ?? []).map((t) => t.id);
    if (ids.length === 0) return;
    try { sessionStorage.setItem("verba_trouble_ids", JSON.stringify(ids)); } catch { /* */ }
    navigate(`/quiz?source=trouble&words=${Math.min(QUICK_WORDS, ids.length)}`);
  }
  function startMyVerba() {
    if (saved.length === 0) return;
    try { sessionStorage.setItem("verba_myverba_ids", JSON.stringify(saved)); } catch { /* */ }
    navigate(`/quiz?source=myverba&words=${Math.min(QUICK_WORDS, saved.length)}`);
  }
  function closeHint() {
    setHintSeen(true);
    try { localStorage.setItem(HINT_KEY, "1"); } catch { /* */ }
  }

  const hot = due > 0;
  const trouble = snap?.trouble ?? [];
  const strips = trouble.slice(0, 3).map((t) => [...Array(Math.max(0, 5 - t.attempts.length)).fill("n"), ...t.attempts] as string[]);
  const tomorrow = week[1];

  return (
    <div style={{ minHeight: "100%", width: "100%", background: "#0A0A0A", position: "relative", overflow: "hidden" }}>
      <AppBackground showWords={false} />
      <style>{`
        @keyframes verbaOrbit { from { transform: rotate(0deg) translateX(18px) } to { transform: rotate(360deg) translateX(18px) } }
        .verba-week:active i { transform: scaleY(1.12); }
        @media (prefers-reduced-motion: reduce) { .verba-orbit { animation: none !important; } }
      `}</style>
      <div style={{ position: "absolute", top: -40, left: -30, width: 240, height: 210, background: "radial-gradient(circle, rgba(167,139,250,0.14), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 10, padding: "20px 20px 40px", maxWidth: 640, margin: "0 auto" }}>
        {/* intestazione: la stessa di Study e Progress */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", marginBottom: 26 }}>
          <span />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontStyle: "italic", fontSize: 13, color: "rgba(245,158,11,0.8)", letterSpacing: "0.04em" }}>Verba</span>
          <motion.button
            whileTap={tapScale("chip")} transition={TAP_SPRING}
            onClick={() => setDeckOpen((o) => !o)}
            aria-label="Choose a deck"
            aria-expanded={deckOpen}
            style={{ justifySelf: "end", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 12, color: VIOLET,
              border: "0.5px solid rgba(167,139,250,0.45)", borderRadius: 20, padding: "5px 11px", background: "rgba(167,139,250,0.07)", cursor: "pointer" }}
          >
            <GraduationCap size={14} color={VIOLET} /> GRE <ChevronDown size={14} color={VIOLET} />
          </motion.button>
        </div>

        {/* la tendina dei deck: cresce dall'angolo della pillola, si chiude toccando fuori */}
        <AnimatePresence>
          {deckOpen && (
            <motion.div key="deck-scrim" onClick={() => setDeckOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 20 }} />
          )}
          {deckOpen && (
              <motion.div
                key="deck-menu"
                role="menu"
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                style={{ position: "absolute", top: 58, right: 20, zIndex: 21, width: 280, transformOrigin: "top right", borderRadius: 18, padding: 6,
                  background: "rgba(22,20,28,0.96)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
                  backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
              >
                {DECKS.map((d, k) => {
                  const current = d.id === DECK;
                  return (
                    <div key={d.id}>
                      {(k === 0 || DECKS[k - 1].sec !== d.sec) && (
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
                          color: d.color, opacity: 0.8, margin: k === 0 ? "8px 10px 6px" : "12px 10px 6px" }}>{d.sec}</p>
                      )}
                      <motion.button
                        role="menuitemradio" aria-checked={current}
                        whileTap={tapScale("row")} transition={TAP_SPRING}
                        onClick={() => { setDeckOpen(false); if (!current) navigate(`/difficulty?deck=${d.id}`); }}
                        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: 10, borderRadius: 12,
                          border: "none", cursor: "pointer", color: "#fff", outline: "none",
                          background: current ? "rgba(167,139,250,0.10)" : "transparent" }}
                      >
                        <span style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                          background: `${d.color}1A`, border: `1px solid ${d.color}40` }}>
                          <d.Icon size={16} color={d.color} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>{d.name}</span>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{d.line}</span>
                        </span>
                        {current && <Check size={16} color={VIOLET} />}
                      </motion.button>
                    </div>
                  );
                })}
              </motion.div>
          )}
        </AnimatePresence>

        {/* le due card gemelle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <motion.button
            whileTap={tapScale("card")} transition={TAP_SPRING}
            onClick={() => navigate(`/difficulty?deck=${DECK}`)}
            style={{ ...tile, borderColor: "rgba(167,139,250,0.2)" }}
          >
            <div style={stage}>
              <i style={{ position: "absolute", left: "50%", top: "50%", width: 36, height: 36, margin: "-18px 0 0 -18px", borderRadius: "50%", border: "1.5px solid rgba(167,139,250,0.22)" }} />
              <i className="verba-orbit" style={{ position: "absolute", left: "50%", top: "50%", width: 8, height: 8, margin: "-4px 0 0 -4px", borderRadius: "50%",
                background: VIOLET, boxShadow: `0 0 8px ${VIOLET}`, animation: "verbaOrbit 2.4s linear infinite" }} />
            </div>
            <span style={cardTitle}>Practice</span>
            <span style={{ ...bigNum, backgroundImage: `linear-gradient(180deg, #fff, ${VIOLET})` }}>{snap ? snap.newCount : "—"}</span>
            <span style={caption}>new words to meet</span>
            <span style={who}>You choose</span>
          </motion.button>

          {/* la Review: davanti il numero, dietro la settimana */}
          <div style={{ perspective: 900 }}>
            <div style={{ position: "relative", height: "100%", transformStyle: "preserve-3d",
              transition: "transform 0.7s cubic-bezier(.3,1.25,.35,1)", transform: flipped ? "rotateY(180deg)" : "none" }}>
              <motion.button
                whileTap={tapScale("card")} transition={TAP_SPRING}
                onClick={onReviewTap}
                aria-label={hot ? `Start review, ${due} words due` : "Review: nothing due"}
                style={{ ...tile, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
                  ...(hot ? { borderColor: "rgba(245,158,11,0.4)", background: "linear-gradient(165deg,#241a0a,#111013 65%)", boxShadow: "0 0 30px rgba(245,158,11,0.08)" } : {}) }}
              >
                <div data-week className="verba-week" style={{ ...stage, cursor: "pointer" }} aria-label="See your week">
                  <span style={{ position: "absolute", top: 6, left: 9, fontFamily: "'Inter', sans-serif", fontSize: 8.5, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: "rgba(255,255,255,0.35)", zIndex: 1 }}>your week</span>
                  <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, top: 24, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, alignItems: "end" }}>
                    {week.map((v, i) => (
                      <i key={i} style={{ display: "block", minHeight: 3, borderRadius: "3px 3px 2px 2px", transformOrigin: "bottom", transition: "transform 0.15s",
                        height: barH(v, 40),
                        background: i === 0 && v > 0 ? `linear-gradient(180deg, ${AMBER_SOFT}, ${AMBER})` : "rgba(199,184,232,0.3)",
                        boxShadow: i === 0 && v > 0 ? "0 0 8px rgba(245,158,11,0.5)" : "none" }} />
                    ))}
                  </div>
                </div>
                <span style={cardTitle}>Review</span>
                <span style={{ ...bigNum, backgroundImage: hot ? `linear-gradient(180deg, #fff, ${AMBER_SOFT})` : "linear-gradient(180deg,#fff,#fff)" }}>{due}</span>
                <span style={caption}>
                  {due === 0 ? `nothing due · ${tomorrow} tomorrow` : due > 50 ? "waiting · 50 a day to catch up" : "due today"}
                </span>
                <span style={{ ...who, color: hot ? "rgba(252,211,77,0.75)" : who.color }}>Verba chooses</span>
              </motion.button>

              <div
                role="button" tabIndex={0} aria-label="Turn the card back"
                onClick={() => setFlipped(false)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(false); } }}
                style={{ ...tile, position: "absolute", inset: 0, transform: "rotateY(180deg)", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              >
                <span style={{ ...cardTitle, fontSize: 15, margin: "2px 0 4px" }}>Your week</span>
                <span style={{ ...caption, marginTop: 0, marginBottom: 14, color: "rgba(255,255,255,0.5)", fontSize: 11.5 }}>
                  {tomorrow} {tomorrow === 1 ? "word comes" : "words come"} back tomorrow.
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, alignItems: "end", height: 88 }}>
                  {week.map((v, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
                      <b style={{ fontFamily: "'Inter', sans-serif", fontSize: 8.5, fontWeight: 500, height: 10, color: i === 1 ? LAVENDER : "rgba(255,255,255,0.55)" }}>{v || ""}</b>
                      <i style={{ width: "100%", borderRadius: 3, minHeight: 3, height: barH(v, 58),
                        background: i === 1 ? LAVENDER : "rgba(199,184,232,0.32)" }} />
                      <em style={{ fontStyle: "normal", fontFamily: "'Inter', sans-serif", fontSize: 8, color: i === 1 ? LAVENDER : "rgba(255,255,255,0.35)" }}>{dayLabel(i)}</em>
                    </div>
                  ))}
                </div>
                <span style={who}>Tap to turn back</span>
              </div>
            </div>
          </div>
        </div>

        {!hintSeen && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "18px 2px 0",
            fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.45, color: VIOLET }}>
            <span>New words you meet in Practice join Review the next day.</span>
            <button onClick={closeHint} style={{ flex: "0 0 auto", background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 11.5, cursor: "pointer" }}>Got it</button>
          </div>
        )}

        {/* Quick start: un tocco e parte */}
        {(nextUp || trouble.length > 0 || saved.length > 0) && (
          <div style={{ marginTop: 40 }}>
            <p style={label}>Quick start</p>

            {nextUp && (
              <motion.button whileTap={tapScale("row")} transition={TAP_SPRING} onClick={startNextUp}
                style={{ ...row, background: "linear-gradient(120deg, rgba(167,139,250,0.12), rgba(255,255,255,0.02))", borderColor: "rgba(167,139,250,0.28)" }}>
                {/* la stessa tessera ambra della griglia dei set */}
                <span style={{ ...emblem, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,158,11,0.7)" }}>
                  <span style={{ position: "absolute", left: 0, right: 0, bottom: 0,
                    height: `${Math.round(((nextUp.set.wordCount - nextUp.unmet) / Math.max(1, nextUp.set.wordCount)) * 100)}%`,
                    background: "linear-gradient(180deg, rgba(167,139,250,0.38), rgba(167,139,250,0.16))" }} />
                  <span style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1,
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16 }}>
                    {nextUp.set.setNumber}
                    <small style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 8.5, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{nextUp.set.wordCount}</small>
                  </span>
                  <span style={{ position: "absolute", left: "50%", bottom: 4, width: 4, height: 4, marginLeft: -2, borderRadius: "50%", background: AMBER, boxShadow: `0 0 6px ${AMBER}` }} />
                </span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <span style={{ ...rowSub, fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>Next up</span>
                  <span style={rowTitle}>{nextUp.label} · Set {nextUp.set.setNumber}</span>
                  <span style={rowSub}>{nextUp.set.wordCount} words · {nextUp.unmet} new to meet</span>
                </span>
                <span style={{ flex: "0 0 auto", width: 42, height: 42, borderRadius: "50%", background: VIOLET, display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 18px rgba(167,139,250,0.45)" }}>
                  <Play size={14} color="#1A1622" fill="#1A1622" />
                </span>
              </motion.button>
            )}

            {trouble.length > 0 && (
              <motion.button whileTap={tapScale("row")} transition={TAP_SPRING} onClick={startTrouble}
                style={{ ...row, borderColor: "rgba(239,68,68,0.42)", background: "linear-gradient(120deg, rgba(239,68,68,0.08), rgba(255,255,255,0.012) 70%)" }}>
                {/* le stesse strisce degli ultimi incontri che vedi in Progress */}
                <span aria-hidden="true" style={{ ...emblem, background: "#0B0B0D", border: "1px solid rgba(239,68,68,0.25)", flexDirection: "column", gap: 4 }}>
                  {strips.map((st, i) => (
                    <span key={i} style={{ display: "flex", gap: 2.5 }}>
                      {st.map((c, k) => (
                        <b key={k} style={{ display: "block", width: 5.5, height: 5.5, borderRadius: 1.5,
                          background: c === "c" ? GREEN : c === "e" ? RED : "rgba(255,255,255,0.1)" }} />
                      ))}
                    </span>
                  ))}
                </span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <span style={rowTitle}>Trouble words</span>
                  <span style={rowSub}>the ones you miss most</span>
                </span>
                <span style={{ flex: "0 0 auto", marginLeft: "auto", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: "#F87171" }}>
                  <span style={{ fontSize: 13, marginRight: 4 }}>✗</span>{trouble.length}
                </span>
              </motion.button>
            )}

            {saved.length > 0 && (
              <motion.button whileTap={tapScale("row")} transition={TAP_SPRING} onClick={startMyVerba}
                style={{ ...row, borderColor: "rgba(245,158,11,0.22)", background: "linear-gradient(120deg, rgba(245,158,11,0.06), rgba(255,255,255,0.012) 70%)" }}>
                {/* segnalibro con la stella di Progress: segnaposto del futuro logo */}
                <span aria-hidden="true" style={{ ...emblem, background: "radial-gradient(circle at 50% 35%, rgba(245,158,11,0.22), rgba(0,0,0,0.35) 70%)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <svg width="22" height="26" viewBox="0 0 22 26">
                    <defs><linearGradient id="verbaBm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FDE68A" /><stop offset="1" stopColor="#F59E0B" /></linearGradient></defs>
                    <path d="M3 1.5h16a1.5 1.5 0 0 1 1.5 1.5v21.2a.8.8 0 0 1-1.25.66L11 19.2l-8.25 5.66A.8.8 0 0 1 1.5 24.2V3A1.5 1.5 0 0 1 3 1.5z" fill="url(#verbaBm)" />
                    <path d="M11 5.2l1.55 3.3 3.6.42-2.66 2.47.7 3.56L11 13.2l-3.19 1.75.7-3.56L5.85 8.92l3.6-.42z" fill="#1A1206" />
                  </svg>
                </span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <span style={rowTitle}>My Verba</span>
                  <span style={{ display: "flex", gap: 5, marginTop: 4, overflow: "hidden", WebkitMaskImage: "linear-gradient(90deg,#000 75%,transparent)" }}>
                    {(savedPreview.length ? savedPreview : ["words you saved"]).map((w) => (
                      <i key={w} style={{ fontStyle: "normal", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: LAVENDER, padding: "2px 7px",
                        borderRadius: 9999, background: "rgba(199,184,232,0.08)", border: "1px solid rgba(199,184,232,0.18)", whiteSpace: "nowrap" }}>{w}</i>
                    ))}
                  </span>
                </span>
                <span style={{ flex: "0 0 auto", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: AMBER_SOFT }}>{saved.length}</span>
              </motion.button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
