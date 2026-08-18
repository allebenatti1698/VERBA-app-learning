import { createElement, type ReactNode } from "react";

export function lowercaseFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Evidenzia la parola-chiave dentro un testo.
 * Stile volutamente DISCRETO: cambia solo la tinta in lavanda, mantiene peso
 * e corsivo del contesto. Niente grassetto, che spezzerebbe il corsivo.
 * Il match copre l'intera parola flessa: "cherish" evidenzia "cherished",
 * non "cherish" lasciando fuori "ed".
 */
export function highlightWord(text: string, word: string): ReactNode {
  if (!text || !word) return text;
  const stem = escapeRegExp(word);
  // Max 3 lettere in coda: prende -s, -ed, -ing, -ly, -es, -er (desinenze reali)
  // ma NON parole diverse con la stessa radice (arch → architecture).
  const splitRe = new RegExp(`(\\b${stem}\\w{0,3})`, "gi");
  const matchRe = new RegExp(`^${stem}\\w{0,3}$`, "i");
  return text.split(splitRe).map((p, i) =>
    matchRe.test(p)
      ? createElement("span", { key: i, style: { color: "#C7B8E8" } }, p)
      : createElement("span", { key: i }, p),
  );
}
