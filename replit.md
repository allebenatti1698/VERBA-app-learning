# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Verba — Vocabulary App (`artifacts/verba/`)

Premium GRE/English vocabulary app. Dark amber aesthetic.

**Screens & routing (wouter):**
- `/` — WelcomeScreen: shimmer title, floating words, chromatic orbs, Start button
- `/setup` — PreQuizSetup: word-count slider (5–50, step 5), timer toggle, Begin button
- `/quiz?words=N&timer=bool` — QuizScreen: progress bar, word shimmer, Translate card, 4 MC options, feedback card with spring animation, optional 15s countdown ring, Web Audio API correct beep

**Shared components:**
- `src/components/AppBackground.tsx` — ChromaticOrbs + BackgroundHalos + FloatingWords (accepts `dimWords` prop for 50% opacity reduction on quiz screen)

**Quiz data:** `QUIZ_WORDS` constant (10 GRE words) in `QuizScreen.tsx` — TODO: replace with DB fetch (Step 4)

**Visual tokens:** bg `#0A0A0A`, amber `#D97706`/`#F59E0B`, button gradient `#F59E0B→#EA580C`, fonts: Space Grotesk (headings) + Inter (body)
