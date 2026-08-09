# CLAUDE.md — BuildTrust

BuildTrust is a construction-FinTech app: a neutral escrow intermediary that holds
client money and releases it against approved milestones, with two-way ratings.
Two roles: **Client / Homeowner** and **Contractor / Professional**.

**Full spec lives in `BUILD_SPEC.md`. Read it before building.** This file is the
short list of rules that apply to *every* session — never violate them.

## Stack
- Monorepo: pnpm workspaces + Turborepo (`apps/api`, `apps/mobile`, `packages/shared`)
- Backend: Fastify + Prisma + PostgreSQL, TypeScript strict
- Mobile: Expo + expo-router + NativeWind + TanStack Query + Zustand
- Shared: Zod schemas + inferred types + typed apiClient

## Commands (defined in Phase 0)
- `pnpm dev` — run api + mobile
- `pnpm typecheck` · `pnpm lint` · `pnpm build` · `pnpm test`

## Golden rules
1. **TypeScript strict everywhere.** No `any` without a comment justifying it.
2. **`packages/shared` Zod schemas are the single source of truth** for every
   request/response. Backend validates against them; the app imports the inferred
   types. They must never drift.
3. **Money is always integer agorot** (₪1 = 100 agorot). Never floats. Format to
   `₪` only at the display edge.
4. **The ledger is append-only, double-entry.** Balances are derived by summing
   `LedgerEntry` rows — there is no editable balance column. A milestone releases
   exactly once, and total releases ≤ total deposits per contract.
5. **Payments go through the `PaymentPort` interface with a mock adapter.** No real
   payment provider in v1.
6. **Build phase by phase (BUILD_SPEC §11).** Finish a phase green (typecheck +
   lint + tests) and committed before starting the next. Stop and check in before
   each new phase.
7. **Stay in scope (BUILD_SPEC §12).** Do NOT build the 14-trade sequencing engine,
   budget analytics, scheduling cascade, real payments, chat, file uploads, or
   OAuth in v1. Stub what the mockups show but v1 doesn't implement.
8. If reality forces an architectural deviation from the spec, **stop and explain
   the trade-off first** — don't improvise silently.

## Definition of done (v1)
App runs on Expo; register → pick role → log in works; all 12 mockup screens are
reachable with seeded data matching the designs; escrow flow is correct end to end
(deposit reserves, milestone approval releases exactly that amount to the
professional and updates the wallet); typecheck, lint, and tests are green.
