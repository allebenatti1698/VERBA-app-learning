import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { User, Star, HelpCircle, ThumbsUp, Mail, RotateCcw, Trash2, Lock, ChevronRight, Check } from "lucide-react";
import AppBackground from "@/components/AppBackground";
import TabHeader from "@/components/TabHeader";
import { SCREEN_MAX } from "@/components/ScreenColumn";
import { CHAIN_CSS, ChainIcon, ChainStrip } from "@/components/ChainLinks";
import { tapScale, TAP_SPRING } from "@/components/SpringTap";
import { getChain, lastDays } from "@/lib/chain";
import { openFromCard, returningFrom } from "@/lib/cardMorph";

const SUPPORT_EMAIL = "support@verba.app";
const RATE_URL = "";

const AMBER = "#F59E0B";
const AMBER_SOFT = "#F8B84E";
const LAV = "#C7B8E8";
const GREEN = "#34D399";
const RED = "#EF4444";

// la card Chain: fondo pieno (non trasparente) perché l'intreccio degli anelli
// "taglia" con il colore dello sfondo
const CHAIN_CARD_BG = "linear-gradient(170deg, #1b140a, #121010 55%)";
const CHAIN_EDGE = "rgba(245,158,11,0.22)";

function loadMyWordsCount(): number {
  try { return (JSON.parse(localStorage.getItem("verba_my_words") ?? "[]") as string[]).length; }
  catch { return 0; }
}

// Chiavi "progresso" da azzerare: include my_words e last_session,
// MA preserva la catena (verba_study_days) e i flag-hint.
const PROGRESS_KEYS = [
  "verba_word_stats",
  "verba_study_progress",
  "verba_last_study",
  "verba_study_counts",
  "verba_review_due",
  "verba_trouble_dismissed",
  "verba_my_words",
  "verba_last_session",
  "verba_last_index",
];
function resetProgress(): void {
  try { PROGRESS_KEYS.forEach((k) => localStorage.removeItem(k)); } catch { /* */ }
}
function resetHints(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.includes("hint") || k.includes("intro") || k.endsWith("_seen")) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* */ }
}

const baseBtn: React.CSSProperties = { flex: 1, borderRadius: 9, padding: 9, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "0.5px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", outline: "none" };
const amberBtn: React.CSSProperties = { ...baseBtn, background: "rgba(245,158,11,0.12)", border: "0.5px solid rgba(245,158,11,0.4)", color: AMBER_SOFT };
const dangerBtn: React.CSSProperties = { ...baseBtn, background: "rgba(239,68,68,0.12)", border: "0.5px solid rgba(239,68,68,0.4)", color: RED };
const doneRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "11px 14px 14px", fontFamily: "'Inter', sans-serif", fontSize: 13, color: GREEN };
const groupCard: React.CSSProperties = { background: "rgba(255,255,255,0.035)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" };

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.38)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "22px 4px 8px" }}>{children}</div>;
}
function Divider() {
  return <div style={{ height: "0.5px", background: "rgba(255,255,255,0.06)", margin: "0 14px" }} />;
}
function Row({ icon, label, value, danger, onClick }: { icon: React.ReactNode; label: string; value?: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", outline: "none" }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: danger ? RED : LAV }}>{icon}</span>
      <span style={{ flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 14, color: danger ? RED : "rgba(255,255,255,0.9)" }}>{label}</span>
      {value ? <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{value}</span> : null}
      <ChevronRight size={17} color="rgba(255,255,255,0.28)" />
    </button>
  );
}

export default function ProfileScreen() {
  const [, navigate] = useLocation();
  const [chain, setChain] = useState(() => getChain());
  const strip = useMemo(() => lastDays(14, chain), [chain]);
  const chainStatus = chain.todayDone
    ? "Today's link is forged. See you tomorrow."
    : chain.current > 0
      ? "Today's link is still open. Don't break the chain."
      : "Study today to forge your first link.";
  const [confirm, setConfirm] = useState<null | "hints" | "progress">(null);
  const [done, setDone] = useState<null | "hints" | "progress">(null);
  const [myCount, setMyCount] = useState<number>(() => loadMyWordsCount());

  function refresh() {
    setChain(getChain());
    setMyCount(loadMyWordsCount());
  }
  function flashDone(which: "hints" | "progress") {
    setConfirm(null); setDone(which);
    setTimeout(() => setDone((d) => (d === which ? null : d)), 1600);
  }
  function doResetHints() { resetHints(); flashDone("hints"); }
  function doResetProgress() { resetProgress(); refresh(); flashDone("progress"); }

  // ── la card Chain: toccandola diventa la schermata Chain (components/CardMorph.tsx) ──
  const chainCardRef = useRef<HTMLButtonElement | null>(null);
  // tornando dalla schermata Chain la card è già al suo posto: niente animazione d'ingresso
  const [returning] = useState(() => returningFrom() === "chain");
  function openChain() {
    const card = chainCardRef.current;
    if (card) openFromCard("chain", card);
    navigate("/chain");
  }

  return (
    <div style={{ minHeight: "100%", width: "100%", background: "#0A0A0A", position: "relative" }}>
      <AppBackground showWords={false} />
      <style>{`${CHAIN_CSS}
        .vpf-breathe { animation: vpf-breathe 1.8s ease-in-out infinite; }
        @keyframes vpf-breathe { 50% { opacity: .35; box-shadow: 0 0 2px #F59E0B; } }
        @media (prefers-reduced-motion: reduce) { .vpf-breathe { animation: none; } }
      `}</style>
      <div style={{ position: "relative", zIndex: 10, maxWidth: SCREEN_MAX, margin: "0 auto", padding: "18px 16px 32px", boxSizing: "border-box" }}>

        <TabHeader tab="profile" subtitle="Your account, your chain, your settings." right={null} />

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 18 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", border: "2px solid rgba(199,184,232,0.55)", background: "rgba(167,139,250,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: LAV }}>
            <User size={24} strokeWidth={1.6} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 16, color: "#fff" }}>Free plan</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 2 }}>Sign in to sync · coming soon</div>
          </div>
        </div>

        {/* La catena: toccandola la card diventa la schermata Chain */}
        <motion.button
          ref={chainCardRef}
          onClick={openChain}
          whileTap={tapScale("card")}
          transition={TAP_SPRING}
          aria-label="Open your chain"
          style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", outline: "none", marginTop: 20, padding: "16px 16px 14px", borderRadius: 20, border: `1px solid ${CHAIN_EDGE}`, background: CHAIN_CARD_BG, color: "#fff", boxSizing: "border-box" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, fontWeight: 600 }}>
              <ChainIcon cut="#1a130a" />Chain
            </span>
            {chain.longest > 0 ? (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: "rgba(255,255,255,0.45)" }}>
                Longest <b style={{ color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{chain.longest}</b> {chain.longest === 1 ? "day" : "days"}
              </span>
            ) : null}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9, margin: "10px 0 2px" }}>
            <b data-morph-num style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 44, letterSpacing: -1.5, lineHeight: 1, backgroundImage: "linear-gradient(180deg, #fff 30%, #FCD34D)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{chain.current}</b>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{chain.current === 1 ? "day unbroken" : "days unbroken"}</span>
          </div>
          {/* gli ultimi 14 giorni, con lo stesso margine ai due lati */}
          <div style={{ margin: "14px 0 4px" }}>
            <ChainStrip days={strip} cut="#131110" animate={!returning} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "'Inter', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.32)", letterSpacing: "0.04em" }}>
            <span>2 weeks ago</span>
            <span style={{ color: "rgba(245,158,11,0.75)", letterSpacing: 0, fontSize: 11.5 }}>See your chain ›</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "rgba(255,255,255,0.7)" }}>
            <i className={chain.todayDone ? undefined : "vpf-breathe"} style={{ width: 7, height: 7, borderRadius: "50%", background: AMBER, boxShadow: `0 0 8px ${AMBER}`, flexShrink: 0 }} />
            <span>{chainStatus}</span>
          </div>
        </motion.button>

        <GroupLabel>Support</GroupLabel>
        <div style={groupCard}>
          <Row icon={<HelpCircle size={16} />} label="How Verba works" onClick={() => navigate("/how-it-works")} />
          <Divider />
          <Row icon={<ThumbsUp size={16} />} label="Rate Verba" onClick={() => { if (RATE_URL) window.open(RATE_URL, "_blank"); }} />
          <Divider />
          <Row icon={<Mail size={16} />} label="Contact support" onClick={() => { window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Verba`; }} />
        </div>

        <GroupLabel>Data</GroupLabel>
        <div style={groupCard}>
          <Row icon={<RotateCcw size={16} />} label="Reset hints" onClick={() => { setDone(null); setConfirm((c) => (c === "hints" ? null : "hints")); }} />
          {confirm === "hints" ? (
            <div style={{ padding: "0 14px 14px", borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: "11px 0 12px" }}>Show first-time hints again across the app?</p>
              <div style={{ display: "flex", gap: 9 }}>
                <button onClick={() => setConfirm(null)} style={baseBtn}>Cancel</button>
                <button onClick={doResetHints} style={amberBtn}>Reset</button>
              </div>
            </div>
          ) : null}
          {done === "hints" ? <div style={doneRow}><Check size={15} color={GREEN} /> Hints reset</div> : null}
          <Divider />
          <Row icon={<Trash2 size={16} />} label="Reset progress" danger onClick={() => { setDone(null); setConfirm((c) => (c === "progress" ? null : "progress")); }} />
          {confirm === "progress" ? (
            <div style={{ padding: "0 14px 14px", borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: "11px 0 12px" }}>This erases your learning progress and your saved words (My Verba). Your chain stays.</p>
              <div style={{ display: "flex", gap: 9 }}>
                <button onClick={() => setConfirm(null)} style={baseBtn}>Cancel</button>
                <button onClick={doResetProgress} style={dangerBtn}>Reset progress</button>
              </div>
            </div>
          ) : null}
          {done === "progress" ? <div style={doneRow}><Check size={15} color={GREEN} /> Progress reset</div> : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center", margin: "16px 0 4px", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)" }}><Lock size={12} /> Your data stays on this device</div>
        <div style={{ textAlign: "center", fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Verba v0.1 · sign in coming soon</div>

      </div>
    </div>
  );
}
