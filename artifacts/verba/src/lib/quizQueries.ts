import { supabase } from "@/lib/supabase";

export type QuizWordDefinition = {
  part_of_speech: string;
  definition: string;
  example: string;
  display_order: number;
};

export type QuizWord = {
  id: string;
  word: string;
  phonetic?: string;
  correctDefinition: string;
  distractors: string[];
  italianTranslation: string;
  italianDefinition?: string;
  exampleSentence: string;
  synonyms: string[];
  antonyms: string[];
  etymology?: string;
  allDefinitions: QuizWordDefinition[];
};

type DbWordRow = {
  id: string;
  word: string;
  italian_translation: string | null;
  italian_definition: string | null;
  etymology: string | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  distractors: string[] | null;
  word_definitions:
    | {
        part_of_speech: string | null;
        definition: string | null;
        example: string | null;
        display_order: number | null;
      }[]
    | null;
};

const CANDIDATE_POOL_SIZE = 200;

export async function getReverseDistractors(
  correctWord: string,
  deckSlug: string,
  difficulty: string | null,
  count = 3,
): Promise<string[]> {
  // Try with difficulty filter first
  let query = supabase
    .from("words")
    .select("word")
    .eq("deck_slug", deckSlug)
    .neq("word", correctWord)
    .limit(50);

  if (difficulty) {
    query = query.eq("difficulty", difficulty);
  }

  const { data } = await query;
  const words = shuffleArray((data ?? []).map((r: { word: string }) => r.word));

  if (words.length >= count) return words.slice(0, count);

  // Fallback: remove difficulty filter
  const { data: fallback } = await supabase
    .from("words")
    .select("word")
    .eq("deck_slug", deckSlug)
    .neq("word", correctWord)
    .limit(50);

  return shuffleArray((fallback ?? []).map((r: { word: string }) => r.word)).slice(0, count);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function fetchWordsByIds(ids: string[]): Promise<QuizWord[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("words")
    .select("id, word, italian_translation, italian_definition, etymology, synonyms, antonyms, distractors, word_definitions(part_of_speech, definition, example, display_order)")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as DbWordRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is DbWordRow => Boolean(row))
    .map<QuizWord>((row) => {
      const defs: QuizWordDefinition[] = (row.word_definitions ?? [])
        .map((d) => ({
          part_of_speech: d.part_of_speech ?? "",
          definition: d.definition ?? "",
          example: d.example ?? "",
          display_order: d.display_order ?? 0,
        }))
        .sort((a, b) => a.display_order - b.display_order);
      const primary = defs[0];
      return {
        id: row.id,
        word: row.word,
        correctDefinition: primary?.definition ?? "",
        distractors: row.distractors ?? [],
        italianTranslation: row.italian_translation ?? "",
        italianDefinition: row.italian_definition ?? undefined,
        exampleSentence: primary?.example ?? "",
        synonyms: row.synonyms ?? [],
        antonyms: row.antonyms ?? [],
        allDefinitions: defs,
        phonetic: undefined,
        etymology: row.etymology ?? undefined,
      };
    });
}

export async function fetchQuizWords(
  deckSlug: string,
  difficulty: string | null,
  count: number,
): Promise<QuizWord[]> {
  let query = supabase
    .from("words")
    .select("id, word, italian_translation, italian_definition, etymology, synonyms, antonyms, distractors, word_definitions(part_of_speech, definition, example, display_order)")
    .eq("deck_slug", deckSlug)
    .limit(CANDIDATE_POOL_SIZE);

  if (difficulty) {
    query = query.eq("difficulty", difficulty);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      `No words found for deck "${deckSlug}"${difficulty ? ` and difficulty "${difficulty}"` : ""}.`,
    );
  }

  const rows = data as DbWordRow[];
  const sampled = shuffleArray(rows).slice(0, count);

  return sampled.map<QuizWord>((row) => {
    const defs: QuizWordDefinition[] = (row.word_definitions ?? [])
      .map((d) => ({
        part_of_speech: d.part_of_speech ?? "",
        definition: d.definition ?? "",
        example: d.example ?? "",
        display_order: d.display_order ?? 0,
      }))
      .sort((a, b) => a.display_order - b.display_order);

    const primary = defs[0];
    const correctDefinition = primary?.definition ?? "";
    const exampleSentence = primary?.example ?? "";
    const italianTranslation = row.italian_translation ?? "";

    return {
      id: row.id,
      word: row.word,
      correctDefinition,
      distractors: row.distractors ?? [],
      italianTranslation,
      italianDefinition: row.italian_definition ?? undefined,
      exampleSentence,
      synonyms: row.synonyms ?? [],
      antonyms: row.antonyms ?? [],
      allDefinitions: defs,
      phonetic: undefined,
      etymology: row.etymology ?? undefined,
    };
  });
}
