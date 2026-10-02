import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { GraduationCap, ChevronDown, BookOpen, Library, Check } from "lucide-react";
import { tapScale, TAP_SPRING } from "@/components/SpringTap";

// La pillola del deck, sempre in alto a destra, identica in ogni schermata.
// Toccandola si apre la tendina con i deck: cresce dall'angolo della pillola e
// si chiude toccando fuori, con Esc, o scegliendo.
//
// Per ora scegliere un deck diverso porta alla sua scelta dei set. Quando
// esisterà il deck corrente unico, qui cambierà solo cosa succede alla scelta.

const DECKS = [
  { id: "essential", short: "Essential", sec: "Foundations", name: "Essential English", line: "Words you need to know", color: "#60A5FA", Icon: BookOpen },
  { id: "advanced", short: "Advanced", sec: "Foundations", name: "Advanced English", line: "Read newspapers and books fluently", color: "#60A5FA", Icon: Library },
  { id: "gre", short: "GRE", sec: "Test prep", name: "GRE Vocabulary", line: "Advanced words for the GRE exam", color: "#A78BFA", Icon: GraduationCap },
];

export default function DeckPill({ current }: { current: string }) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const deck = DECKS.find((d) => d.id === current) ?? DECKS[2];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <motion.button
        whileTap={tapScale("chip")} transition={TAP_SPRING}
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose a deck" aria-expanded={open}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 12, color: deck.color,
          border: `0.5px solid ${deck.color}73`, borderRadius: 20, padding: "5px 11px", background: `${deck.color}12`, cursor: "pointer" }}
      >
        <deck.Icon size={14} color={deck.color} /> {deck.short} <ChevronDown size={14} color={deck.color} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div key="deck-scrim" onClick={() => setOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 40 }} />
        )}
        {open && (
          <motion.div
            key="deck-menu"
            role="menu"
            initial={{ opacity: 0, scale: 0.92, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 41, width: 280, transformOrigin: "top right", borderRadius: 18, padding: 6,
              background: "rgba(22,20,28,0.96)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 18px 50px rgba(0,0,0,0.55)",
              backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
          >
            {DECKS.map((d, k) => {
              const isCurrent = d.id === deck.id;
              return (
                <div key={d.id}>
                  {(k === 0 || DECKS[k - 1].sec !== d.sec) && (
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
                      color: d.color, opacity: 0.8, margin: k === 0 ? "8px 10px 6px" : "12px 10px 6px" }}>{d.sec}</p>
                  )}
                  <motion.button
                    role="menuitemradio" aria-checked={isCurrent}
                    whileTap={tapScale("row")} transition={TAP_SPRING}
                    onClick={() => { setOpen(false); if (!isCurrent) navigate(`/difficulty?deck=${d.id}`); }}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: 10, borderRadius: 12,
                      border: "none", cursor: "pointer", color: "#fff", outline: "none",
                      background: isCurrent ? `${d.color}1A` : "transparent" }}
                  >
                    <span style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${d.color}1A`, border: `1px solid ${d.color}40` }}>
                      <d.Icon size={16} color={d.color} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>{d.name}</span>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{d.line}</span>
                    </span>
                    {isCurrent && <Check size={16} color={d.color} />}
                  </motion.button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
