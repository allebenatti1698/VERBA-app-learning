import { useEffect, useRef } from "react";

const ROAMING_WORDS = [
  { word: "luminous",   baseOpacity: 0.5,  fontSize: "0.82rem" },
  { word: "ephemeral",  baseOpacity: 0.46, fontSize: "0.8rem"  },
  { word: "cogent",     baseOpacity: 0.48, fontSize: "0.82rem" },
  { word: "liminal",    baseOpacity: 0.3,  fontSize: "0.75rem" },
  { word: "reverie",    baseOpacity: 0.32, fontSize: "0.77rem" },
  { word: "querulous",  baseOpacity: 0.28, fontSize: "0.73rem" },
  { word: "sanguine",   baseOpacity: 0.3,  fontSize: "0.75rem" },
  { word: "ineffable",  baseOpacity: 0.18, fontSize: "0.68rem" },
  { word: "tenuous",    baseOpacity: 0.16, fontSize: "0.67rem" },
  { word: "obsequious", baseOpacity: 0.16, fontSize: "0.66rem" },
];

const MARGIN_PX = 14;

// Keep-out circle in % units relative to the container
interface ExclusionCircle {
  cx: number; // % of container width
  cy: number; // % of container height
  rx: number; // radius as % of container width
  ry: number; // radius as % of container height (for non-square containers)
  r: number;  // radius in % — we use a conservative max
}

function buildExclusions(container: HTMLDivElement): ExclusionCircle[] {
  const cw = container.offsetWidth;
  const ch = container.offsetHeight;
  if (cw === 0 || ch === 0) return [];

  const els = document.querySelectorAll<HTMLElement>("[data-roam-exclude]");
  const circles: ExclusionCircle[] = [];

  els.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Center relative to container, in px
    const pxCx = (rect.left + rect.width  / 2) - containerRect.left;
    const pxCy = (rect.top  + rect.height / 2) - containerRect.top;

    // Convert center to %
    const cx = (pxCx / cw) * 100;
    const cy = (pxCy / ch) * 100;

    // Radius: half the largest dimension + margin, then converted to %
    // Use the smaller container dimension so % stays conservative
    const radiusPx = Math.max(rect.width, rect.height) / 2 + MARGIN_PX;
    // Express in % of the smaller axis so it stays circular across aspect ratios
    const r = (radiusPx / Math.min(cw, ch)) * 100;

    circles.push({ cx, cy, rx: (radiusPx / cw) * 100, ry: (radiusPx / ch) * 100, r });
  });

  return circles;
}

// Returns true if point (x%, y%) is inside the exclusion circle,
// using elliptical test to handle non-square containers.
function insideExclusion(x: number, y: number, c: ExclusionCircle): boolean {
  if (c.rx === 0 || c.ry === 0) return false;
  const dx = (x - c.cx) / c.rx;
  const dy = (y - c.cy) / c.ry;
  return dx * dx + dy * dy < 1;
}

// Push (x, y) out of the exclusion circle and reflect velocity.
function resolveExclusion(
  s: { x: number; y: number; vx: number; vy: number },
  c: ExclusionCircle,
): void {
  // Normal in % space (use rx/ry to un-stretch)
  const dx = (s.x - c.cx) / c.rx;
  const dy = (s.y - c.cy) / c.ry;
  const len = Math.hypot(dx, dy) || 1e-9;

  // Place word on the edge (in % coords)
  s.x = c.cx + (dx / len) * c.rx;
  s.y = c.cy + (dy / len) * c.ry;

  // Reflect velocity: v = v - 2*(v·n)*n  (n is the normalised raw direction)
  const nx = dx / len;
  const ny = dy / len;
  const dot = s.vx * nx + s.vy * ny;
  s.vx -= 2 * dot * nx;
  s.vy -= 2 * dot * ny;
}

function RoamingWords() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const spans = Array.from(container.querySelectorAll<HTMLSpanElement>("span"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Per-word physics state (in % units)
    const state = ROAMING_WORDS.map((_, i) => {
      const angle = (i / ROAMING_WORDS.length) * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.03;
      return {
        x: 6 + Math.random() * 88,
        y: 6 + Math.random() * 88,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });

    // Exclusion circles — built once, rebuilt on resize
    let exclusions: ExclusionCircle[] = [];

    function rebuildExclusions() {
      exclusions = buildExclusions(container!);
    }

    rebuildExclusions();

    // Nudge any static word that starts inside an exclusion circle
    function nudgeOutOfExclusions(s: { x: number; y: number; vx: number; vy: number }) {
      for (const c of exclusions) {
        if (insideExclusion(s.x, s.y, c)) {
          resolveExclusion(s, c);
        }
      }
    }

    if (reducedMotion) {
      state.forEach((s, i) => {
        nudgeOutOfExclusions(s);
        const el = spans[i];
        if (!el) return;
        el.style.left = `${s.x}%`;
        el.style.top  = `${s.y}%`;
        const d = Math.hypot(s.x - 50, s.y - 50);
        const base = ROAMING_WORDS[i].baseOpacity;
        el.style.opacity = String(d < 30 ? base * Math.max(0.08, d / 30) : base);
      });
      return;
    }

    function tick() {
      state.forEach((s, i) => {
        const el = spans[i];
        if (!el) return;

        s.x += s.vx;
        s.y += s.vy;

        // Edge bounce
        if (s.x < 3)  { s.x = 3;  s.vx = Math.abs(s.vx); }
        if (s.x > 97) { s.x = 97; s.vx = -Math.abs(s.vx); }
        if (s.y < 4)  { s.y = 4;  s.vy = Math.abs(s.vy); }
        if (s.y > 96) { s.y = 96; s.vy = -Math.abs(s.vy); }

        // Exclusion bounce
        for (const c of exclusions) {
          if (insideExclusion(s.x, s.y, c)) {
            resolveExclusion(s, c);
          }
        }

        // Center fade
        const d = Math.hypot(s.x - 50, s.y - 50);
        const base = ROAMING_WORDS[i].baseOpacity;
        const opacity = d < 30 ? base * Math.max(0.08, d / 30) : base;

        el.style.left    = `${s.x}%`;
        el.style.top     = `${s.y}%`;
        el.style.opacity = String(opacity);
      });
      rafRef.current = requestAnimationFrame(tick);
    }

    // Rebuild exclusion circles on resize
    const ro = new ResizeObserver(rebuildExclusions);
    ro.observe(container);
    window.addEventListener("resize", rebuildExclusions);

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      window.removeEventListener("resize", rebuildExclusions);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3, overflow: "hidden" }}
    >
      {ROAMING_WORDS.map(({ word, fontSize }) => (
        <span
          key={word}
          style={{
            position: "absolute",
            transform: "translate(-50%, -50%)",
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            fontSize,
            letterSpacing: "0.13em",
            color: "#D97706",
            textShadow: "0 0 10px rgba(217,119,6,0.55), 0 0 22px rgba(217,119,6,0.25)",
            whiteSpace: "nowrap",
            userSelect: "none",
            willChange: "left, top, opacity",
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

function ChromaticOrbs() {
  // contenitore che taglia: gli aloni escono dai bordi senza allargare la pagina
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
      <div
        aria-hidden
        style={{
          // niente filter: blur — su iPhone è fra gli effetti più costosi in assoluto;
          // lo stesso alone morbido si ottiene con un gradiente più largo e più sfumato
          position: "absolute", top: "calc(5% - 120px)", left: -120,
          width: 640, height: 640, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(76,29,149,0.85) 0%, rgba(76,29,149,0.45) 30%, rgba(76,29,149,0.12) 55%, transparent 72%)",
          pointerEvents: "none", zIndex: 1,
          animation: "none",
          opacity: 0.22,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute", bottom: "calc(5% - 120px)", right: -120,
          width: 590, height: 590, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(157,23,77,0.85) 0%, rgba(157,23,77,0.45) 30%, rgba(157,23,77,0.12) 55%, transparent 72%)",
          pointerEvents: "none", zIndex: 1,
          opacity: 0.18,
        }}
      />
    </div>
  );
}

function BackgroundHalos() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: "70vw", height: "55vh",
          background: "radial-gradient(ellipse at 50% 0%, rgba(217,119,6,0.28) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 2,
          opacity: 0.35,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "70vw", height: "55vh",
          background: "radial-gradient(ellipse at 50% 100%, rgba(217,119,6,0.24) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 2,
          opacity: 0.28,
        }}
      />
    </>
  );
}

function Grain() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 4,
        // niente mixBlendMode: costringeva iPhone a ricomporre tutta la pagina a ogni
        // fotogramma di un'animazione; la grana a opacità più bassa si vede uguale
        opacity: 0.022,
        backgroundRepeat: "repeat",
        backgroundSize: "160px 160px",
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg%20xmlns=\'http://www.w3.org/2000/svg\'%20width=\'160\'%20height=\'160\'%3E%3Cfilter%20id=\'n\'%3E%3CfeTurbulence%20type=\'fractalNoise\'%20baseFrequency=\'0.85\'%20numOctaves=\'3\'%20stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect%20width=\'160\'%20height=\'160\'%20filter=\'url(%23n)\'/%3E%3C/svg%3E")',
      }}
    />
  );
}

export default function AppBackground({ showWords = true }: { showWords?: boolean }) {
  return (
    <>
      <ChromaticOrbs />
      <BackgroundHalos />
      {showWords && <RoamingWords />}
      <Grain />
    </>
  );
}
