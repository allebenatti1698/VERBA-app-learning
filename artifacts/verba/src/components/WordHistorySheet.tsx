import { motion, AnimatePresence } from "framer-motion";
import { getWordStat, PRACTICE_NOTE } from "@/lib/wordStats";

const GREEN = "#34D399";
const RED = "#EF4444";
const LAVENDER = "#C7B8E8";

/** Gli eventi che rappresentano una risposta; gli altri sono conseguenze. */
const RIGHT = new Set(["correct", "up", "mastered", "practice"]);
const WRONG = new Set(["wrong", "down", "unmastered"]);

const LEVEL_NAME: Record<number, string> = {
  1: "Recognize",
  2: "Recall in context",
  3: "Produce",
};

function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const n = new Date();
  const b = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const days = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function dueLabel(iso: string | null | undefined): string {
  if (!iso) return "not scheduled yet";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "not scheduled yet";
  const days = Math.ceil((t - Date.now()) / 86400000);
  if (days <= 0) return "due now";
  if (days === 1) return "back tomorrow";
  return `back in ${days} days`;
}

export default function WordHistorySheet({
  wordId, word, open, onClose,
}: { wordId: string | null; word: string; open: boolean; onClose: () => void }) {
  const stat = wordId ? getWordStat(wordId) : null;

  const seen = stat?.totalSeen ?? 0;
  const correct = stat?.totalCorrect ?? 0;
  const wrong = Math.max(0, seen - correct);
  const rate = seen > 0 ? Math.round((correct / seen) * 100) : 0;

  const events = (stat?.history ?? [])
    .filter((e) => RIGHT.has(e.kind) || WRONG.has(e.kind))
    .slice()
    .reverse();                                   // il più recente in cima
  // Gli incontri precedenti alla cronologia: l'app ne conosce solo il totale.
  const unknown = Math.max(0, seen - events.length);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="wh-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 60 }}
          />
          <motion.div
            key="wh-sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "110%" }}
            transition={{ type: "spring", stiffness: 190, damping: 26, mass: 1.1 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              maxWidth: 640, marginLeft: "auto", marginRight: "auto",
              maxHeight: "82vh", overflowY: "auto",
              background: "#0D0C10", borderTop: "1px solid rgba(199,184,232,0.2)",
              borderRadius: "20px 20px 0 0", padding: "22px 22px 32px", zIndex: 61,
            }}
          >
            <button onClick={onClose} aria-label="Close"
              style={{ position: "absolute", top: 14, right: 16, width: 30, height: 30,
                borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "none",
                color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>
              ✕
            </button>

            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
              fontSize: 24, color: LAVENDER, margin: "0 0 3px" }}>{word}</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5,
              color: "rgba(255,255,255,0.42)", margin: "0 0 18px" }}>
              seen {seen} {seen === 1 ? "time" : "times"}
              {stat ? ` · ${LEVEL_NAME[stat.level] ?? "Recognize"}` : ""}
              {stat ? ` · ${dueLabel(stat.nextReviewAt)}` : ""}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
              {[
                [correct, "correct", GREEN],
                [wrong, "wrong", RED],
                [`${rate}%`, "accuracy", LAVENDER],
              ].map(([v, label, col]) => (
                <div key={String(label)} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "11px 12px" }}>
                  <b style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 20, lineHeight: 1.1, color: col as string }}>{v}</b>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9.5,
                    color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
                </div>
              ))}
            </div>

            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 9,
              color: "rgba(255,255,255,0.4)", letterSpacing: "0.14em",
              textTransform: "uppercase", marginBottom: 12 }}>History</div>

            {events.length === 0 && unknown === 0 && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12,
                color: "rgba(255,255,255,0.4)", margin: 0 }}>
                Nothing recorded yet.
              </p>
            )}

            <div style={{ position: "relative", paddingLeft: 17 }}>
              <div style={{ position: "absolute", left: 4, top: 6, bottom: 6, width: 1,
                background: "rgba(255,255,255,0.09)" }} />
              {events.map((e, i) => {
                const ok = RIGHT.has(e.kind);
                // non ha mosso la scala: allenamento, oppure risposta in anticipo
                const prac = e.kind === "practice" || e.note === PRACTICE_NOTE;
                return (
                  <div key={i} style={{ position: "relative", display: "flex",
                    alignItems: "baseline", gap: 10, padding: "8px 0" }}>
                    <span style={{ position: "absolute", left: -16, top: 13, width: 7, height: 7,
                      borderRadius: 2, background: prac ? "transparent" : ok ? GREEN : RED,
                      boxShadow: prac ? `inset 0 0 0 1.5px ${ok ? GREEN : RED}` : "none" }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11,
                      color: "rgba(255,255,255,0.42)", width: 84, flexShrink: 0 }}>
                      {whenLabel(e.at)}
                    </span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5,
                      color: "rgba(255,255,255,0.82)" }}>
                      {ok ? "Risposta corretta" : "Risposta sbagliata"}
                    </span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 9.5,
                      color: "rgba(199,184,232,0.55)", marginLeft: "auto", whiteSpace: "nowrap" }}>
                      {LEVEL_NAME[e.format ?? e.level] ?? ""}{prac ? " · practice" : ""}
                    </span>
                  </div>
                );
              })}
              {unknown > 0 && (
                <div style={{ position: "relative", display: "flex", alignItems: "baseline",
                  gap: 10, padding: "8px 0" }}>
                  <span style={{ position: "absolute", left: -16, top: 13, width: 7, height: 7,
                    borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11,
                    color: "rgba(255,255,255,0.42)", width: 84, flexShrink: 0 }}>earlier</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5,
                    color: "rgba(255,255,255,0.45)" }}>
                    {unknown} {unknown === 1 ? "encounter" : "encounters"} not recorded
                  </span>
                </div>
              )}
            </div>

            {unknown > 0 && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 10.5,
                color: "rgba(255,255,255,0.32)", lineHeight: 1.6, background: "rgba(255,255,255,0.02)",
                borderRadius: 10, padding: "10px 12px", margin: "14px 0 0" }}>
                Verba started keeping a history after the first encounters with this
                word — for those it only knows the total.
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
