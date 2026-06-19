import { supabase } from "@/lib/supabase";

export const STUDY_SET_TARGET = 25;

export type StudySet = {
  setNumber: number; // 1-based
  wordIds: string[];
  wordCount: number;
};

type RankRow = { id: string; frequency_rank: number | null };

const cache = new Map<string, StudySet[]>();

function cacheKey(deckSlug: string, difficulty: string) {
  return `${deckSlug}::${difficulty}`;
}

// Divide una fascia di difficoltà in set di ~STUDY_SET_TARGET parole,
// ordinate per frequency_rank (più comuni prima), distribuite in modo
// uniforme (dimensioni che differiscono al massimo di 1, nessun set orfano).
export async function getStudySets(deckSlug: string, difficulty: string): Promise<StudySet[]> {
  const key = cacheKey(deckSlug, difficulty);
  const cached = cache.get(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("words")
    .select("id, frequency_rank")
    .eq("deck_slug", deckSlug)
    .eq("difficulty", difficulty);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as RankRow[];

  // Ordine deterministico: frequency_rank asc (null in fondo), tiebreak per id.
  rows.sort((a, b) => {
    const ra = a.frequency_rank ?? Number.POSITIVE_INFINITY;
    const rb = b.frequency_rank ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const ids = rows.map((r) => r.id);
  const sets = chunkEvenly(ids, STUDY_SET_TARGET);
  cache.set(key, sets);
  return sets;
}

// Numero di set = round(N / target); dimensioni che differiscono al massimo di 1.
function chunkEvenly(ids: string[], target: number): StudySet[] {
  const n = ids.length;
  if (n === 0) return [];
  const numSets = Math.max(1, Math.round(n / target));
  const base = Math.floor(n / numSets);
  const remainder = n % numSets; // i primi `remainder` set hanno una parola in più
  const sets: StudySet[] = [];
  let cursor = 0;
  for (let i = 0; i < numSets; i++) {
    const size = base + (i < remainder ? 1 : 0);
    const wordIds = ids.slice(cursor, cursor + size);
    cursor += size;
    sets.push({ setNumber: i + 1, wordIds, wordCount: wordIds.length });
  }
  return sets;
}

export function getWordIdsForSets(sets: StudySet[], selectedSetNumbers: number[]): string[] {
  const selected = new Set(selectedSetNumbers);
  return sets.filter((s) => selected.has(s.setNumber)).flatMap((s) => s.wordIds);
}

export function totalWordsInSets(sets: StudySet[], selectedSetNumbers: number[]): number {
  return getWordIdsForSets(sets, selectedSetNumbers).length;
}

export function clearStudySetsCache(): void {
  cache.clear();
}
