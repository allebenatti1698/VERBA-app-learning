import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Target, LineChart, User } from "lucide-react";

export const TAB_PATHS = ["/study", "/decks", "/progress", "/profile"];

const TABS = [
  { path: "/study", label: "Study", Icon: BookOpen },
  { path: "/decks", label: "Practice", Icon: Target },
  { path: "/progress", label: "Progress", Icon: LineChart },
  { path: "/profile", label: "Profile", Icon: User },
];

const ACTIVE = "#F59E0B";
const INACTIVE = "rgba(255,255,255,0.4)";

export default function BottomNav() {
  const [location, navigate] = useLocation();
  if (!TAB_PATHS.includes(location)) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
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
      {TABS.map(({ path, label, Icon }) => {
        const active = location === path;
        return (
          <motion.button
            key={path}
            whileTap={{ scale: 0.9 }}
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
            <Icon size={22} strokeWidth={active ? 2 : 1.6} color={active ? ACTIVE : INACTIVE} />
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
    </motion.nav>
  );
}
