// src/lib/troubleDismiss.ts
// Scarto PROVVISORIO delle trouble words: l'utente può togliere una parola dalla
// lista (swipe). Lo scarto viene REVOCATO se la parola viene ri-sbagliata.

const KEY = "verba_trouble_dismissed";

function read(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]); }
  catch { return new Set(); }
}
function write(set: Set<string>): void {
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* storage non disponibile */ }
}

export function isTroubleDismissed(id: string): boolean {
  return read().has(id);
}
export function dismissTrouble(id: string): void {
  const s = read();
  if (!s.has(id)) { s.add(id); write(s); }
}
export function undismissTrouble(id: string): void {
  const s = read();
  if (s.has(id)) { s.delete(id); write(s); }
}
