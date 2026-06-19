import type { StudySet } from "@/lib/studySets";

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
