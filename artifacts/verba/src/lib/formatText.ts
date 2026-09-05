import { createElement, type ReactNode } from "react";

export function lowercaseFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Desinenze inglesi reali. L'elenco è chiuso di proposito: contare lettere
 *  ("al massimo tre") rompe su shamming — la m raddoppiata più -ing fa quattro. */
const INFLECTIONS =
  "(?:s|es|ed|d|ing|ings|ly|er|ers|est|ness|ment|ments|ion|ions|al|ally|able)?";

/** Le forme che la radice può assumere prima della desinenza. */
function stemVariants(word: string): string[] {
  const w = word.toLowerCase();
  const out = [escapeRegExp(w)];
  const last = w.slice(-1);
  // raddoppio della consonante: sham → shamm(ing), run → runn(ing)
  if (/[bdgklmnprt]$/.test(w)) out.push(escapeRegExp(w + last));
  // caduta della -e: prime → prim(ing), cite → cit(ed)
  if (w.endsWith("e")) out.push(escapeRegExp(w.slice(0, -1)));
  // y → i: happy → happi(ly), weary → weari(er)
  if (w.endsWith("y")) out.push(escapeRegExp(w.slice(0, -1)) + "i");
  return out;
}

/**
 * Evidenzia la parola-chiave dentro un testo.
 * Stile volutamente DISCRETO: cambia solo la tinta in lavanda, mantiene peso
 * e corsivo del contesto. Niente grassetto, che spezzerebbe il corsivo.
 *
 * Il match copre la parola flessa INTERA. Non si conta quante lettere può
 * avere la coda — si riconoscono le desinenze, e il confine di parola in fondo
 * impedisce che "arch" peschi "architecture".
 */
export function highlightWord(text: string, word: string): ReactNode {
  if (!text || !word) return text;
  const alts = stemVariants(word).join("|");
  const body = `(?:${alts})${INFLECTIONS}`;
  const splitRe = new RegExp(`(\\b${body}\\b)`, "gi");
  const matchRe = new RegExp(`^${body}$`, "i");
  return text.split(splitRe).map((p, i) =>
    matchRe.test(p)
      ? createElement("span", { key: i, style: { color: "#C7B8E8" } }, p)
      : createElement("span", { key: i }, p),
  );
}
