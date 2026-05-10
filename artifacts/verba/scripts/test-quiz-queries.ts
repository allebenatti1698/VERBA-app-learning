/**
 * Verba — quizQueries smoke test
 *
 * Run from the repo root:
 *   pnpm --filter @workspace/verba exec tsx scripts/test-quiz-queries.ts
 */

import { fetchQuizWords } from "../src/lib/quizQueries";

async function main() {
  console.log("\n=== fetchQuizWords('gre', 'medium', 5) ===\n");

  const words = await fetchQuizWords("gre", "medium", 5);

  if (words.length === 0) {
    console.error("✗ No words returned.");
    process.exit(1);
  }

  console.log(`✓ Got ${words.length} word(s):\n`);
  for (const w of words) {
    console.log(`  • id:                  ${w.id}`);
    console.log(`    word:                ${w.word}`);
    console.log(`    correctDefinition:   ${w.correctDefinition}`);
    console.log(`    first distractor:    ${w.distractors[0] ?? "(none)"}`);
    console.log(`    allDefinitions:      ${w.allDefinitions.length}`);
    console.log("");
  }

  console.log("=== ✓ All checks passed ===\n");
}

main().catch((err) => {
  console.error("\n✗ Test failed:", err.message ?? err);
  process.exit(1);
});
