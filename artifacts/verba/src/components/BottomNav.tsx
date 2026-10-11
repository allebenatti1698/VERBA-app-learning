import { useLocation } from "wouter";
import { motion } from "framer-motion";
import TabIcon, { type TabKey } from "@/components/TabIcon";
import { tapScale, TAP_SPRING } from "@/components/SpringTap";

export const TAB_PATHS = ["/study", "/decks", "/progress", "/profile", "/choose-deck"];

const TABS: { path: string; label: string; tab: TabKey }[] = [
  { path: "/study", label: "Study", tab: "study" },
  { path: "/decks", label: "Practice", tab: "practice" },
  { path: "/progress", label: "Progress", tab: "progress" },
  { path: "/profile", label: "Profile", tab: "profile" },
];

const ACTIVE = "#F59E0B";
const INACTIVE = "rgba(255,255,255,0.4)";

/**
 * La barra delle schede. Vive DENTRO lo strato delle schede (App.tsx): è sempre
 * montata, quindi tornando da una pagina non ricompare e l'icona attiva non si
 * ridisegna. `location` è la scheda corrente (anche mentre una pagina la copre).
 */
export default function BottomNav({ location }: { location: string }) {
  const [, navigate] = useLocation();

  return (
    <nav
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        background: "#0C0C0C",
        borderTop: "0.5px solid rgba(255,255,255,0.10)",
        padding: "10px 6px",
        paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
      }}
    >
      {TABS.map(({ path, label, tab }) => {
        const active = location === path || (path === "/decks" && location === "/choose-deck");
        return (
          <motion.button
            key={path}
            whileTap={tapScale("icon")}
            transition={TAP_SPRING}
            onClick={() => navigate(path)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "2px 10px",
              outline: "none",
            }}
          >
            <span style={{ display: "flex", color: active ? ACTIVE : INACTIVE }}>
              <TabIcon tab={tab} active={active} size={22} />
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                fontWeight: active ? 500 : 400,
                color: active ? ACTIVE : INACTIVE,
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
