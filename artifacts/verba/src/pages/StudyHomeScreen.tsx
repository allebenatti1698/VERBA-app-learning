import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import AppBackground from "@/components/AppBackground";
import TabHeader from "@/components/TabHeader";
import { tapScale, TAP_SPRING } from "@/components/SpringTap";
import { BrowseView } from "@/pages/StudyScreen";
import { getStudySets, type StudySet } from "@/lib/studySets";
import { getSeenWordIds, getLastStudied, getResumeIndex } from "@/lib/studyProgress";
import { getAllWordStats } from "@/lib/wordStats";
import { fetchWordsByIds } from "@/lib/quizQueries";

// La scheda Study: leggere le parole prima di praticarle.
//
// · In cima la PROSSIMA PAROLA da leggere, in grande: Study si spiega mostrando
//   quello che fai qui. Un tocco e riprendi esattamente da quella parola.
// · Il ponte verso Practice: i set letti tutti ma non ancora praticati. Porta al
//   setup con quei set già selezionati (solo per quella visita).
// · My Verba: le parole salvate, da leggere come carte; "List" apre l'elenco,
//   dove si tolgono con la stella come in tutta l'app.
// · Tutti i set come tessere. La forma è la stessa di Practice; cambia la trama:
//   righe di una pagina, che si riempiono a quarti e sfumano attorno al numero.
//
// La vista delle carte è quella di sempre (BrowseView in StudyScreen.tsx).
// Questa schermata non registra niente: legge i progressi e apre le carte.

const DECK = "gre";
const LAVENDER = "#C7B8E8";
const VIOLET = "#A78BFA";
const AMBER = "#F59E0B";
const MY_WORDS_KEY = "verba_my_words";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TIERS = [
  { difficulty: "easy", label: "Common" },
  { difficulty: "medium", label: "Uncommon" },
  { difficulty: "hard", label: "Rare" },
] as const;

/** Righe di una pagina piena. */
const LINES = 7;
/** Righe disegnate per ogni livello: un quarto, metà, tre quarti, tutto. */
const LINES_FOR = [0, 2, 4, 5, 7];
const LINE_WIDTHS = [74, 60, 74, 52, 74, 66, 58];

type SetInfo = { difficulty: string; tier: number; set: StudySet; seen: number; met: number };
type Browse = { kind: "set"; difficulty: string; set: StudySet; label: string } | { kind: "myverba" } | null;

/**
 * Il livello di lettura di un set, a scatti di un quarto:
 * 0 = da leggere · 1 = un quarto · 2 = metà · 3 = tre quarti · 4 = letto tutto.
 * Il pieno arriva SOLO a set finito: un set quasi finito resta a tre quarti.
 */
function readLevel(seen: number, total: number): number {
  if (seen <= 0 || total <= 0) return 0;
  if (seen >= total) return 4;
  const q = seen / total;
  return q < 0.375 ? 1 : q < 0.625 ? 2 : 3;
}

function loadMyWords(): string[] {
  try { return (JSON.parse(localStorage.getItem(MY_WORDS_KEY) ?? "[]") as string[]).filter((x) => UUID_RE.test(x)); }
  catch { return []; }
}

function joinNumbers(ns: number[]): string {
  return ns.length === 1 ? `${ns[0]}` : `${ns.slice(0, -1).join(", ")} and ${ns[ns.length - 1]}`;
}

function RuledTile({ info, isNext, onOpen }: { info: SetInfo; isNext: boolean; onOpen: () => void }) {
  const level = readLevel(info.seen, info.set.wordCount);
  const n = LINES_FOR[level];
  const pct = Math.round((info.seen / Math.max(1, info.set.wordCount)) * 100);
  return (
    <motion.button
      whileTap={tapScale("chip")} transition={TAP_SPRING} onClick={onOpen}
      aria-label={`Set ${info.set.setNumber}, ${info.set.wordCount} words, ${pct}% read${isNext ? ", next to read" : ""}`}
      style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", padding: 0, cursor: "pointer", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.03)",
        border: `1px solid ${isNext ? "rgba(245,158,11,0.7)" : "rgba(255,255,255,0.08)"}` }}
    >
      {n > 0 && (
        <span className="vsh-lines" aria-hidden="true">
          {Array.from({ length: n }, (_, k) => (
            <i key={k} style={{ bottom: `calc(${(((k + 0.5) / LINES) * 100).toFixed(2)}% - 1px)`, width: `${LINE_WIDTHS[k]}%`, animationDelay: `${k * 60}ms` }} />
          ))}
        </span>
      )}
      <span style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1,
        fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15 }}>
        {info.set.setNumber}
        <small style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 8.5, marginTop: 3, color: "rgba(199,184,232,0.88)" }}>{info.set.wordCount}</small>
      </span>
      {isNext && (
        <span style={{ position: "absolute", left: "50%", bottom: "7%", width: 4, height: 4, marginLeft: -2, borderRadius: "50%", zIndex: 3,
          background: AMBER, boxShadow: `0 0 6px ${AMBER}` }} />
      )}
    </motion.button>
  );
}

export default function StudyHomeScreen() {
  const [location, navigate] = useLocation();
  const [tiers, setTiers] = useState<SetInfo[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState(0);
  const [browse, setBrowse] = useState<Browse>(null);
  const [nextWord, setNextWord] = useState<{ key: string; word: string; pos: string } | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const fetchedKey = useRef<string | null>(null);
  const tierChosen = useRef(false);

  const load = useCallback(() => {
    setSaved(loadMyWords());
    Promise.all(TIERS.map((t) => getStudySets(DECK, t.difficulty)))
      .then((all) => {
        const stats = getAllWordStats();
        setTiers(all.map((sets, t) => sets.map((set) => {
          const ids = new Set(set.wordIds);
          const seen = getSeenWordIds(DECK, TIERS[t].difficulty, set.setNumber).filter((id) => ids.has(id)).length;
          const met = set.wordIds.filter((id) => stats[id]).length;
          return { difficulty: TIERS[t].difficulty, tier: t, set, seen, met };
        })));
        setError(null);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load the sets"));
  }, []);

  // i dati si rileggono ogni volta che la scheda torna attiva: nel frattempo
  // si può aver letto in Study o praticato in Practice
  useEffect(() => { if (location === "/study" && !browse) load(); }, [location, browse, load]);

  // il set da continuare: l'ultimo letto se non è finito, altrimenti il primo non finito
  const flat = tiers ? tiers.flat() : [];
  const last = getLastStudied();
  const lastInfo = last && last.deck === DECK ? flat.find((s) => s.difficulty === last.difficulty && s.set.setNumber === last.setNumber) : undefined;
  const cont = lastInfo && lastInfo.seen < lastInfo.set.wordCount ? lastInfo : flat.find((s) => s.seen < s.set.wordCount);
  const contKey = cont ? `${cont.difficulty}:${cont.set.setNumber}` : null;

  // la prima volta, le tessere si aprono sulla fascia del set da continuare
  useEffect(() => {
    if (cont && !tierChosen.current) { setTier(cont.tier); tierChosen.current = true; }
  }, [cont]);

  // la prossima parola: lo stesso calcolo che usa la vista delle carte, sullo
  // stesso ordine di caricamento, così la card mostra la parola da cui ripartirai
  useEffect(() => {
    if (!cont || !contKey || fetchedKey.current === contKey) return;
    fetchedKey.current = contKey;
    fetchWordsByIds(cont.set.wordIds)
      .then((ws) => {
        if (!ws.length) return;
        const i = getResumeIndex(DECK, cont.difficulty, cont.set.setNumber, ws.map((w) => w.id));
        const w = ws[Math.min(i, ws.length - 1)];
        setNextWord({ key: contKey, word: w.word, pos: w.allDefinitions?.[0]?.part_of_speech ?? "" });
      })
      .catch(() => { fetchedKey.current = null; });
  }, [cont, contKey]);

  // il ponte: set letti tutti ma praticati meno della metà, della stessa fascia
  // (così la frase resta chiara: "Sets 9 and 10 are read"); gli altri al giro dopo
  const readyAll = flat.filter((s) => s.seen >= s.set.wordCount && s.met < s.set.wordCount / 2);
  const ready = readyAll.filter((s) => s.tier === readyAll[0]?.tier).slice(0, 3);
  const readyLabel = ready.length === 0 ? ""
    : `${ready.length === 1 ? "Set" : "Sets"} ${joinNumbers(ready.map((s) => s.set.setNumber))} ${ready.length === 1 ? "is" : "are"} read`;

  function openSet(s: SetInfo) {
    setBrowse({ kind: "set", difficulty: s.difficulty, set: s.set, label: TIERS[s.tier].label });
  }
  function closeBrowse() {
    setBrowse(null);
    fetchedKey.current = null;          // la prossima parola va ricalcolata
  }

  if (browse?.kind === "set") {
    return <BrowseView difficulty={browse.difficulty} label={browse.label} set={browse.set} onBack={closeBrowse} />;
  }
  if (browse?.kind === "myverba") {
    const ids = loadMyWords();
    const mvSet = { setNumber: 0, wordIds: ids, wordCount: ids.length } as StudySet;
    return <BrowseView difficulty="myverba" label="My Verba" set={mvSet} onBack={closeBrowse} />;
  }

  const cur = tiers?.[tier] ?? [];
  const label: React.CSSProperties = { fontFamily: "'Inter', sans-serif", fontSize: 9.5, color: "rgba(255,255,255,0.4)", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px" };
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", marginTop: 12, padding: "12px 14px",
    borderRadius: 18, cursor: "pointer", color: "#fff", outline: "none" };

  return (
    <div style={{ minHeight: "100%", width: "100%", background: "#0A0A0A", position: "relative", overflow: "hidden" }}>
      <AppBackground showWords={false} />
      <style>{`
        .vsh-lines { position: absolute; inset: 0; z-index: 1;
          -webkit-mask-image: radial-gradient(ellipse 46% 38% at 50% 50%, transparent 42%, #000 100%);
                  mask-image: radial-gradient(ellipse 46% 38% at 50% 50%, transparent 42%, #000 100%); }
        .vsh-lines i { position: absolute; left: 13%; height: 2px; border-radius: 2px; background: rgba(199,184,232,0.62);
          transform-origin: left; transform: scaleX(0); animation: vshWrite .45s cubic-bezier(.3,.7,.2,1) forwards; }
        @keyframes vshWrite { to { transform: scaleX(1); } }
        @media (prefers-reduced-motion: reduce) { .vsh-lines i { animation: none; transform: none; } }
      `}</style>
      <div style={{ position: "absolute", top: -50, left: -40, width: 280, height: 230, background: "radial-gradient(circle, rgba(199,184,232,0.12), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 10, padding: "20px 20px 40px", maxWidth: 640, margin: "0 auto" }}>
        <TabHeader tab="study" subtitle="Read the words before you practice them." />

        {error && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{error}</p>}

        {/* la prossima parola */}
        {cont && (
          <motion.button
            whileTap={tapScale("card")} transition={TAP_SPRING} onClick={() => openSet(cont)}
            aria-label={`Continue reading ${TIERS[cont.tier].label} set ${cont.set.setNumber}`}
            style={{ position: "relative", display: "block", width: "100%", textAlign: "center", borderRadius: 24, padding: "16px 18px 18px", cursor: "pointer", color: "#fff",
              background: "linear-gradient(170deg, rgba(199,184,232,0.10), rgba(255,255,255,0.015) 60%)", border: "1px solid rgba(199,184,232,0.22)", outline: "none" }}
          >
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: "'Inter', sans-serif", fontSize: 9.5, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
              <span>{cont.seen > 0 ? "Continue reading" : "Start reading"}</span>
              <b style={{ fontWeight: 500, letterSpacing: 0, textTransform: "none", fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
                {TIERS[cont.tier].label} · Set {cont.set.setNumber} · {cont.seen} of {cont.set.wordCount}
              </b>
            </span>
            <span style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 40, letterSpacing: "-1px", color: LAVENDER,
              margin: "24px 0 4px", minHeight: 48, textShadow: "0 0 30px rgba(199,184,232,0.25)" }}>
              {nextWord && nextWord.key === contKey ? nextWord.word : "\u00a0"}
            </span>
            <span style={{ display: "block", fontFamily: "'Inter', sans-serif", fontSize: 12, fontStyle: "italic", color: "rgba(199,184,232,0.55)", marginBottom: 22, minHeight: 16 }}>
              {nextWord && nextWord.key === contKey ? nextWord.pos : ""}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <span style={{ display: "block", height: "100%", borderRadius: 2, background: LAVENDER, width: `${(cont.seen / Math.max(1, cont.set.wordCount)) * 100}%` }} />
              </span>
              <span style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9999, background: LAVENDER,
                color: "#1A1622", fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600 }}>
                {cont.seen > 0 ? "Continue" : "Start"}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#1A1622" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
              </span>
            </span>
          </motion.button>
        )}

        {/* il ponte verso Practice */}
        {ready.length > 0 && (
          <motion.button
            whileTap={tapScale("row")} transition={TAP_SPRING}
            onClick={() => navigate(`/practice?deck=${DECK}&sets=${ready.map((s) => `${s.difficulty}:${s.set.setNumber}`).join(",")}&from=study`)}
            style={{ ...row, background: "linear-gradient(120deg, rgba(167,139,250,0.10), rgba(255,255,255,0.015))", border: "1px solid rgba(167,139,250,0.25)" }}
          >
            <span aria-hidden="true" style={{ flex: "0 0 auto", width: 40, height: 40, borderRadius: 12, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={VIOLET} strokeWidth="1.7">
                <circle cx="12" cy="12" r="7.5" opacity="0.55" /><circle cx="18.6" cy="8.5" r="2.4" fill={VIOLET} stroke="none" />
              </svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14.5 }}>{readyLabel}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Practice them — they'll be selected for you</span>
            </span>
            <span aria-hidden="true" style={{ color: VIOLET, fontSize: 18 }}>›</span>
          </motion.button>
        )}

        {/* My Verba: leggerle come carte; "List" apre l'elenco, dove si tolgono con la stella */}
        {saved.length > 0 && (
          <div style={{ ...row, cursor: "default", padding: 0, background: "linear-gradient(120deg, rgba(245,158,11,0.06), rgba(255,255,255,0.012) 70%)", border: "1px solid rgba(245,158,11,0.22)" }}>
            <motion.button
              whileTap={tapScale("row")} transition={TAP_SPRING} onClick={() => setBrowse({ kind: "myverba" })}
              aria-label="Read My Verba as cards"
              style={{ flex: 1, display: "flex", alignItems: "center", gap: 14, padding: "12px 0 12px 14px", background: "none", border: "none", textAlign: "left", color: "#fff", cursor: "pointer", outline: "none" }}
            >
              <span aria-hidden="true" style={{ flex: "0 0 auto", width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                background: "radial-gradient(circle at 50% 35%, rgba(245,158,11,0.22), rgba(0,0,0,0.35) 70%)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <svg width="18" height="22" viewBox="0 0 22 26">
                  <defs><linearGradient id="vshBm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FDE68A" /><stop offset="1" stopColor="#F59E0B" /></linearGradient></defs>
                  <path d="M3 1.5h16a1.5 1.5 0 0 1 1.5 1.5v21.2a.8.8 0 0 1-1.25.66L11 19.2l-8.25 5.66A.8.8 0 0 1 1.5 24.2V3A1.5 1.5 0 0 1 3 1.5z" fill="url(#vshBm)" />
                  <path d="M11 5.2l1.55 3.3 3.6.42-2.66 2.47.7 3.56L11 13.2l-3.19 1.75.7-3.56L5.85 8.92l3.6-.42z" fill="#1A1206" />
                </svg>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14.5 }}>My Verba</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>{saved.length} words you saved · read them as cards</span>
              </span>
            </motion.button>
            <motion.button
              whileTap={tapScale("chip")} transition={TAP_SPRING} onClick={() => navigate("/my-verba")}
              style={{ flex: "0 0 auto", margin: "0 12px 0 6px", padding: "6px 11px", borderRadius: 9999, background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.75)", fontFamily: "'Inter', sans-serif", fontSize: 11.5, cursor: "pointer", outline: "none" }}
            >
              List
            </motion.button>
          </div>
        )}

        {/* tutti i set */}
        <p style={{ ...label, marginTop: 30 }}>All sets</p>
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
        {tiers && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.42)", margin: "0 2px 12px" }}>
            <span>{cur.reduce((a, s) => a + s.set.wordCount, 0)} words · {cur.length} sets</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <i aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 3, border: "1px solid rgba(255,255,255,0.14)",
                background: "repeating-linear-gradient(180deg, transparent 0 2.5px, rgba(199,184,232,0.6) 2.5px 3.5px)" }} />
              read
            </span>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
          {cur.map((s) => (
            <RuledTile key={`${s.difficulty}:${s.set.setNumber}`} info={s} isNext={contKey === `${s.difficulty}:${s.set.setNumber}`} onOpen={() => openSet(s)} />
          ))}
        </div>
      </div>
    </div>
  );
}
