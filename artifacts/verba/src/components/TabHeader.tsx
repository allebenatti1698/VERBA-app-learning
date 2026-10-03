import type { ReactNode } from "react";
import { useLocation } from "wouter";
import TabIcon, { type TabKey } from "@/components/TabIcon";
import DeckPill from "@/components/DeckPill";

// L'intestazione di ogni scheda, identica ovunque:
//   [icona] Titolo                         [pillola del deck]
//   una riga che dice a cosa serve la scheda
// L'icona fa il suo gesto quando la scheda diventa quella attiva, nello stesso
// istante dell'icona nella barra in basso.
// Le pagine DENTRO una scheda (setup, scelta dei set…) non usano questa
// intestazione: hanno il tasto indietro e un titolo loro.

const META: Record<TabKey, { path: string; title: string; color: string }> = {
  study: { path: "/study", title: "Study", color: "#C7B8E8" },
  practice: { path: "/decks", title: "Practice", color: "#A78BFA" },
  progress: { path: "/progress", title: "Progress", color: "#F59E0B" },
  profile: { path: "/profile", title: "Profile", color: "#E5E7EB" },
};

export default function TabHeader({
  tab,
  subtitle,
  right,
}: {
  tab: TabKey;
  subtitle: string;
  /** Cosa sta a destra del titolo. Assente = la pillola del deck; null = niente. */
  right?: ReactNode;
}) {
  const [location] = useLocation();
  const m = META[tab];
  const active = location === m.path || (tab === "practice" && location === "/choose-deck");

  return (
    <>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span style={{ color: m.color, display: "flex" }}>
            <TabIcon tab={tab} active={active} size={28} />
          </span>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 30, letterSpacing: "-0.8px", color: "#fff", margin: 0 }}>
            {m.title}
          </h1>
        </div>
        {right === undefined ? <DeckPill current="gre" /> : right}
      </div>
      <p style={{ position: "relative", fontFamily: "'Inter', sans-serif", fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.5)", margin: "6px 0 24px" }}>
        {subtitle}
      </p>
    </>
  );
}
