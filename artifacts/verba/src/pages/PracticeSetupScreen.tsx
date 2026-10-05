import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useSearch } from "wouter";
import { ChevronLeft } from "lucide-react";
import DeckPill from "@/components/DeckPill";
import { estimateMinutes } from "@/lib/pace";
import { skipNextSlide, requestCollapse } from "@/lib/pageTransition";
import AppBackground from "@/components/AppBackground";
import { tapScale, TAP_SPRING } from "@/components/SpringTap";
import { primaryButtonStyle } from "@/lib/primaryButtonStyle";
import { getStudySets, type StudySet } from "@/lib/studySets";
import { getAllWordStats } from "@/lib/wordStats";

// Il setup di Practice: set, domande, quante parole. Una decisione per sezione.
//
// · I set come tessere, per fascia. Ogni tessera si riempie, nel colore del
//   deck, in proporzione a quante sue parole hai già incontrato. Il bordo e il
//   puntino ambra segnano il prossimo set — lo stesso di "Next up" — che parte
//   già selezionato.
// · Le domande: una, due o tre. Con più di una il quiz fa un mix calibrato
//   (vedi chooseFormat in QuizScreen): per ogni parola la domanda che le serve.
// · Le parole si pescano a caso dai set scelti, fino a un massimo di 50.
//
// Questa schermata non registra niente: costruisce l'indirizzo del quiz.

const VIOLET = "#A78BFA";
const LAVENDER = "#C7B8E8";
const AMBER = "#F59E0B";
const MAX_WORDS = 50;
const TIERS = [
  { difficulty: "easy", label: "Common" },
  { difficulty: "medium", label: "Uncommon" },
  { difficulty: "hard", label: "Rare" },
] as const;

const FORMATS = [
  { f: 1, title: "Recognize", line: "Pick the meaning" },
  { f: 2, title: "In context", line: "Fill the sentence" },
  { f: 3, title: "Produce", line: "Write the word" },
] as const;

type Tier = { sets: StudySet[]; met: number[] };
const key = (difficulty: string, n: number) => `${difficulty}:${n}`;

function Mini({ f }: { f: number }) {
  if (f === 1) return (
    <>
      <div style={{ position: "absolute", top: 7, left: 0, right: 0, textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: LAVENDER }}>wary</div>
      <div style={{ position: "absolute", left: 8, right: 8, bottom: 7, display: "grid", gap: 3 }}>
        <i className="vps-bar" /><i className="vps-bar" /><i className="vps-bar vps-pick" />
      </div>
    </>
  );
  if (f === 2) return (
    <div style={{ position: "absolute", left: 8, right: 6, top: 21, fontFamily: "'Inter', sans-serif", fontSize: 9, color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>
      a <span className="vps-gap">{["w", "a", "r", "y"].map((ch, i) => <span key={i} className="vps-fall" style={{ left: 1 + i * 6.5, animationDelay: `${i * 0.08}s` }}>{ch}</span>)}</span> glance
    </div>
  );
  return (
    <div style={{ position: "absolute", left: 8, right: 8, top: 15, height: 22, borderRadius: 6, border: "1px solid rgba(217,119,6,0.35)", padding: "3px 6px",
      fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 11, color: LAVENDER, overflow: "hidden", whiteSpace: "nowrap" }}>
      <em className="vps-type">wary</em><b className="vps-caret" />
    </div>
  );
}

export default function PracticeSetupScreen() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search);
  const deck = query.get("deck") ?? "gre";
  // Dal ponte di Study arrivano i set già letti (?sets=…&from=study) e partono
  // selezionati. Non si salvano da nessuna parte: rientrando in Practice dalla
  // strada normale il setup torna al prossimo set.
  const presetParam = query.get("sets");
  const fromStudy = query.get("from") === "study";

  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nextKey, setNextKey] = useState<string | null>(null);
  const [formats, setFormats] = useState<Set<number>>(new Set([1, 2, 3]));
  const [words, setWords] = useState(16);
  const [nope, setNope] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all(TIERS.map((t) => getStudySets(deck, t.difficulty)))
      .then((all) => {
        if (!active) return;
        const stats = getAllWordStats();
        const built: Tier[] = all.map((sets) => ({
          sets,
          met: sets.map((s) => (s.wordIds.length ? s.wordIds.filter((id) => stats[id]).length / s.wordIds.length : 0)),
        }));
        setTiers(built);
        // il prossimo set: il primo, in ordine di fascia, con parole mai incontrate
        let next: { k: string; t: number } | null = null;
        for (let t = 0; t < built.length && !next; t++) {
          const i = built[t].met.findIndex((m) => m < 1);
          if (i >= 0) next = { k: key(TIERS[t].difficulty, built[t].sets[i].setNumber), t };
        }
        if (next) setNextKey(next.k);
        // i set arrivati dal ponte di Study, solo se esistono davvero in questo deck
        const valid = new Set<string>();
        built.forEach((tb, t) => tb.sets.forEach((s) => valid.add(key(TIERS[t].difficulty, s.setNumber))));
        const preset = (presetParam ?? "").split(",").map((x) => x.trim()).filter((x) => valid.has(x));
        if (preset.length) {
          setSelected(new Set(preset));
          setTier(Math.max(0, TIERS.findIndex((t) => preset[0].startsWith(t.difficulty + ":"))));
          return;
        }
        if (next) { setSelected(new Set([next.k])); setTier(next.t); return; }
        if (built[0].sets[0]) setSelected(new Set([key(TIERS[0].difficulty, built[0].sets[0].setNumber)]));
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Couldn't load the sets"); });
    return () => { active = false; };
  }, [deck, presetParam]);

  const pool = useMemo(() => {
    if (!tiers) return 0;
    let n = 0;
    tiers.forEach((t, ti) => t.sets.forEach((s) => { if (selected.has(key(TIERS[ti].difficulty, s.setNumber))) n += s.wordCount; }));
    return n;
  }, [tiers, selected]);
  const maxWords = Math.min(MAX_WORDS, pool);
  const minWords = Math.min(5, maxWords);
  const count = Math.max(minWords, Math.min(words, maxWords));
  // dal ritmo misurato nelle sessioni passate, o da una stima di partenza (vedi pace.ts)
  const minutes = estimateMinutes([...formats], count);

  const bridgeLabel = useMemo(() => {
    if (!fromStudy || !presetParam) return null;
    const nums = presetParam.split(",").map((x) => Number(x.split(":")[1])).filter((n) => Number.isFinite(n));
    if (!nums.length) return null;
    return nums.length === 1 ? `set ${nums[0]}` : `sets ${nums.slice(0, -1).join(", ")} and ${nums[nums.length - 1]}`;
  }, [fromStudy, presetParam]);

  function shake(k: string) { setNope(k); window.setTimeout(() => setNope(null), 340); }
  function toggleSet(k: string) {
    const next = new Set(selected);
    if (next.has(k)) { if (next.size === 1) { shake(k); return; } next.delete(k); } else next.add(k);
    setSelected(next);
  }
  function selectAllInTier() {
    if (!tiers) return;
    const next = new Set(selected);
    tiers[tier].sets.forEach((s) => next.add(key(TIERS[tier].difficulty, s.setNumber)));
    setSelected(next);
  }
  function toggleFormat(f: number) {
    const next = new Set(formats);
    if (next.has(f)) { if (next.size === 1) { shake(`f${f}`); return; } next.delete(f); } else next.add(f);
    setFormats(next);
  }
  function goBack() {
    if (fromStudy) { navigate("/study"); return; }
    // si torna dentro la card Practice, che si richiude al suo posto
    requestCollapse("practice");
    skipNextSlide();
    navigate("/decks");
  }
  function begin() {
    if (count < 1) return;
    const sets = [...selected].sort().join(",");
    const f = [...formats].sort().join(",");
    navigate(`/quiz?words=${count}&deck=${deck}&sets=${sets}&formats=${f}`);
  }

  const chosenNames = useMemo(() => {
    const names: string[] = [];
    TIERS.forEach((t) => {
      const ns = [...selected].filter((k) => k.startsWith(t.difficulty + ":")).map((k) => Number(k.split(":")[1])).sort((a, b) => a - b);
      if (ns.length) names.push(`${t.label} ${ns.join(", ")}`);
    });
    return names.join(" · ");
  }, [selected]);

  const cur = tiers?.[tier];
  const label: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: 9.5, color: "rgba(255,255,255,0.4)", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 };

  return (
    <div style={{ minHeight: "100dvh", width: "100%", background: "#0A0A0A", position: "relative", overflow: "hidden" }}>
      <AppBackground showWords={false} />
      <style>{`
        .vps-bar { display: block; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.1); }
        .vps-pick { animation: vpsPick 3.2s infinite; }
        @keyframes vpsPick { 0%,40% { background: rgba(255,255,255,0.1) } 55%,85% { background: #34D399; box-shadow: 0 0 8px rgba(52,211,153,.6) } 100% { background: rgba(255,255,255,0.1) } }
        .vps-gap { display: inline-block; width: 30px; height: 10px; position: relative; vertical-align: -2px; border-bottom: 1px solid rgba(199,184,232,0.5); }
        .vps-fall { position: absolute; bottom: 0; font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 9.5px; color: #34D399; opacity: 0; animation: vpsFall 3.2s infinite; }
        @keyframes vpsFall { 0%,35% { opacity: 0; transform: translate(6px,-16px) rotate(20deg) } 55%,85% { opacity: 1; transform: none } 100% { opacity: 0 } }
        .vps-type { font-style: normal; display: inline-block; overflow: hidden; vertical-align: top; width: 0; animation: vpsType 3.2s steps(4) infinite; }
        .vps-caret { display: inline-block; width: 1px; height: 12px; background: #C7B8E8; vertical-align: -1px; animation: vpsCaret .8s steps(1) infinite; }
        @keyframes vpsType { 0%,15% { width: 0 } 55%,90% { width: 3.3ch } 100% { width: 0 } }
        @keyframes vpsCaret { 50% { opacity: 0 } }
        @keyframes vpsNope { 0%,100% { transform: translateX(0) } 30% { transform: translateX(-4px) } 60% { transform: translateX(3px) } }
        @media (prefers-reduced-motion: reduce) { .vps-pick, .vps-fall, .vps-type, .vps-caret { animation: none !important; } .vps-type { width: 3.3ch; } .vps-fall { opacity: 1; } }
      `}</style>
      <div style={{ position: "absolute", top: -40, left: -30, width: 240, height: 210, background: "radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 10, maxWidth: 640, margin: "0 auto", padding: "20px 20px 140px" }}>
        {/* pagina dentro Practice: indietro a sinistra, la pillola del deck a destra, poi il titolo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 40 }}>
          <motion.button whileTap={tapScale("icon")} transition={TAP_SPRING} onClick={goBack} aria-label="Back"
            style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.65)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronLeft size={17} />
          </motion.button>
          <DeckPill current={deck} />
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 26, letterSpacing: "-0.6px", color: "#fff", margin: "18px 0 4px" }}>Set up your practice</h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.5)", margin: "0 0 22px" }}>Pick your sets and the questions you want.</p>
        {bridgeLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 20px", padding: "10px 12px", borderRadius: 14,
            background: "rgba(199,184,232,0.07)", border: "1px solid rgba(199,184,232,0.22)", fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "rgba(255,255,255,0.8)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={LAVENDER} strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <rect x="5" y="3" width="14" height="18" rx="3" /><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4.5" />
            </svg>
            <span>From Study — <b style={{ fontWeight: 600, color: LAVENDER }}>{bridgeLabel}</b>, ready to practice</span>
          </div>
        )}

        {/* ── i set ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <p style={label}>Sets</p>
          {cur && (
            <button onClick={selectAllInTier} style={{ background: "none", border: "none", color: VIOLET, fontFamily: "'Inter', sans-serif", fontSize: 11.5, cursor: "pointer", padding: 0 }}>Select all</button>
          )}
        </div>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3,1fr)", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 3, marginBottom: 10 }}>
          <motion.div layout transition={{ type: "spring", stiffness: 420, damping: 36 }}
            style={{ position: "absolute", top: 3, bottom: 3, left: `calc(3px + ${tier} * (100% - 6px) / 3)`, width: "calc((100% - 6px) / 3)", borderRadius: 9,
              background: "rgba(167,139,250,0.14)", border: "1px solid rgba(167,139,250,0.3)" }} />
          {TIERS.map((t, i) => (
            <button key={t.difficulty} onClick={() => setTier(i)} aria-pressed={i === tier}
              style={{ position: "relative", zIndex: 1, background: "none", border: "none", padding: "8px 4px", cursor: "pointer",
                fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 500, color: i === tier ? "#fff" : "rgba(255,255,255,0.5)" }}>{t.label}</button>
          ))}
        </div>
        {cur && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.4)", margin: "0 2px 12px" }}>
            {TIERS[tier].label} · {cur.sets.reduce((a, s) => a + s.wordCount, 0)} words · {cur.sets.length} sets
          </p>
        )}
        {error && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{error}</p>}
        {!tiers && !error && <div style={{ height: 120 }} />}
        {cur && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: 30 }}>
            {cur.sets.map((s, i) => {
              const k = key(TIERS[tier].difficulty, s.setNumber);
              const on = selected.has(k);
              const isNext = k === nextKey;
              return (
                <motion.button key={k} whileTap={tapScale("chip")} transition={TAP_SPRING} onClick={() => toggleSet(k)}
                  aria-pressed={on} aria-label={`Set ${s.setNumber}, ${s.wordCount} words, ${Math.round(cur.met[i] * 100)}% met${isNext ? ", next up" : ""}`}
                  style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", cursor: "pointer", padding: 0,
                    background: "rgba(255,255,255,0.03)", color: on ? "#fff" : "rgba(255,255,255,0.75)",
                    border: `1px solid ${on ? VIOLET : isNext ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.08)"}`,
                    boxShadow: on ? "0 0 0 1px rgba(167,139,250,0.55), 0 0 14px rgba(167,139,250,0.22)" : "none",
                    animation: nope === k ? "vpsNope .32s ease" : undefined }}>
                  <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${cur.met[i] * 100}%`,
                    background: "linear-gradient(180deg, rgba(167,139,250,0.38), rgba(167,139,250,0.16))" }} />
                  <span style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1,
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15 }}>
                    {s.setNumber}
                    <small style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 8.5, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{s.wordCount}</small>
                  </span>
                  {on && <span style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: "50%", background: VIOLET }} />}
                  {isNext && <span style={{ position: "absolute", left: "50%", bottom: 4, width: 4, height: 4, marginLeft: -2, borderRadius: "50%", background: AMBER, boxShadow: `0 0 6px ${AMBER}` }} />}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* ── le domande ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <p style={label}>Questions</p>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>pick more than one to mix</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {FORMATS.map(({ f, title, line }) => {
            const on = formats.has(f);
            return (
              <motion.button key={f} whileTap={tapScale("card")} transition={TAP_SPRING} onClick={() => toggleFormat(f)} aria-pressed={on}
                style={{ position: "relative", textAlign: "left", borderRadius: 16, padding: "10px 10px 12px", cursor: "pointer", color: "#fff",
                  background: on ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.025)", opacity: on ? 1 : 0.78,
                  border: `1px solid ${on ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.08)"}`,
                  animation: nope === `f${f}` ? "vpsNope .32s ease" : undefined }}>
                <span style={{ position: "absolute", top: 8, right: 8, width: 15, height: 15, borderRadius: "50%",
                  border: `1px solid ${on ? VIOLET : "rgba(255,255,255,0.2)"}`, background: on ? VIOLET : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="3.5" strokeLinecap="round"><path d="M5 12l5 5 9-10" /></svg>}
                </span>
                <div style={{ height: 54, borderRadius: 10, background: "rgba(0,0,0,0.38)", marginBottom: 9, position: "relative", overflow: "hidden" }}><Mini f={f} /></div>
                <span style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13 }}>{title}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5, lineHeight: 1.35, color: "rgba(255,255,255,0.45)" }}>{line}</span>
              </motion.button>
            );
          })}
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, lineHeight: 1.5, color: "rgba(255,255,255,0.42)", margin: "10px 2px 0" }}>
          {formats.size > 1 ? "Mix: Verba picks the right question for each word." : `${FORMATS[[...formats][0] - 1].title} only.`}
        </p>

        {/* ── quante parole ── */}
        <p style={{ ...label, margin: "30px 0 4px" }}>Words</p>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <input type="range" min={minWords} max={Math.max(minWords, maxWords)} value={count} disabled={maxWords <= minWords}
            onChange={(e) => setWords(Number(e.target.value))} aria-label="Words" style={{ flex: 1, accentColor: AMBER }} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, minWidth: 34, textAlign: "right",
            backgroundImage: `linear-gradient(90deg, #fff, ${AMBER})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{count}</span>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.45)", margin: "8px 0 0" }}>
          Picked at random from {pool} words{chosenNames ? ` (${chosenNames})` : ""}.<br />
          New words you meet join your <span style={{ color: VIOLET }}>Review</span>.
        </p>
      </div>

      {/* Begin: la stessa barra fissa in fondo del Next del quiz */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30, padding: "18px 16px calc(18px + env(safe-area-inset-bottom))",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "linear-gradient(to top, #0A0A0A 62%, transparent)", pointerEvents: "none" }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.5)", margin: 0, pointerEvents: "none" }}>
          {count} words · about {minutes} min
        </p>
        <motion.button onClick={begin} whileTap={count > 0 ? tapScale() : undefined} transition={TAP_SPRING} disabled={count < 1}
          style={{ ...primaryButtonStyle, pointerEvents: "auto", touchAction: "manipulation", opacity: count < 1 ? 0.4 : 1 }}>
          Begin
        </motion.button>
      </div>
    </div>
  );
}
