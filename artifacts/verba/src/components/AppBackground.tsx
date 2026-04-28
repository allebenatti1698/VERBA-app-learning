import { motion } from "framer-motion";

const FLOATING_WORDS = [
  { word: "luminous",   x: "70%", y: "7%",  delay: 0.6,  opacity: 0.5,  fontSize: "0.82rem" },
  { word: "ephemeral",  x: "4%",  y: "22%", delay: 0.8,  opacity: 0.48, fontSize: "0.8rem"  },
  { word: "cogent",     x: "75%", y: "44%", delay: 1.0,  opacity: 0.5,  fontSize: "0.82rem" },
  { word: "liminal",    x: "2%",  y: "50%", delay: 0.7,  opacity: 0.3,  fontSize: "0.75rem" },
  { word: "reverie",    x: "66%", y: "74%", delay: 0.9,  opacity: 0.32, fontSize: "0.77rem" },
  { word: "querulous",  x: "14%", y: "10%", delay: 1.2,  opacity: 0.28, fontSize: "0.73rem" },
  { word: "sanguine",   x: "58%", y: "90%", delay: 1.3,  opacity: 0.3,  fontSize: "0.75rem" },
  { word: "ineffable",  x: "6%",  y: "80%", delay: 1.1,  opacity: 0.16, fontSize: "0.68rem" },
  { word: "tenuous",    x: "80%", y: "62%", delay: 0.5,  opacity: 0.15, fontSize: "0.67rem" },
  { word: "obsequious", x: "18%", y: "90%", delay: 1.4,  opacity: 0.14, fontSize: "0.66rem" },
];

function FloatingWord({
  word, x, y, delay, opacity, fontSize, dimWords,
}: {
  word: string; x: string; y: string; delay: number;
  opacity: number; fontSize: string; dimWords: boolean;
}) {
  const finalOpacity = dimWords ? opacity * 0.5 : opacity;
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
        opacity: [0, finalOpacity, finalOpacity * 0.75, finalOpacity],
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

export default function AppBackground({ dimWords = false }: { dimWords?: boolean }) {
  return (
    <>
      <ChromaticOrbs />
      <BackgroundHalos />
      {FLOATING_WORDS.map((fw) => (
        <FloatingWord key={fw.word} {...fw} dimWords={dimWords} />
      ))}
    </>
  );
}
