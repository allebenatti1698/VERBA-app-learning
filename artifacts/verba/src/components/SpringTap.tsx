// src/components/SpringTap.tsx
// Indole unica del tocco in tutta l'app: "Soft" — preme, cede, torna pulito.
// L'overshoot marcato NON sta qui: è riservato agli eventi rari (parola
// masterizzata, set completato). Se lo usa anche il gesto ordinario — il Next
// del quiz si preme ~25 volte a sessione — smette di essere un premio e
// diventa un tic, e quando arriva il momento speciale non resta niente in
// riserva.
import type { Transition } from "framer-motion";

export const TAP_SPRING: Transition = { type: "spring", stiffness: 240, damping: 24, mass: 1 };

// Più grande è l'oggetto, MENO deve muoversi: l'occhio misura i pixel di
// spostamento del bordo, non la percentuale. Il 10% su una card da 340px sono
// 34px di scivolamento, ed è per quello che sembra gomma.
export const TAP = {
  button: 0.94,
  icon: 0.88,
  chip: 0.93,
  card: 0.98,
  row: 0.985,
} as const;

export type TapKind = keyof typeof TAP;

/** Da usare come whileTap={tapScale()} oppure tapScale("icon"). */
export function tapScale(kind: TapKind = "button") {
  return { scale: TAP[kind] };
}
