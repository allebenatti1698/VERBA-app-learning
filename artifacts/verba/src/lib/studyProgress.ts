import type { StudySet } from "@/lib/studySets";
import { recordStudyToday, recordWordsToday } from "@/lib/studyActivity";

const PROGRESS_KEY = "verba_study_progress";
const LAST_STUDY_KEY = "verba_last_study";

// { [deckSlug]: { [difficulty]: { [setNumber]: string[] (id parole viste) } } }
type ProgressMap = Record<string, Record<string, Record<string, string[]>>>;

function readProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeProgress(map: ProgressMap): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    /* storage non disponibile */
  }
}

export function markWordsSeen(
  deckSlug: string,
  difficulty: string,
  setNumber: number,
  wordIds: string[],
): void {
  if (wordIds.length === 0) return;
  recordStudyToday();
  recordWordsToday(wordIds.length);
  const map = readProgress();
  const deck = (map[deckSlug] ??= {});
  const diff = (deck[difficulty] ??= {});
  const existing = new Set(diff[String(setNumber)] ?? []);
  wordIds.forEach((id) => existing.add(id));
  diff[String(setNumber)] = [...existing];
  writeProgress(map);
}

export function getSeenWordIds(deckSlug: string, difficulty: string, setNumber: number): string[] {
  const map = readProgress();
  return map[deckSlug]?.[difficulty]?.[String(setNumber)] ?? [];
}

export function getSeenCount(deckSlug: string, difficulty: string, setNumber: number): number {
  return getSeenWordIds(deckSlug, difficulty, setNumber).length;
}

export function isSetCompleted(
  deckSlug: string,
  difficulty: string,
  setNumber: number,
  setSize: number,
): boolean {
  if (setSize <= 0) return false;
  return getSeenCount(deckSlug, difficulty, setNumber) >= setSize;
}

// Set completati (tutte le parole viste), date le dimensioni reali dei set.
export function getCompletedSetNumbers(
  deckSlug: string,
  difficulty: string,
  sets: StudySet[],
): number[] {
  return sets
    .filter((s) => isSetCompleted(deckSlug, difficulty, s.setNumber, s.wordCount))
    .map((s) => s.setNumber);
}

// ── Ultimo set studiato (per la card "Continue") ──────────────────────────
export type LastStudy = {
  deck: string;
  difficulty: string;
  setNumber: number;
  updatedAt: string; // ISO
};

export function setLastStudied(deckSlug: string, difficulty: string, setNumber: number): void {
  try {
    const payload: LastStudy = {
      deck: deckSlug,
      difficulty,
      setNumber,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LAST_STUDY_KEY, JSON.stringify(payload));
  } catch {
    /* storage non disponibile */
  }
}

export function getLastStudied(): LastStudy | null {
  try {
    const raw = localStorage.getItem(LAST_STUDY_KEY);
    return raw ? (JSON.parse(raw) as LastStudy) : null;
  } catch {
    return null;
  }
}

// ── Posizione esatta dentro un set (resume granulare) ─────────────────────
// Chiave separata da verba_study_progress: la foglia di quella mappa è un
// string[] puro e cambiarne la forma richiederebbe una migration.
// Si salvano DUE cose: l'ID della parola e il suo indice. L'ID vince quando
// esiste ancora; l'indice è la rete di sicurezza per My Verba, dove togliere
// una stella fa scalare la lista — e l'indice vecchio punta allora alla
// parola che veniva subito dopo, che è esattamente dove si vuole ripartire.
const LAST_INDEX_KEY = "verba_last_index";

type SavedPos = { id: string; i: number };
type LastIndexMap = Record<string, Record<string, Record<string, SavedPos>>>;

function readLastIndex(): LastIndexMap {
  try {
    const raw = localStorage.getItem(LAST_INDEX_KEY);
    return raw ? (JSON.parse(raw) as LastIndexMap) : {};
  } catch {
    return {};
  }
}

function writeLastIndex(map: LastIndexMap): void {
  try {
    localStorage.setItem(LAST_INDEX_KEY, JSON.stringify(map));
  } catch {
    /* storage non disponibile */
  }
}

/** Salva dove l'utente è fermo: ID della parola + indice nella lista. */
export function setLastPosition(
  deckSlug: string,
  difficulty: string,
  setNumber: number,
  wordId: string,
  index: number,
): void {
  if (!wordId) return;
  const map = readLastIndex();
  const deck = (map[deckSlug] ??= {});
  const diff = (deck[difficulty] ??= {});
  diff[String(setNumber)] = { id: String(wordId), i: index };
  writeLastIndex(map);
}

/** Legge la posizione. Accetta anche il vecchio formato (stringa nuda). */
export function getLastPosition(
  deckSlug: string,
  difficulty: string,
  setNumber: number,
): SavedPos | null {
  const v = readLastIndex()[deckSlug]?.[difficulty]?.[String(setNumber)];
  if (!v) return null;
  if (typeof v === "string") return { id: v, i: -1 };
  return v;
}

/**
 * Indice da cui riaprire lo sfoglio.
 *
 * `keepPosition = true` (My Verba): sempre e solo dove eri. Una collezione non
 * ha un completamento da raggiungere, quindi il concetto di "buco" non esiste
 * e saltare a una parola non letta sembrerebbe casuale.
 *
 * `keepPosition = false` (set GRE): dove eri, ma non oltre il primo buco.
 * Serve perché la vista a lista permette di saltare in fondo: chi ha visto
 * 1-2-3-4 e poi 24-25 non deve rientrare in coda. Se il set è completo si
 * resta dove si era: rimandare alla prima chi ha finito è una punizione.
 *
 * `wordIds` deve essere l'ordine REALE delle parole caricate.
 */
export function getResumeIndex(
  deckSlug: string,
  difficulty: string,
  setNumber: number,
  wordIds: string[],
  keepPosition = false,
): number {
  if (wordIds.length === 0) return 0;

  const pos = getLastPosition(deckSlug, difficulty, setNumber);
  let last = -1;
  if (pos) {
    const byId = pos.id ? wordIds.indexOf(pos.id) : -1;
    if (byId >= 0) last = byId;
    else if (pos.i >= 0) last = Math.min(pos.i, wordIds.length - 1);
  }

  if (keepPosition) return last >= 0 ? last : 0;

  // Le viste vanno ristrette a quelle DAVVERO presenti nella lista caricata.
  const present = new Set(wordIds);
  const seen = new Set(
    getSeenWordIds(deckSlug, difficulty, setNumber).filter((id) => present.has(id)),
  );
  const firstUnseen = wordIds.findIndex((id) => !seen.has(id));

  if (firstUnseen === -1) return last >= 0 ? last : wordIds.length - 1;
  if (last < 0) return firstUnseen;
  return Math.min(last, firstUnseen);
}
