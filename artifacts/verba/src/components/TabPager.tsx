import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { motion, animate, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { useLocation } from "wouter";
import StudyScreen from "@/pages/StudyScreen";
import PracticeHomeScreen from "@/pages/PracticeHomeScreen";
import ProgressScreen from "@/pages/ProgressScreen";
import ProfileScreen from "@/pages/ProfileScreen";

// Le quattro schede come una striscia sola, affiancate.
//
// · Il dito trascina la striscia: mentre sfogli vedi la scheda nuova entrare e
//   la vecchia uscire.
// · Al rilascio decide la fisica: oltre un quarto dello schermo, oppure con un
//   colpo veloce, si va alla scheda accanto; altrimenti si torna. La molla parte
//   dalla velocità del dito, quindi fra trascinamento e animazione non c'è scatto.
// · I bottoni della barra in basso usano la stessa molla.
// · Il gesto si blocca su una direzione dopo pochi pixel: in verticale scorri la
//   pagina, in orizzontale sfogli. Ogni scheda ha il suo scroll e lo ricorda.
// · Un gesto orizzontale che appartiene già a qualcos'altro (uno swipe per
//   togliere una riga, un carosello, uno slider) NON viene rubato.

export const TAB_ORDER = ["/study", "/decks", "/progress", "/profile"];
const SCREENS: ComponentType[] = [StudyScreen, PracticeHomeScreen, ProgressScreen, ProfileScreen];

/* ── numeri da tarare a occhio ── */
const SPRING = { type: "spring" as const, stiffness: 260, damping: 32, mass: 0.9 };
const LOCK_PX = 10;          // pixel prima di decidere la direzione del gesto
const COMMIT_RATIO = 0.22;   // quota di schermo oltre la quale si cambia scheda
const FLICK_V = 0.45;        // px/ms: un colpo veloce cambia scheda anche se corto
const EDGE_RESIST = 0.3;     // quanto cede l'elastico ai bordi
const DEPTH_SCALE = 0.04;    // di quanto rimpicciolisce la scheda che si allontana
const DEPTH_DIM = 0.45;      // quanto si scurisce

/** Il gesto parte su qualcosa che ha già un suo significato orizzontale? */
function ownsHorizontalGesture(target: EventTarget | null, stop: HTMLElement | null): boolean {
  for (let n = target as HTMLElement | null; n && n !== stop; n = n.parentElement) {
    if (n.dataset && n.dataset.pagerIgnore !== undefined) return true;
    // gli elementi trascinabili in orizzontale di framer-motion (drag="x")
    // dichiarano touch-action pan-y; lo fanno anche le righe delle trouble words
    const ta = n.style ? n.style.touchAction : "";
    if (ta === "pan-y" || ta === "none") return true;
    if (n.tagName === "INPUT" && (n as HTMLInputElement).type === "range") return true;
    if (n.scrollWidth > n.clientWidth + 1) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
  }
  return false;
}

function Panel({ i, x, width, reduce, children }: { i: number; x: MotionValue<number>; width: number; reduce: boolean; children: ReactNode }) {
  // 0 quando la scheda è al centro, 1 quando è un'intera larghezza più in là
  const dist = useTransform(x, (v) => (width ? Math.min(1, Math.abs(v + i * width) / width) : 0));
  const scale = useTransform(dist, (d) => (reduce ? 1 : 1 - d * DEPTH_SCALE));
  const dim = useTransform(dist, (d) => (reduce ? 0 : d * DEPTH_DIM));
  return (
    <motion.div style={{ position: "absolute", top: 0, bottom: 0, left: `${i * 100}%`, width: "100%", scale, transformOrigin: "50% 45%" }}>
      <div
        style={{
          position: "absolute", inset: 0, overflowY: "auto", overflowX: "hidden",
          overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </div>
      <motion.div aria-hidden style={{ position: "absolute", inset: 0, background: "#000", opacity: dim, pointerEvents: "none" }} />
    </motion.div>
  );
}

type Drag = { id: number; x0: number; y0: number; base: number; lock: "x" | null; lastX: number; lastT: number; v: number };

export default function TabPager({ location }: { location: string }) {
  const [, navigate] = useLocation();
  const index = Math.max(0, TAB_ORDER.indexOf(location));
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);
  const drag = useRef<Drag | null>(null);
  const justDragged = useRef(0);          // istante dell'ultimo sfoglio
  const indexRef = useRef(index);
  indexRef.current = index;
  const [reduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  // larghezza della finestra: al primo disegno la striscia è già al posto giusto
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setWidth(w);
      if (!drag.current) x.set(-indexRef.current * w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [x]);

  // cambio di scheda (dal dito o dalla barra): la molla parte dalla velocità attuale
  useEffect(() => {
    if (!width || drag.current?.lock === "x") return;
    const controls = animate(x, -index * width, reduce ? { duration: 0.12 } : { ...SPRING, velocity: x.getVelocity() });
    return () => controls.stop();
  }, [index, width, reduce, x]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (ownsHorizontalGesture(e.target, ref.current)) return;
    const now = performance.now();
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: x.get(), lock: null, lastX: e.clientX, lastT: now, v: 0 };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.lock) {
      if (Math.abs(dx) > LOCK_PX && Math.abs(dx) > Math.abs(dy) * 1.3) {
        d.lock = "x";
        x.stop();
        d.base = x.get() - dx;               // la striscia segue il dito da dov'è adesso
        try { ref.current?.setPointerCapture(e.pointerId); } catch { /* */ }
      } else if (Math.abs(dy) > LOCK_PX) {
        drag.current = null;                 // è uno scroll verticale: non è affar nostro
        return;
      } else {
        return;
      }
    }
    const min = -(TAB_ORDER.length - 1) * width;
    let nx = d.base + dx;
    if (nx > 0) nx *= EDGE_RESIST;
    if (nx < min) nx = min + (nx - min) * EDGE_RESIST;
    x.set(nx);
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt > 0) d.v = 0.8 * ((e.clientX - d.lastX) / dt) + 0.2 * d.v;
    d.lastX = e.clientX;
    d.lastT = now;
  }

  function onPointerEnd(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || d.lock !== "x") return;
    justDragged.current = performance.now(); // il click che segue il rilascio non deve aprire niente
    const dx = e.clientX - d.x0;
    const cur = indexRef.current;
    let target = cur;
    if (dx < -width * COMMIT_RATIO || d.v < -FLICK_V) target = Math.min(TAB_ORDER.length - 1, cur + 1);
    else if (dx > width * COMMIT_RATIO || d.v > FLICK_V) target = Math.max(0, cur - 1);
    if (target !== cur) navigate(TAB_ORDER[target]);
    else animate(x, -cur * width, reduce ? { duration: 0.12 } : { ...SPRING, velocity: d.v * 1000 });
  }

  function onClickCapture(e: React.MouseEvent) {
    // solo il click che arriva subito dopo uno sfoglio: un tocco vero, più tardi, passa
    if (performance.now() - justDragged.current > 350) return;
    justDragged.current = 0;
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
      style={{ position: "absolute", inset: 0, overflow: "hidden", touchAction: "pan-y", background: "#0A0A0A" }}
    >
      <motion.div style={{ position: "absolute", inset: 0, x }}>
        {SCREENS.map((Screen, i) => (
          <Panel key={TAB_ORDER[i]} i={i} x={x} width={width} reduce={reduce}>
            <Screen />
          </Panel>
        ))}
      </motion.div>
    </div>
  );
}
