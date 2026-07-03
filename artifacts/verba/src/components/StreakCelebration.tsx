// src/components/StreakCelebration.tsx
// Celebrazione "streak esteso": overlay full-screen sulla Results.
// Scatta solo alla PRIMA Results del giorno (logica di trigger nel ResultsScreen).
// Fiamma viva (morphing SMIL, layered) + glow/raggi tenui + scintille dosate + week strip reale.
// NB: la fiamma definitiva potrà diventare Lottie/Rive; qui è SVG morphing (nessuna dipendenza extra).
import { useMemo, type CSSProperties } from "react";
import { getMomentum, getWeekStrip } from "@/lib/studyActivity";

interface Props {
  onDismiss: () => void;
}

const CSS = `
.vsc-overlay { position: fixed; inset: 0; z-index: 120; background: #0A0A0A; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.vsc-glow { position: absolute; top: 36%; left: 50%; width: 500px; height: 500px; transform: translate(-50%,-50%) scale(0.6); background: radial-gradient(circle, rgba(245,158,11,0.34), rgba(234,88,12,0.10) 44%, transparent 66%); filter: blur(8px); opacity: 0; pointer-events: none; animation: vsc-glowin 0.5s ease-out forwards; }
.vsc-rays { position: absolute; top: 36%; left: 50%; width: 600px; height: 600px; transform: translate(-50%,-50%); background: repeating-conic-gradient(from 0deg, rgba(251,191,36,0.07) 0deg 3.5deg, transparent 3.5deg 22.5deg); -webkit-mask: radial-gradient(circle, rgba(0,0,0,0.7) 10%, rgba(0,0,0,0.32) 32%, transparent 60%); mask: radial-gradient(circle, rgba(0,0,0,0.7) 10%, rgba(0,0,0,0.32) 32%, transparent 60%); opacity: 0; pointer-events: none; animation: vsc-raysin 0.7s ease-out 0.14s forwards, vsc-spin 34s linear infinite; }
.vsc-content { position: relative; z-index: 3; display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 360px; padding: 0 30px; }
.vsc-flamewrap { opacity: 0; margin-bottom: 4px; transform-origin: center bottom; animation: vsc-flamein 0.56s cubic-bezier(0.34,1.56,0.64,1) 0.16s forwards; }
.vsc-flame-inner { display: inline-block; transform-origin: center bottom; animation: vsc-sway 3.2s ease-in-out infinite; }
.vsc-flame-svg { filter: drop-shadow(0 0 20px rgba(245,158,11,0.5)); animation: vsc-heat 2.4s ease-in-out infinite; }
.vsc-num { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 94px; line-height: 0.9; color: #FFFFFF; text-shadow: 0 0 24px rgba(245,158,11,0.5); opacity: 0; animation: vsc-numin 0.52s cubic-bezier(0.34,1.56,0.64,1) 0.48s forwards; }
.vsc-label { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: 0.22em; color: #F59E0B; margin-top: 2px; opacity: 0; animation: vsc-up 0.32s cubic-bezier(0.34,1.56,0.64,1) 0.74s forwards; }
.vsc-sub { font-family: 'Inter', sans-serif; font-size: 13px; color: rgba(255,255,255,0.55); margin-top: 14px; text-align: center; opacity: 0; animation: vsc-up 0.32s cubic-bezier(0.34,1.56,0.64,1) 0.86s forwards; }
.vsc-sparks { position: absolute; top: 36%; left: 50%; width: 0; height: 0; z-index: 4; pointer-events: none; }
.vsc-spark { position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%; background: #FBBF24; box-shadow: 0 0 6px rgba(251,191,36,0.8); opacity: 0; animation: vsc-sparkfly 0.85s cubic-bezier(.2,.7,.3,1) var(--delay) forwards; }
.vsc-week { display: flex; gap: 12px; margin-top: 26px; }
.vsc-day { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.vsc-dl { font-family: 'Inter', sans-serif; font-size: 10px; color: rgba(255,255,255,0.4); }
.vsc-dot { width: 26px; height: 26px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.14); background: transparent; }
.vsc-dot.vsc-fill { animation: vsc-dotfill 0.42s cubic-bezier(0.34,1.56,0.64,1) both; }
.vsc-dot.vsc-today { animation: vsc-dotfill-today 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
.vsc-continue { margin-top: 34px; background: linear-gradient(90deg,#D97706,#F59E0B); color: #fff; font-family: 'Space Grotesk', sans-serif; font-weight: 500; font-size: 15px; padding: 13px 46px; border: none; border-radius: 9999px; cursor: pointer; outline: none; opacity: 0; box-shadow: 0 8px 26px rgba(245,158,11,0.3); animation: vsc-up 0.42s cubic-bezier(0.34,1.56,0.64,1) 1.58s forwards; }
.vsc-continue:active { transform: scale(0.96); }
@keyframes vsc-glowin { from { opacity: 0; transform: translate(-50%,-50%) scale(0.6); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }
@keyframes vsc-raysin { from { opacity: 0; } to { opacity: 1; } }
@keyframes vsc-spin { to { transform: translate(-50%,-50%) rotate(360deg); } }
@keyframes vsc-flamein { from { opacity: 0; transform: scale(0.25); } to { opacity: 1; transform: scale(1); } }
@keyframes vsc-sway { 0%,100% { transform: rotate(-1.2deg) translateX(-1px); } 50% { transform: rotate(1.2deg) translateX(1px); } }
@keyframes vsc-heat { 0%,100% { filter: drop-shadow(0 0 18px rgba(245,158,11,0.42)); } 50% { filter: drop-shadow(0 0 28px rgba(245,158,11,0.62)); } }
@keyframes vsc-numin { 0% { opacity: 0; transform: scale(1.7); } 60% { opacity: 1; transform: scale(0.94); } 100% { opacity: 1; transform: scale(1); } }
@keyframes vsc-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes vsc-sparkfly { from { opacity: 1; transform: translate(0,0) scale(1); } to { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0.2); } }
@keyframes vsc-dotfill { 0% { background-color: rgba(245,158,11,0); border-color: rgba(255,255,255,0.14); transform: scale(1); } 55% { background-color: rgba(245,158,11,1); border-color: rgba(245,158,11,1); transform: scale(1.22); } 100% { background-color: rgba(245,158,11,1); border-color: rgba(245,158,11,1); transform: scale(1); } }
@keyframes vsc-dotfill-today { 0% { background-color: rgba(245,158,11,0); border-color: rgba(255,255,255,0.14); transform: scale(1); box-shadow: 0 0 0 rgba(245,158,11,0); } 55% { background-color: rgba(245,158,11,1); border-color: rgba(245,158,11,1); transform: scale(1.28); box-shadow: 0 0 14px rgba(245,158,11,0.8); } 100% { background-color: rgba(245,158,11,1); border-color: rgba(245,158,11,1); transform: scale(1); box-shadow: 0 0 7px rgba(245,158,11,0.45); } }
`;

export default function StreakCelebration({ onDismiss }: Props) {
  const streak = getMomentum();
  const week = getWeekStrip();

  const sparks = useMemo(() => {
    const n = 12;
    return Array.from({ length: n }, (_, i) => {
      const angle = (Math.PI * 2 * i) / n + (Math.random() * 0.5 - 0.25);
      const dist = 70 + Math.random() * 60;
      return {
        tx: `${Math.cos(angle) * dist}px`,
        ty: `${Math.sin(angle) * dist - 24}px`,
        sz: `${3 + Math.random() * 4}px`,
        delay: `${0.5 + Math.random() * 0.06}s`,
      };
    });
  }, []);

  return (
    <div className="vsc-overlay" role="dialog" aria-label={`Streak: ${streak} giorni`}>
      <style>{CSS}</style>
      <div className="vsc-glow" />
      <div className="vsc-rays" />
      <div className="vsc-sparks">
        {sparks.map((s, i) => (
          <div
            key={i}
            className="vsc-spark"
            style={{ "--tx": s.tx, "--ty": s.ty, "--sz": s.sz, "--delay": s.delay } as CSSProperties}
          />
        ))}
      </div>

      <div className="vsc-content">
        <div className="vsc-flamewrap">
          <span className="vsc-flame-inner">
            <svg className="vsc-flame-svg" width="132" height="150" viewBox="0 0 120 150">
              <defs>
                <linearGradient id="vsc-fg" x1="0.5" y1="1" x2="0.5" y2="0">
                  <stop offset="0%" stopColor="#DC2626" />
                  <stop offset="30%" stopColor="#EA580C" />
                  <stop offset="62%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#FEF3C7" />
                </linearGradient>
                <linearGradient id="vsc-fgi" x1="0.5" y1="1" x2="0.5" y2="0">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="55%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#FFFDF5" />
                </linearGradient>
                <radialGradient id="vsc-core" cx="0.5" cy="0.64" r="0.5">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path fill="url(#vsc-fg)" d="M60 10 C 74 42 98 60 100 96 C 104 120 98 134 80 141 C 70 146 50 146 40 141 C 22 134 16 120 20 96 C 22 60 46 42 60 10 Z">
                <animate attributeName="d" dur="1.5s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;0.75;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1" values="M60 10 C 74 42 98 60 100 96 C 104 120 98 134 80 141 C 70 146 50 146 40 141 C 22 134 16 120 20 96 C 22 60 46 42 60 10 Z;M63 12 C 80 44 102 62 103 97 C 107 120 99 134 80 142 C 70 147 50 147 40 141 C 21 133 18 118 23 95 C 26 58 47 42 63 12 Z;M57 12 C 68 40 92 58 96 95 C 100 120 97 135 79 142 C 69 147 49 147 39 142 C 19 134 13 118 17 97 C 22 62 44 44 57 12 Z;M60 6 C 72 40 98 60 101 97 C 105 120 99 133 81 141 C 71 146 51 146 41 141 C 21 133 16 120 20 97 C 23 58 49 40 60 6 Z;M60 10 C 74 42 98 60 100 96 C 104 120 98 134 80 141 C 70 146 50 146 40 141 C 22 134 16 120 20 96 C 22 60 46 42 60 10 Z" />
              </path>
              <path fill="url(#vsc-fgi)" d="M60 56 C 68 78 82 94 84 112 C 87 126 82 137 70 141 C 66 144 54 144 50 141 C 38 137 33 126 36 112 C 38 94 52 78 60 56 Z">
                <animate attributeName="d" dur="1.25s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.33;0.66;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1" values="M60 56 C 68 78 82 94 84 112 C 87 126 82 137 70 141 C 66 144 54 144 50 141 C 38 137 33 126 36 112 C 38 94 52 78 60 56 Z;M62 58 C 72 80 86 95 87 113 C 90 126 84 137 71 142 C 67 144 55 144 51 141 C 39 137 35 127 38 113 C 40 96 52 80 62 58 Z;M58 58 C 66 78 78 94 81 112 C 84 126 80 138 69 142 C 65 144 53 144 49 141 C 37 137 32 126 35 113 C 37 95 50 78 58 58 Z;M60 56 C 68 78 82 94 84 112 C 87 126 82 137 70 141 C 66 144 54 144 50 141 C 38 137 33 126 36 112 C 38 94 52 78 60 56 Z" />
              </path>
              <ellipse cx="60" cy="114" rx="15" ry="21" fill="url(#vsc-core)">
                <animate attributeName="ry" dur="1.1s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" values="21;25;21" />
                <animate attributeName="cy" dur="1.1s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" values="114;110;114" />
              </ellipse>
            </svg>
          </span>
        </div>

        <div className="vsc-num">{streak}</div>
        <div className="vsc-label">DAY STREAK</div>
        <div className="vsc-sub">{streak === 1 ? "Your streak begins — keep it alive." : "You're on fire — keep it going."}</div>

        <div className="vsc-week">
          {week.map((d, i) => {
            let cls = "vsc-dot";
            if (d.studied) cls += d.isToday ? " vsc-today" : " vsc-fill";
            const delay = `${1.0 + i * 0.08}s`;
            return (
              <div className="vsc-day" key={i}>
                <div className={cls} style={d.studied ? { animationDelay: delay } : undefined} />
                <span className="vsc-dl">{d.weekday}</span>
              </div>
            );
          })}
        </div>

        <button className="vsc-continue" onClick={onDismiss}>Continue</button>
      </div>
    </div>
  );
}
