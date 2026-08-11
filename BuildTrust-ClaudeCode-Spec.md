# BuildTrust — Claude Code Build Spec

> Paste this whole file as your first message to Claude Code (or save it as
> `BUILD_SPEC.md` at the repo root and start with: *"Read BUILD_SPEC.md and
> begin Phase 0. Follow the working rules in section 0."*)

---

## 0. Your role and how to work

You are building **BuildTrust**, a construction-FinTech mobile app with a real backend. Work like a careful senior engineer, not a code generator.

**Working rules — follow these on every phase:**

1. Build **incrementally, phase by phase** (section 11). Do not jump ahead.
2. After each phase: run `typecheck`, `lint`, and `build`; run the tests for that phase. **Do not start the next phase while anything is red.**
3. Commit at the end of each phase with a clear message (e.g. `feat(api): auth + JWT`).
4. Keep **TypeScript `strict: true`** everywhere. No `any` unless justified in a comment.
5. The **Zod schemas in `packages/shared` are the single source of truth** for every API request/response. The backend validates against them; the app imports the inferred types. They must never drift.
6. If reality forces a deviation from this spec, **stop and explain the trade-off before proceeding** — don't silently improvise architecture.
7. Prefer small, typed, single-responsibility modules and components over large files.

---

## 1. Product summary

BuildTrust is a neutral intermediary for construction and renovation jobs. It solves client ↔ professional distrust by holding money in **escrow** and releasing it against **approved milestones**, with **two-way ratings** building a trustworthy community over time.

Two roles: **Client / Homeowner** and **Contractor / Professional**.

**Core trust loop (build this end to end):** client posts a job → picks a professional → a digital contract defines price + working days + milestones → client deposits into escrow → professional works, milestones are approved → funds release milestone by milestone → both sides rate each other.

**Scope for v1:** implement exactly the 12 screens in the mockups. The larger product vision (automated 14-trade sequencing, budget-variance analytics, cascading schedule engine) is **out of scope for v1** — see section 12.

---

## 2. Tech stack (pinned — do not substitute without asking)

**Monorepo:** pnpm workspaces + Turborepo.

**Backend (`apps/api`):**
- Fastify + TypeScript (strict)
- Prisma ORM + PostgreSQL
- Auth: JWT access token, `bcrypt` password hashing
- Validation: Zod (shared schemas), `fastify-type-provider-zod`
- Tests: Vitest (+ Supertest-style HTTP tests)

> This is a **greenfield build — nothing exists yet.** Implement the escrow / contract / milestone engine from scratch to satisfy sections 4–5. Fastify is chosen for solo velocity and low boilerplate; if you'd prefer NestJS's module/DI structure, swap it here and adjust the `apps/api` layout accordingly.

**Frontend (`apps/mobile`):**
- Expo (React Native) + `expo-router` (file-based nav)
- NativeWind (Tailwind for RN) for styling + design tokens
- TanStack Query for all server state
- Zustand for local UI/session state
- `react-hook-form` + Zod for forms
- `expo-secure-store` for the JWT

**Shared (`packages/shared`):**
- Zod schemas + `z.infer` types for every entity and endpoint
- A small typed `apiClient` (fetch wrapper) consumed by the app

---

## 3. Monorepo structure

```
buildtrust/
├─ apps/
│  ├─ api/                # Fastify + Prisma backend
│  │  ├─ prisma/schema.prisma
│  │  ├─ src/
│  │  │  ├─ modules/      # auth, users, professionals, projects,
│  │  │  │                # contracts, milestones, escrow, reviews
│  │  │  ├─ plugins/      # jwt, prisma, error-handler
│  │  │  ├─ lib/          # money, ledger, payment-port
│  │  │  └─ app.ts / server.ts
│  │  └─ test/
│  └─ mobile/             # Expo app
│     ├─ app/             # expo-router routes (see section 9)
│     ├─ components/      # UI kit (Button, Card, Chip, StarRating, ...)
│     ├─ features/        # screen-level logic + query hooks
│     ├─ lib/             # apiClient wiring, auth store, formatMoney
│     └─ theme/           # NativeWind tokens
├─ packages/
│  └─ shared/             # Zod schemas + types + apiClient
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

---

## 4. Domain model (Prisma sketch)

Fill in timestamps, indexes, and relations. Enums shown inline.

- **User** — `id, role (CLIENT | PROFESSIONAL), fullName, email (unique), phone, passwordHash, avatarUrl?, location?, bio?, verified (bool)`
- **ProfessionalProfile** — `userId (1:1), specialty (e.g. "Flooring Specialist"), yearsExperience, skills (string[]), onTimePercent, projectsCount` (derive counts where possible)
- **PortfolioItem** — `id, professionalId, imageUrl, caption?`
- **Category** — `id, name, slug, icon?` — the trade taxonomy (Electrical, Plumbing, Flooring, Painting, HVAC, Carpentry, Kitchens, Structural, Waterproofing, Aluminum & Glass, Drywall); professionals link many-to-many via `ProfessionalCategory`. Same taxonomy the project-phase engine will use.
- **Project** — `id, clientId, title, sizeLabel? (e.g. "Living Room (25m²)"), description?, status (PLANNING | IN_PROGRESS | COMPLETED | CANCELLED), budgetPlanned (agorot)`
- **Contract** — `id, projectId, clientId, professionalId, amount (agorot), startDate, estimatedEnd, workingDays, scope, status (DRAFT | ACTIVE | COMPLETED | DISPUTED), version` — **immutable once ACTIVE**; edits create a new version
- **Milestone** — `id, contractId, order, title, amount (agorot), status (PENDING | IN_PROGRESS | SUBMITTED | APPROVED | RELEASED)`, `approvedAt?, releasedAt?`
- **LedgerEntry** — append-only double-entry: `id, contractId, milestoneId?, type (DEPOSIT | RESERVE | RELEASE | REFUND), debitAccount, creditAccount, amount (agorot), createdAt`. **Balances are derived from this table, never stored as a mutable column.**
- **Review** — `id, contractId, authorId, subjectId, direction (CLIENT_TO_PRO | PRO_TO_CLIENT), rating (1–5), comment?, createdAt`

---

## 5. Money and escrow rules (critical — get these exactly right)

- **All money is stored as integer agorot** (₪1 = 100 agorot). Never use floats for money. Formatting to `₪` happens only at the display edge.
- **Ledger is append-only, double-entry.** Every movement is one `LedgerEntry`. Account balances (client escrow, professional payable, platform hold) are computed by summing entries — there is no editable balance field.
- **Flow:**
  - `DEPOSIT` → client funds enter the platform escrow account for a contract.
  - `RESERVE` → on contract activation, the deposit is earmarked per milestone.
  - `RELEASE` → when a milestone is **APPROVED by the client**, its amount moves from escrow to the professional's payable. Set the milestone to `RELEASED`.
  - `REFUND` → unreleased funds can return to the client (dispute/cancel path — minimal in v1).
- **Invariant:** sum of a contract's `RELEASE` entries ≤ its `DEPOSIT` total; a milestone can only be `RELEASED` once. Enforce in the service layer and cover with tests.
- **Payments are mocked** behind a `PaymentPort` interface (`deposit()`, `payout()`). Provide a `MockPaymentAdapter` that always succeeds. Real Stripe Connect slots in later without touching domain logic — **do not integrate a real payment provider in v1.**

---

## 6. API surface (REST, all validated by shared Zod schemas)

**Auth**
- `POST /auth/register` — fullName, email, phone, password → user + token
- `POST /auth/login` — email, password → user + token
- `POST /auth/role` — set role after register (CLIENT | PROFESSIONAL)
- `GET /auth/me` — current user

**Profile / professionals**
- `PATCH /me` — edit profile (name, phone, email, location, bio, avatar)
- `GET /professionals` — browse/search; accepts `category`, `search`, `sort` query params (used by the Discover tab)
- `GET /categories` — trade taxonomy (used by the Discover tab)
- `GET /professionals/:id` — profile + stats + skills
- `GET /professionals/:id/portfolio`
- `GET /users/:id/reviews`

**Projects & contracts**
- `GET /projects` — current user's projects (+ progress %, budget vs spent)
- `POST /projects`
- `GET /projects/:id` — with active contract summary
- `POST /contracts` — create from a project + chosen professional
- `GET /contracts/:id` — with milestones
- `POST /milestones/:id/submit` — professional marks work submitted
- `POST /milestones/:id/approve` — client approves → triggers `RELEASE`

**Wallet**
- `GET /wallet` — escrow balance + transaction feed (derived from ledger)
- `POST /escrow/deposit` — fund a contract (via `PaymentPort`)

**Home (hub aggregates)**
- `GET /home/summary` — released / inEscrow / remaining / committed totals (agorot)
- `GET /me/action-items` — milestones awaiting the client's approval + contracts awaiting an escrow deposit

**Reviews**
- `POST /reviews` — direction-aware two-way rating

Every endpoint: JWT-guarded except register/login; role-guarded where relevant (only a client can approve a milestone; only the contract's professional can submit one).

---

## 7. Design system (extract from the mockups)

Sample exact hex from the mockup image; these are the targets:

- **Primary (buttons, active states):** warm bronze, ~`#C48A5A`. White text on primary.
- **Accent / links** ("Register", "Forgot password?"): orange, ~`#E0883C`.
- **Success** (released funds, "+₪"): green, ~`#16A34A`. **Reserved/outgoing** ("-₪"): red/neutral.
- **Star rating:** gold, ~`#F5B301`.
- **Text:** `#1A1A1A` primary, `#6B7280` secondary. **Backgrounds:** `#FFFFFF` / `#F9FAFB`. **Borders:** `#E5E7EB`.
- **Typography:** clean sans (Inter). Large bold screen titles, medium section headers, regular body.
- **Shape:** cards `rounded-2xl` (~16px) with soft shadow; inputs `rounded-xl`; generous padding.
- **Currency:** symbol `₪` before the amount, thousands separators. Budgets show whole shekels (`₪120,000`); the wallet balance shows 2 decimals (`₪28,750.00`). Use `Intl.NumberFormat`.

**Shared components to build first:** `Button` (filled/outline), `TextField`, `Card`, `Chip` (skills), `StarRating`, `RatingBreakdown` (5→1 bars), `ProgressBar`, `StatusBadge` (In Progress / Planning / Verified), `BottomTabBar` (5 icon tabs — see §9), `Avatar`, `TransactionRow`, `CategoryTile`, `ProCard`, `ActionRequiredList`, `BudgetOverviewCard`.

Mockups are **English, LTR**. Keep strings in one place so Hebrew/RTL can be added later, but v1 ships English LTR.

---

## 8. Screens (each mockup → route, data, states)

> Updated since first draft: there is now a dedicated **Discover** marketplace tab (row 13), Home is a **management hub**, and Settings opens from the Home header avatar (no "More" tab). See §9 for navigation.

| # | Screen | Route | Data / endpoint | Notes |
|---|--------|-------|-----------------|-------|
| 1 | Landing | `/(auth)/landing` | — | Get Started / Log In |
| 2 | Login | `/(auth)/login` | `POST /auth/login` | email + password, show/hide toggle |
| 3 | Register | `/(auth)/register` | `POST /auth/register` | + T&S checkbox |
| 4 | Role select | `/(auth)/role` | `POST /auth/role` | two selectable cards, Continue |
| 5 | Home (hub) | `/(tabs)/home` | `GET /home/summary`, `GET /me/action-items`, `GET /projects` | Action Required list, budget overview, richer project cards, New Project; slim search bar routes to Discover; header avatar → Settings |
| 6 | Project detail | `/project/[id]` | `GET /projects/:id`, `GET /contracts/:id` | tabs: Overview (real), Payments (milestones+ledger), Timeline (dates), Files (stub) |
| 7 | Pro profile | `/professional/[id]` | `GET /professionals/:id` | stats row, About, Message/Hire Me |
| 8 | Portfolio/Reviews | `/professional/[id]` tabs | portfolio + reviews endpoints | grid + rating breakdown |
| 9 | Edit profile | `/settings/profile` | `PATCH /me` | react-hook-form, Save Changes |
| 10 | Wallet | `/(tabs)/wallet` | `GET /wallet` | escrow balance card (locked), transaction feed |
| 11 | Reviews | `/reviews/[userId]` | `GET /users/:id/reviews` | big score + breakdown + review cards |
| 12 | Settings | `/settings` | `GET /auth/me` | opened from the Home header avatar (no More tab); list rows, Verification, Log Out |
| 13 | Discover (marketplace) | `/(tabs)/discover` | `GET /categories`, `GET /professionals?category&search&sort` | search bar, filter/sort chips, trade-category grid, top-rated pro list → routes to pro profile |

Every data screen needs **loading, empty, and error** states, plus pull-to-refresh on lists.

---

## 9. Navigation (expo-router)

```
app/
├─ _layout.tsx              # root: auth gate → redirects to (auth) or (tabs)
├─ (auth)/
│  ├─ landing.tsx
│  ├─ login.tsx
│  ├─ register.tsx
│  └─ role.tsx
├─ (tabs)/
│  ├─ _layout.tsx           # bottom tab bar (icons): Home · Discover · Projects · Messages · Wallet
│  ├─ home.tsx              # management hub (see §8)
│  ├─ discover.tsx          # marketplace: search + trade categories + pro list
│  ├─ projects.tsx
│  ├─ messages.tsx          # stub in v1
│  └─ wallet.tsx
├─ project/[id].tsx
├─ professional/[id].tsx
├─ reviews/[userId].tsx
├─ settings/index.tsx       # settings list — opened from the Home header avatar (no "More" tab)
└─ settings/profile.tsx
```

Auth gate reads the token from `expo-secure-store` and routes accordingly.

---

## 10. Seed data (must reproduce the mockups)

Write a Prisma seed so the app renders like the designs on first run:

- **Client:** John (`john@buildtrust.dev`).
- **Professional:** David Parquet — Flooring Specialist, verified, rating 4.9 (128 reviews), 98% on-time, 3 years; skills: Parquet, Laminate, VINYL, Floor Leveling; 6 portfolio items.
- **Projects for John:** "Parquet Installation — Living Room (25m²)", IN_PROGRESS, 65%, budget ₪8,500, spent ₪5,525; "Bathroom Renovation — Tel Aviv", PLANNING, budget ₪35,000.
- **Contract:** John ↔ David, ₪8,500, start May 10 2024, est. end May 16 2024, milestones summing to ₪8,500 (milestone 2 released).
- **Wallet:** escrow balance ₪28,750.00; transactions — Parquet Milestone 2 Released +₪2,550, Bathroom Milestone 1 Released +₪5,000, Kitchen Cabinets Payment Reserved −₪3,000.
- **Reviews:** breakdown 5★×112, 4★×12, 3★×3, 2★×1, 1★×0; a few sample review cards.

All amounts seeded in **agorot**.

---

## 11. Phased build plan (each phase ends green + committed)

- **Phase 0 — Scaffold.** pnpm workspaces + Turborepo; `apps/api`, `apps/mobile`, `packages/shared`; TS strict, ESLint, Prettier, `.env.example`. *Done when both apps boot and typecheck.*
- **Phase 1 — Backend foundation.** Prisma schema (section 4) + migration + Postgres; auth (register/login/JWT/bcrypt), `/auth/me`, `/auth/role`; seed script (section 10). *Done when auth works via HTTP and the DB is seeded.*
- **Phase 2 — Backend domain.** projects, contracts, milestones, escrow ledger + `PaymentPort` mock, wallet, professionals + portfolio, reviews. **Vitest tests for the escrow invariants (section 5).** *Done when the trust loop works over HTTP and tests pass.*
- **Phase 3 — Shared package.** All Zod schemas + inferred types + typed `apiClient`; backend switched to validate against them. *Done when app and api share one type source.*
- **Phase 4 — Mobile foundation.** Expo + expo-router + NativeWind theme (section 7) + TanStack Query + auth store; screens 1–4 + auth gate. *Done when a user can register, pick a role, log in, and land in tabs.*
- **Phase 5 — Mobile main.** Tab nav + screens 5–12 wired to the API, using the shared UI kit. *Done when every mockup screen is navigable and shows real seeded data.*
- **Phase 6 — Polish.** Loading/empty/error states, form validation, pull-to-refresh; side-by-side pass against the mockups. *Done when the app matches the designs.*

---

## 12. Out of scope for v1 (do not build)

- Automated 14-trade sequencing engine, budget-variance analytics, cascading schedule engine (vision, not alpha).
- Real payment provider (Stripe Connect) — mock only.
- Messaging/chat (stub the Messages tab and message buttons).
- File uploads (stub the Files tab).
- Google / Apple OAuth — keep the buttons but implement **email/password only**; wire OAuth later.

---

## 13. Definition of done (v1)

The app runs on Expo; a user can register, choose a role, and log in; all 12 mockup screens plus the Discover tab are reachable (bottom nav: Home · Discover · Projects · Messages · Wallet, Settings behind the avatar) and render seeded data matching the designs; the escrow flow is correct end to end (deposit reserves funds; approving a milestone releases exactly that amount to the professional and updates the wallet); money is agorot-accurate throughout; typecheck, lint, and tests are green.