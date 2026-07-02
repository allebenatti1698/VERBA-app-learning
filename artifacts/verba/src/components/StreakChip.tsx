// src/components/StreakChip.tsx
// Momentum streak chip per l'header di Study/Progress.
// Legge lo streak reale (giorni consecutivi) via getMomentum().
// Zero-state (streak 0): flame spento + "Start", così l'header non resta mai asimmetrico.
import { Flame } from "lucide-react";
import { getMomentum } from "@/lib/studyActivity";

export default function StreakChip() {
  const streak = getMomentum();
  const active = streak >= 1;
  const color = active ? "#F59E0B" : "rgba(245,158,11,0.5)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "'Inter', sans-serif",
        fontSize: 12,
        fontWeight: 500,
        color,
      }}
    >
      <Flame size={14} color={color} strokeWidth={1.8} />
      {active ? `${streak} ${streak === 1 ? "day" : "days"}` : "Start"}
    </span>
  );
}
