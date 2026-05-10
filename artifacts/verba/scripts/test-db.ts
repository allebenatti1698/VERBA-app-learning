/**
 * Verba — Supabase smoke test
 *
 * Run from the repo root:
 *   pnpm --filter @workspace/verba exec tsx scripts/test-db.ts
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from process.env.
 * (Replit secrets are exposed automatically.)
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function main() {
  console.log("\n=== Verba DB smoke test ===\n");

  // 1. All decks
  console.log("→ Fetching decks…");
  const { data: decks, error: decksErr } = await supabase
    .from("decks")
    .select("slug, name, description, color_family, total_words")
    .order("slug");

  if (decksErr) throw decksErr;
  if (!decks || decks.length === 0) {
    console.error("✗ No decks returned. Did you apply both migrations?");
    process.exit(1);
  }

  console.log(`  ✓ ${decks.length} deck(s):`);
  for (const d of decks) {
    console.log(`    • ${d.slug.padEnd(10)} ${d.name.padEnd(22)} (${d.color_family}, ${d.total_words} words)`);
  }

  // 2. Three GRE medium-difficulty words
  console.log("\n→ Fetching 3 GRE words (difficulty='medium')…");
  const { data: words, error: wordsErr } = await supabase
    .from("words")
    .select("id, word, italian_translation, synonyms, antonyms, distractors, source")
    .eq("deck_slug", "gre")
    .eq("difficulty", "medium")
    .order("frequency_rank")
    .limit(3);

  if (wordsErr) throw wordsErr;
  if (!words || words.length === 0) {
    console.error("✗ No GRE words returned.");
    process.exit(1);
  }

  // 3. Definitions for each word
  for (const w of words) {
    const { data: defs, error: defsErr } = await supabase
      .from("word_definitions")
      .select("part_of_speech, definition, example, display_order")
      .eq("word_id", w.id)
      .order("display_order");

    if (defsErr) throw defsErr;

    console.log(`\n  ── ${w.word.toUpperCase()} (${w.italian_translation}) — source: ${w.source}`);
    console.log(`     synonyms:    ${(w.synonyms ?? []).join(", ")}`);
    console.log(`     antonyms:    ${(w.antonyms ?? []).join(", ")}`);
    console.log(`     distractors: ${(w.distractors ?? []).join(", ")}`);
    console.log(`     definitions (${defs?.length ?? 0}):`);
    for (const d of defs ?? []) {
      console.log(`       [${d.display_order}] (${d.part_of_speech}) ${d.definition}`);
      if (d.example) console.log(`           ex: "${d.example}"`);
    }
  }

  console.log("\n=== ✓ All checks passed ===\n");
}

main().catch((err) => {
  console.error("\n✗ Test failed:", err.message ?? err);
  process.exit(1);
});
