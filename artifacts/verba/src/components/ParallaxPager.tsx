import { useRef, useState, useLayoutEffect, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate, type MotionValue } from "framer-motion";

/** Quanto ogni banda "resta indietro" rispetto al dito. Banda 0 = parola (segue quasi 1:1). */
const LAG = 0.055;
/** Frazione di larghezza oltre la quale il rilascio conferma il cambio pagina. */
const COMMIT_RATIO = 0.28;
/** Velocità (px/s) oltre la quale un flick conferma comunque il cambio pagina. */
const FLICK_VELOCITY = 450;
const SPRING = { type: "spring" as const, stiffness: 210, damping: 27, restDelta: 0.4 };

function Band({ x, k, children }: { x: MotionValue<number>; k: number; children: ReactNode }) {
  const bx = useTransform(x, (v) => -v * (k * LAG));
  return <motion.div style={{ x: bx }}>{children}</motion.div>;
}

function Slide({
  x,
  offset,
  bands,
  slideRef,
}: {
  x: MotionValue<number>;
  offset: -1 | 0 | 1;
  bands: ReactNode[];
  slideRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={slideRef} style={{ position: "absolute", top: 0, left: `${offset * 100}%`, width: "100%" }}>
      {bands.map((b, k) => (
        <Band key={k} x={x} k={k}>
          {b}
        </Band>
      ))}
    </div>
  );
}

interface ParallaxPagerProps {
  index: number;
  total: number;
  onIndexChange: (next: number) => void;
  renderBands: (i: number) => ReactNode[];
}

export default function ParallaxPager({ index, total, onIndexChange, renderBands }: ParallaxPagerProps) {
  const x = useMotionValue(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState(0);
  const [heights, setHeights] = useState<[number, number, number]>([0, 0, 0]);

  const canPrev = index > 0;
  const canNext = index < total - 1;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const measure = () =>
      setHeights([
        prevRef.current?.offsetHeight ?? 0,
        curRef.current?.offsetHeight ?? 0,
        nextRef.current?.offsetHeight ?? 0,
      ]);
    measure();
    const t = window.setTimeout(measure, 80);
    return () => window.clearTimeout(t);
  }, [index, width, total]);

  const W = width || 1;
  const hCur = heights[1];
  const heightMV = useTransform(
    x,
    [-W, 0, W],
    [heights[2] || hCur, hCur, heights[0] || hCur]
  );

  const handleDragEnd = (_e: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const dist = info.offset.x;
    const vel = info.velocity.x;
    let dir: -1 | 0 | 1 = 0;
    if ((dist < -W * COMMIT_RATIO || vel < -FLICK_VELOCITY) && canNext) dir = -1;
    else if ((dist > W * COMMIT_RATIO || vel > FLICK_VELOCITY) && canPrev) dir = 1;

    animate(x, dir * W, {
      ...SPRING,
      velocity: vel,
      onComplete: () => {
        if (dir !== 0) onIndexChange(index + (dir === -1 ? 1 : -1));
        x.set(0);
      },
    });
  };

  return (
    <motion.div
      ref={wrapRef}
      style={{
        position: "relative",
        width: "100%",
        height: hCur ? heightMV : undefined,
        clipPath: "inset(-2000px 0 -2000px 0)",
        touchAction: "pan-y",
        cursor: "grab",
      }}
    >
      <motion.div
        drag={total > 1 ? "x" : false}
        dragConstraints={{ left: canNext ? -W : 0, right: canPrev ? W : 0 }}
        dragElastic={0.3}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, position: "relative", width: "100%" }}
      >
        <Slide x={x} offset={-1} slideRef={prevRef} bands={canPrev ? renderBands(index - 1) : []} />
        <Slide x={x} offset={0} slideRef={curRef} bands={renderBands(index)} />
        <Slide x={x} offset={1} slideRef={nextRef} bands={canNext ? renderBands(index + 1) : []} />
      </motion.div>
    </motion.div>
  );
}
