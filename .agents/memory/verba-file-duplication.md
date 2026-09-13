---
name: Verba recurring file duplication
description: Three files in artifacts/verba keep getting fully re-duplicated in the working tree (not via my own writes); recovery procedure and what's confirmed so far.
---

## Symptom
`src/components/FeedbackCard.tsx`, `src/components/quiz/ContextQuestion.tsx`, and
`src/components/quiz/RecognizeQuestion.tsx` periodically end up with their entire
content repeated back-to-back as an exact byte-for-byte block, N times: observed
factors so far are ×2, then later ×256/×512 on the same files. The duplicated
"master" block is not always the latest content — once it was an much older,
differently-themed version of FeedbackCard.tsx (amber theme) that predates the
current lilac/purple redesign, i.e. the duplication source can be a stale
snapshot, not simply "double the current file".

## What's confirmed
- This is not caused by my own write calls in the observed sessions: WriteFile,
  Edit, and shell `python open(...,'w')` truncation were all overwrite/truncate
  semantics, never append, and file counts were checked before/after each of my
  writes without correlation to a duplication event appearing mid-turn.
- Git history (`git log` in the monorepo root) had a recent commit with the
  correct, non-duplicated, latest-known-good content for these exact files
  each time — `git checkout HEAD -- <file>` is currently the reliable recovery
  path once the corrupted state is detected.
- Root cause is NOT identified. It has not been reproduced deliberately, only
  observed between conversation turns.

## Recovery procedure
1. Detect: `wc -l` on the three files; suspicious if far larger than expected,
   or `grep -c "export default"` / a top-of-file string returns >1.
2. Find the repeat period: `awk 'NR==1{f=$0} $0==f{print NR}' <file> | head`
   — the gaps between matches reveal the period of the repeated block.
3. Diff two consecutive blocks to confirm they're identical, then compare the
   block's content against `git show HEAD:<path>` to determine which one is
   actually current/correct before deciding how to truncate or restore.
4. Prefer `git checkout HEAD -- <file>` over blind truncation to line N when a
   git history exists and HEAD is verified to have the correct content —
   truncation preserves whatever is "first", which is not always right if the
   corruption source is a stale snapshot rather than a simple self-duplicate.
5. Re-run `npx tsc --noEmit` after recovery, before reapplying any pending
   edits, since pending "TROVA" edits from an in-flight instruction may target
   content that never made it into the git-committed state.

## Why this matters
Because the duplication source can be a stale git-committed version (not the
in-progress working-tree edits), naive truncation-based fixes can silently
regress recently-made, uncommitted changes. Always diff against `git show HEAD`
before deciding a recovery strategy, and re-verify which specific features
(e.g. specific function/import names) are actually present after recovery.
