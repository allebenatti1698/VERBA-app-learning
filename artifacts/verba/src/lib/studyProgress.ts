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
 * Indice da cui riaprire lo sfoglio di un set.
 *
 * Regola: torna DOVE ERI, ma non oltre il primo buco. Serve perché la vista
 * a lista permette di saltare in fondo: chi ha visto 1-2-3-4 e poi 24-25 non
 * deve rientrare in coda, dove non c'è più niente da fare.
 *
 * - set completo → dove eri (di solito l'ultima parola). NON si riparte da
 *   capo: se hai finito il set, rimandarti alla prima è una punizione.
 * - c'è ancora del nuovo DOPO dove eri → dove eri, non una dopo. La parola su
 *   cui ti eri fermato viene contata come vista appena compare sullo schermo,
 *   anche se sei uscito subito: riportarti lì ti fa leggere davvero quella che
 *   avevi solo intravisto.
 * - il primo buco è PRIMA di dove eri → il primo buco, cioè il primo punto in
 *   cui c'è materiale nuovo.
 *
 * `wordIds` deve essere l'ordine REALE delle parole caricate, non quello di
 * set.wordIds.
 */
export function getResumeIndex(
  deckSlug: string,
  difficulty: string,
  setNumber: number,
  wordIds: string[],
): number {
  if (wordIds.length === 0) return 0;

  // Le viste vanno ristrette a quelle DAVVERO presenti nella lista caricata:
  // My Verba cambia composizione quando si toglie una stella, e lo storico
  // conserva ID che non ci sono più.
  const present = new Set(wordIds);
  const seen = new Set(
    getSeenWordIds(deckSlug, difficulty, setNumber).filter((id) => present.has(id)),
  );

  const firstUnseen = wordIds.findIndex((id) => !seen.has(id));

  const saved = getLastWordId(deckSlug, difficulty, setNumber);
  const last = saved ? wordIds.indexOf(saved) : -1;

  // Set completo: resta dove eri. Se la posizione è illeggibile, l'ultima.
  if (firstUnseen === -1) return last >= 0 ? last : wordIds.length - 1;

  // Nessuna posizione salvata (o parola sparita): vai al primo buco.
  if (last < 0) return firstUnseen;

  return Math.min(last, firstUnseen);
}
