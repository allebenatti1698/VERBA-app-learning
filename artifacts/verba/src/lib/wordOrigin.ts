/**
 * Da dove parte la parola.
 *
 * La scheda si apre ATTORNO alla parola appena risolta, e la parola stessa
 * viaggia fino a diventare il titolo. Ma la parola di partenza vive nel
 * componente-domanda e quella d'arrivo nella scheda: sono due sottoalberi
 * diversi, e passare un rettangolo attraverso l'orchestratore vorrebbe dire
 * cambiare la firma di onSelect per tutti i formati.
 *
 * Questo modulo è il canale: il formato deposita il rettangolo un istante
 * prima di rispondere, la scheda lo legge quando si monta. Un solo valore
 * alla volta, perché una sola domanda è attiva alla volta.
 */
export type WordOrigin = {
  /** rettangolo in coordinate viewport */
  x: number; y: number; w: number; h: number;
  /** corpo del carattere alla partenza, in px */
  fontSize: number;
  /** peso tipografico alla partenza */
  fontWeight: number;
  /** true se la risposta era giusta: decide se si parte dal verde */
  correct: boolean;
};

let current: WordOrigin | null = null;

export function setWordOrigin(o: WordOrigin | null) { current = o; }
export function getWordOrigin(): WordOrigin | null { return current; }

/** Misura un elemento e lo deposita come origine. */
export function publishWordOrigin(el: HTMLElement | null, correct: boolean) {
  if (!el) { setWordOrigin(null); return; }
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) { setWordOrigin(null); return; }
  const cs = getComputedStyle(el);
  setWordOrigin({
    x: r.left, y: r.top, w: r.width, h: r.height,
    fontSize: parseFloat(cs.fontSize) || 17,
    fontWeight: Number(cs.fontWeight) || 500,
    correct,
  });
}

/* ── la geometria della scheda, in un posto solo ──────────────────────────
 * La parola-eroe del gradino 1 e il titolo della scheda devono avere la
 * STESSA dimensione e la STESSA quota: è così che lì la parola non si muove.
 * Se questi numeri vivessero in due file diversi, prima o poi divergerebbero.
 */

/** Dove comincia la scheda, in frazione dell'altezza della finestra. */
export const CARD_TOP_FRAC = 0.055;
/** Distanza fra la cima della scheda e il centro del titolo: padding + badge. */
export const TITLE_OFFSET = 26 + 17 + 10 + 26;
/** Spazio riservato in fondo alla barra del Next. */
export const BOTTOM_BAR = 104;
/** Altezza minima della scheda. */
export const CARD_MIN = 190;

/** La quota del titolo, cioè dove la parola-eroe deve stare. */
export function titleMidY(): number {
  if (typeof window === "undefined") return 120;
  return Math.max(20, window.innerHeight * CARD_TOP_FRAC) + TITLE_OFFSET;
}

/**
 * Il corpo del titolo. Scende sulle parole lunghe, perché a 44px
 * `circumlocution` non entrerebbe nella larghezza della scheda.
 */
export function titleFontSize(word: string): number {
  const n = word.length;
  if (n <= 9) return 44;
  if (n <= 12) return 38;
  if (n <= 15) return 32;
  return 27;
}
