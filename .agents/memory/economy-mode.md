---
name: Economy Mode edits
description: User's recurring constraints for numbered Verba edit prompts.
---

For the user's Economy Mode edit prompts: apply only targeted old_string → new_string changes, never replace an existing file wholesale. Each find must match exactly once. Skip and report unmatched or non-unique edits independently while continuing the others. Do not modify attached_assets. Do not start the dev server or test live; the user tests manually. Run the requested typecheck and report each requested verification item.

**Why:** The user repeats these constraints in the attached Verba prompts to limit scope and cost.

**How to apply:** Follow each new prompt's exact edit boundaries, fallback rules, protected files, and verification format; do not add unrelated cleanup.
