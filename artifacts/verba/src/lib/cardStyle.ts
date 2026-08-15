// src/lib/cardStyle.ts
// Materiale condiviso delle card. Principio: la luce viene dall'alto.
// Filo chiaro sullo spigolo superiore, riempimento in gradiente verticale,
// ombra ampia che stacca la card dal fondo nero.
// L'accento (identità di deck o colore semantico) entra come ALONE
// nell'angolo alto a sinistra — mai come bordo su tutti e quattro i lati.

import type { CSSProperties } from "react";

export const ACCENT = {
  gre: "167,139,250",
  foundations: "125,211,252",
  amber: "245,158,11",
  green: "52,211,153",
  red: "239,68,68",
} as const;

export interface CardAccent {
  /** Terna "r,g,b" — usa le costanti ACCENT */
  rgb: string;
  /** 0..1+, scala l'intensità della luce. Default 1. */
  intensity?: number;
}

/**
 * Stile base della card. Passa un accento per illuminarla nel colore del deck
 * o in un colore semantico. Il raggio è 16 di default, 12 per superfici piccole.
 */
export function cardStyle(accent?: CardAccent | null, radius = 16): CSSProperties {
  const base: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    borderRadius: radius,
    border: "1px solid rgba(255,255,255,0.055)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018))",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), 0 12px 26px rgba(0,0,0,0.5)",
  };
  if (!accent) return base;
  const k = accent.intensity ?? 1;
  return {
    ...base,
    background:
      `radial-gradient(210px 150px at 8% -34%, rgba(${accent.rgb},${(0.15 * k).toFixed(3)}), transparent 70%), ` +
      `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018))`,
    boxShadow:
      `inset 0 1px 0 rgba(${accent.rgb},${(0.32 * k).toFixed(3)}), 0 12px 26px rgba(0,0,0,0.5)`,
  };
}
