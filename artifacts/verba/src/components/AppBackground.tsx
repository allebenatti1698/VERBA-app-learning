import { motion } from "framer-motion";

// Positioned strictly in corner/edge safe zones — away from central content on all screens
const FLOATING_WORDS = [
  { word: "luminous",   x: "75%", y: "4%",  delay: 0.6,  opacity: 0.5,  fontSize: "0.82rem" },
  { word: "ephemeral",  x: "1%",  y: "30%", delay: 0.8,  opacity: 0.48, fontSize: "0.8rem"  },
  { word: "cogent",     x: "87%", y: "50%", delay: 1.0,  opacity: 0.5,  fontSize: "0.82rem" },
  { word: "liminal",    x: "1%",  y: "60%", delay: 0.7,  opacity: 0.3,  fontSize: "0.75rem" },
  { word: "reverie",    x: "65%", y: "92%", delay: 0.9,  opacity: 0.32, fontSize: "0.77rem" },
  { word: "querulous",  x: "5%",  y: "5%",  delay: 1.2,  opacity: 0.28, fontSize: "0.73rem" },
  { word: "sanguine",   x: "48%", y: "94%", delay: 1.3,  opacity: 0.3,  fontSize: "0.75rem" },
  { word: "ineffable",  x: "1%",  y: "82%", delay: 1.1,  opacity: 0.16, fontSize: "0.68rem" },
  { word: "tenuous",    x: "86%", y: "68%", delay: 0.5,  opacity: 0.15, fontSize: "0.67rem" },
  { word: "obsequious", x: "10%", y: "93%", delay: 1.4,  opacity: 0.14, fontSize: "0.66rem" },
];

function FloatingWord({
  word, x, y, delay, opacity, fontSize,
}: {
  word: string; x: string; y: string; delay: number;
  opacity: number; fontSize: string;
}) {
  return (
    <motion.span
      className="absolute select-none pointer-events-none"
      style={{
        left: x, top: y,
        fontFamily: "'Inter', sans-serif",
        fontWeight: 300, fontSize,
        letterSpacing: "0.13em",
        color: "#D97706",
        textShadow: "0 0 10px rgba(217,119,6,0.55), 0 0 22px rgba(217,119,6,0.25)",
        whiteSpace: "nowrap",
      }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, opacity, opacity * 0.75, opacity],
        y: [0, -5, 0, 5, 0],
      }}
      transition={{ delay, duration: 9, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1] }}
    >
      {word}
    </motion.span>
  );
}

function ChromaticOrbs() {
  return (
    <>
      <motion.div
        aria-hidden
        animate={{ opacity: [0.20, 0.30, 0.20], x: [0, 14, 0], y: [0, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        style={{
          position: "absolute", top: "5%", left: "0%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, #4C1D95 0%, transparent 70%)",
          filter: "blur(120px)", pointerEvents: "none", zIndex: 1,
        }}
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.15, 0.25, 0.15], x: [0, -18, 0], y: [0, 12, 0] }}
        transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 3 }}
        style={{
          position: "absolute", bottom: "5%", right: "0%",
          width: 350, height: 350, borderRadius: "50%",
          background: "radial-gradient(circle, #9D174D 0%, transparent 70%)",
          filter: "blur(120px)", pointerEvents: "none", zIndex: 1,
        }}
      />
    </>
  );
}

function BackgroundHalos() {
  return (
    <>
      <motion.div
        aria-hidden
        animate={{ opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: "70vw", height: "55vh",
          background: "radial-gradient(ellipse at 50% 0%, rgba(217,119,6,0.28) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 2,
        }}
      />
      <motion.div
        aria-hidden
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "70vw", height: "55vh",
          background: "radial-gradient(ellipse at 50% 100%, rgba(217,119,6,0.24) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 2,
        }}
      />
    </>
  );
}

export default function AppBackground({ showWords = true }: { showWords?: boolean }) {
  return (
    <>
      <ChromaticOrbs />
      <BackgroundHalos />
      {showWords && FLOATING_WORDS.map((fw) => (
        <FloatingWord key={fw.word} {...fw} />
      ))}
    </>
  );
}
