import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Star, Loader2 } from "lucide-react";
import AppBackground from "@/components/AppBackground";
import { SCREEN_MAX } from "@/components/ScreenColumn";
import { fetchWordsByIds, type QuizWord } from "@/lib/quizQueries";

const AMBER = "#F59E0B";

function loadMyWordIds(): string[] {
  try { return JSON.parse(localStorage.getItem("verba_my_words") ?? "[]") as string[]; }
  catch { return []; }
}
function saveMyWordIds(ids: string[]): void {
  try { localStorage.setItem("verba_my_words", JSON.stringify(ids)); } catch { /* */ }
}

export default function MyVerbaScreen() {
  const [, navigate] = useLocation();
  const [words, setWords] = useState<QuizWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    const ids = loadMyWordIds();
    if (ids.length === 0) { setWords([]); setError(null); setLoading(false); return; }
    setLoading(true); setError(null);
    fetchWordsByIds(ids)
      .then((ws) => { setWords(ws); setLoading(false); })
      .catch((e) => { setError(e?.message ?? "Couldn't load your words."); setLoading(false); });
  }
  useEffect(() => { load(); }, []);

  function unstar(id: string) {
    saveMyWordIds(loadMyWordIds().filter((x) => x !== id));
    setWords((prev) => prev.filter((w) => w.id !== id));
  }

  return (
    <div style={{ minHeight: "100%", width: "100%", background: "#0A0A0A", position: "relative" }}>
      <AppBackground showWords={false} />
      <div style={{ position: "relative", zIndex: 10, maxWidth: SCREEN_MAX, margin: "0 auto", padding: "18px 16px 36px", boxSizing: "border-box" }}>

        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <button onClick={() => navigate("/profile")} aria-label="Go back" style={{ position: "absolute", left: 0, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 24, color: "rgba(245,158,11,0.8)", padding: "2px 8px", lineHeight: 1, outline: "none" }}>‹</button>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontStyle: "italic", fontSize: 13, color: "rgba(245,158,11,0.8)" }}>Verba</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Star size={22} color={AMBER} fill={AMBER} />
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 24, color: "#fff", margin: 0 }}>My Verba</h1>
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 20px" }}>
          {words.length > 0 ? `${words.length} ${words.length === 1 ? "word" : "words"} you've saved` : "Your saved words"}
        </p>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} style={{ display: "inline-flex" }}>
              <Loader2 size={22} color="rgba(255,255,255,0.5)" />
            </motion.div>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "32px 12px" }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.55)", marginBottom: 14 }}>{error}</p>
            <button onClick={load} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: AMBER, background: "rgba(245,158,11,0.1)", border: "0.5px solid rgba(245,158,11,0.35)", borderRadius: 9, padding: "8px 18px", cursor: "pointer", outline: "none" }}>Try again</button>
          </div>
        ) : words.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <Star size={34} color="rgba(255,255,255,0.2)" strokeWidth={1.5} />
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.7)", margin: "16px 0 6px" }}>No saved words yet</p>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, margin: 0 }}>Tap the ★ on any word while studying to build your own focused collection.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {words.map((w) => {
              const pos = w.allDefinitions?.[0]?.part_of_speech ?? "";
              return (
                <div key={w.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(255,255,255,0.035)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "13px 14px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 600, color: "#fff" }}>{w.word}</span>
                      {pos ? <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontStyle: "italic", color: "rgba(199,184,232,0.6)" }}>{pos}</span> : null}
                    </div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, margin: "4px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{w.correctDefinition}</p>
                  </div>
                  <button onClick={() => unstar(w.id)} aria-label="Remove from My Verba" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, outline: "none", flexShrink: 0 }}>
                    <Star size={18} color={AMBER} fill={AMBER} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
