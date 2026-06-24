// src/lib/progressStats.ts
// Aggrega wordStats (SRS) + studyProgress (coverage) in uno snapshot per la UI Progress.
// Tutto scoped al deck: i conteggi mastery/practiced/due considerano solo le parole del deck.

import { getStudySets } from "@/lib/studySets";
import { getSeenWordIds } from "@/lib/studyProgress";
import { getAllWordStats, getDueWordIds } from "@/lib/wordStats";
import { getDifficultyLabel } from "@/lib/difficultyLabel";

const TIER_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export interface BandCoverage {
  difficulty: string; // "easy" | "medium" | "hard"
  label: string;      // "Common" | "Uncommon" | "Rare"
  seen: number;
  total: number;
}

export interface TroubleWord {
  id: string;
  wrong: number; // totalSeen - totalCorrect
  seen: number;
}

export interface ProgressSnapshot {
  practiced: number;  // parole del deck con almeno una risposta registrata
  mastered: number;
  reviewing: number;
  learning: number;
  newCount: number;   // totalDeck - practiced
  totalDeck: number;
  dueCount: number;
  bands: BandCoverage[];
  trouble: TroubleWord[]; // top N per numero di errori
}

export async function computeProgress(deckSlug: string, troubleLimit = 5): Promise<ProgressSnapshot> {
  // 1. Set per fascia (async, cached) → totali per fascia + tutti gli ID del deck
  const setsByTier = await Promise.all(TIER_DIFFICULTIES.map((d) => getStudySets(deckSlug, d)));

  const bands: BandCoverage[] = [];
  const deckIds = new Set<string>();

  TIER_DIFFICULTIES.forEach((difficulty, i) => {
    const sets = setsByTier[i];
    let total = 0;
    let seen = 0;
    for (const s of sets) {
      total += s.wordCount;
      s.wordIds.forEach((id) => deckIds.add(id));
      const setIdSet = new Set(s.wordIds);
      seen += getSeenWordIds(deckSlug, difficulty, s.setNumber).filter((id) => setIdSet.has(id)).length;
    }
    bands.push({ difficulty, label: getDifficultyLabel(difficulty, deckSlug), seen, total });
  });

  const totalDeck = deckIds.size;

  // 2. wordStats scoped al deck (intersezione con deckIds)
  const all = getAllWordStats();
  let practiced = 0, mastered = 0, reviewing = 0, learning = 0;
  const trouble: TroubleWord[] = [];
  for (const id of Object.keys(all)) {
    if (!deckIds.has(id)) continue;
    const s = all[id];
    practiced += 1;
    if (s.status === "mastered") mastered += 1;
    else if (s.status === "reviewing") reviewing += 1;
    else learning += 1;
    const wrong = s.totalSeen - s.totalCorrect;
    if (wrong > 0) trouble.push({ id, wrong, seen: s.totalSeen });
  }
  const newCount = Math.max(0, totalDeck - practiced);

  // 3. Due scoped al deck
  const dueCount = getDueWordIds().filter((id) => deckIds.has(id)).length;

  // 4. Trouble: più errori prima (tiebreak: più visioni)
  trouble.sort((a, b) => (b.wrong - a.wrong) || (b.seen - a.seen));

  return {
    practiced, mastered, reviewing, learning, newCount, totalDeck, dueCount, bands,
    trouble: trouble.slice(0, troubleLimit),
  };
}
