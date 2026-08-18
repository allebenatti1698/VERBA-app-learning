import React from "react";

export function lowercaseFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/**
 * Wraps every occurrence of `word` inside `sentence` in an amber <span>.
 * Case-insensitive; preserves original casing of the matched text.
 */
export function highlightWord(sentence: string, word: string): React.ReactNode {
  if (!sentence || !word) return sentence;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = sentence.split(new RegExp(`(${escaped})`, "gi"));
  if (parts.length === 1) return sentence;
  const lowerWord = word.toLowerCase();
  return parts.map((part, i) =>
    part.toLowerCase() === lowerWord
      ? React.createElement("span", {
          key: i,
          style: { color: "#F59E0B", fontStyle: "normal", fontWeight: 500 },
        }, part)
      : part
  );
}
