type Difficulty = "easy" | "medium" | "hard";

const GRE_LABELS: Record<Difficulty, string> = {
  easy: "Common",
  medium: "Uncommon",
  hard: "Rare",
};

const DEFAULT_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const GRE_DESCRIPTIONS: Record<Difficulty, string> = {
  easy: "Foundational GRE vocabulary",
  medium: "Intermediate GRE vocabulary",
  hard: "Advanced GRE vocabulary",
};

const DEFAULT_DESCRIPTIONS: Record<Difficulty, string> = {
  easy: "Most common words",
  medium: "Mid-frequency",
  hard: "Rare and tricky",
};

export function getDifficultyLabel(difficulty: string, deckSlug: string): string {
  const d = difficulty as Difficulty;
  if (deckSlug === "gre") return GRE_LABELS[d] ?? difficulty;
  return DEFAULT_LABELS[d] ?? (difficulty.charAt(0).toUpperCase() + difficulty.slice(1));
}

export function getDifficultyDescription(difficulty: string, deckSlug: string): string {
  const d = difficulty as Difficulty;
  if (deckSlug === "gre") return GRE_DESCRIPTIONS[d] ?? "";
  return DEFAULT_DESCRIPTIONS[d] ?? "";
}
