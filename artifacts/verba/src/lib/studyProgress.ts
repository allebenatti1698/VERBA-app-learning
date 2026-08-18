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
// string[] puro, e cambiarne la forma richiederebbe una migration dei dati
// già presenti nel localStorage degli utenti.
const LAST_INDEX_KEY = "verba_last_index";

// { [deckSlug]: { [difficulty]: { [setNumber]: wordId } } }
type LastIndexMap = Record<string, Record<string, Record<string, string>>>;

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

/** Salva la parola su cui l'utente è fermo. Sempre l'ID, mai l'indice. */
export function setLastWordId(
  deckSlug: string,
  difficulty: string,
  setNumber: number,
  wordId: string,
): void {
  if (!wordId) return;
  const map = readLastIndex();
  const deck = (map[deckSlug] ??= {});
  const diff = (deck[difficulty] ??= {});
  diff[String(setNumber)] = String(wordId);
  writeLastIndex(map);
}

export function getLastWordId(
  deckSlug: string,
  difficulty: string,
  setNumber: number,
): string | null {
  return readLastIndex()[deckSlug]?.[difficulty]?.[String(setNumber)] ?? null;
}

/**
 * Indice da cui riaprire lo sfoglio.
 * Torna 0 (inizio) in tre casi: niente salvato · la parola non è più nella
 * lista (tipico di My Verba dopo che una stella è stata tolta) · era l'ULTIMA
 * parola del set, dove riprendere significherebbe atterrare in un vicolo cieco.
 * ATTENZIONE: `wordIds` deve essere l'ordine REALE delle parole caricate, non
 * quello di set.wordIds, che può differire.
 */
export function getResumeIndex(
  deckSlug: string,
  difficulty: string,
  setNumber: number,
  wordIds: string[],
): number {
  if (wordIds.length === 0) return 0;
  const saved = getLastWordId(deckSlug, difficulty, setNumber);
  if (!saved) return 0;
  const i = wordIds.indexOf(saved);
  if (i < 0 || i === wordIds.length - 1) return 0;
  return i;
}
