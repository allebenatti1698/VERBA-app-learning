// src/lib/cardMorph.ts
// "La card che diventa la pagina" — il canale fra la card (in una scheda) e la
// pagina che ne nasce (Chain, setup di Practice, sessione di Review).
//
//  · La scheda chiama openFromCard(kind, cardEl) e naviga SUBITO.
//  · La pagina, avvolta in <CardMorph> (App.tsx), al primo disegno prende la
//    card con takeOrigin() e si apre da lei: il contenuto cresce dalla card.
//  · Per tornare, la pagina chiama closeToCard(): <CardMorph> rimpicciolisce la
//    pagina dentro la card e solo alla fine si naviga indietro.
//  · La scheda, ricostruita al ritorno, chiede returningFrom() per non rifare
//    le proprie animazioni d'ingresso (la catena che si disegna, ecc.).
import { skipNextSlide } from "@/lib/pageTransition";

export type CardKind = "chain" | "practice" | "review";

let origin: { kind: CardKind; el: HTMLElement; at: number } | null = null;
let closer: ((done: () => void) => void) | null = null;
let returning: { kind: CardKind; at: number } | null = null;

/** Dalla scheda: la card su cui si è toccato. Poi si naviga subito. */
export function openFromCard(kind: CardKind, el: HTMLElement): void {
  origin = { kind, el, at: Date.now() };
  skipNextSlide();                       // la pagina non scorre: nasce dalla card
}

/** La pagina che sta nascendo viene da una card? (senza consumarla) */
export function peekOrigin(): CardKind | null {
  return origin && Date.now() - origin.at <= 1500 ? origin.kind : null;
}

/** Dalla pagina appena montata: la card da cui nasce (una volta sola). */
export function takeOrigin(): { kind: CardKind; el: HTMLElement } | null {
  const o = origin;
  origin = null;
  if (!o || Date.now() - o.at > 1500 || !o.el.isConnected) return null;
  return { kind: o.kind, el: o.el };
}

/** <CardMorph> registra qui come si richiude la pagina corrente. */
export function registerCloser(fn: ((done: () => void) => void) | null): void {
  closer = fn;
}

/**
 * Dalla pagina: torna richiudendosi nella card da cui era nata, poi esegue `go`
 * (la navigazione). Se la pagina non era nata da una card, esegue `go` subito.
 */
export function closeToCard(kind: CardKind, go: () => void): void {
  const fn = closer;
  if (!fn) { go(); return; }
  closer = null;
  fn(() => {
    returning = { kind, at: Date.now() };
    skipNextSlide();                     // la pagina sparisce sotto la card, senza scorrere
    go();
  });
}

/** Dalla scheda ricostruita: si sta tornando dentro questa card? */
export function returningFrom(): CardKind | null {
  if (!returning || Date.now() - returning.at > 1200) return null;
  return returning.kind;
}

/** Evento: le schede devono tornare visibili sotto la pagina che si richiude. */
export const SHOW_TABS_EVENT = "verba:show-tabs";
