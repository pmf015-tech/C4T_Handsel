# Handsel — Product Proposal

> Product of C4T (Center for Transformation, parent company). Working name: **Handsel 信約**.

## Build continuity and handoff

> **Living record — last verified 2026-07-17 (HKT).** Read this section before
> resuming implementation after a fresh chat. It records repository evidence, not
> credentials or private customer data. Product authority remains `CLAUDE.md` →
> `spec-handsel-mvp.md` → `ui-ux-spec.md` → `docs/ARCHITECTURE.md`.

### Current stage

**Stage 4 — Building.** The approved slice order is E6 → E1 → E2 → E3 → E8 →
E4 → E5/E7. E6, E1, and the E2 two-party click-sign journey are now verified
with real browser + database evidence (see below). The redline half of E2
(acceptance criterion 3 in `spec-handsel-mvp.md`) cannot be exercised yet: no
deal-terms edit mutation or UI exists, so every regenerated term sheet hashes
identical to v1 and `RedlineHashUnchangedError` blocks it. Founder decision
2026-07-17: skip redline verification for now and proceed to **E3 settlement
core** with failing-first domain tests; redline UI is deferred, not blocking.

| Area                           | Current evidence                                                                                                                                                                                                                                                                                                                      | Status                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Foundation                     | Next.js 15, strict TypeScript, Postgres `postgres` driver, Clerk, zod, Vitest, Playwright, numbered migrations, and GitHub Actions CI are present.                                                                                                                                                                                    | Implemented locally                     |
| E6 auth + profiles             | Clerk development instance is linked; `/onboarding` writes a server-authenticated profile and `/dashboard` requires one. A real creator onboarding → Postgres profile → dashboard flow was manually verified.                                                                                                                         | Functional in development               |
| Landing auth                   | `/` exposes real Clerk `Sign in` / `Get started` controls when signed out and `UserButton` when signed in. `/sign-in` and `/sign-up` routes exist.                                                                                                                                                                                    | Functional in development               |
| E1 deal builder + term sheet   | `/deals/new` validates and persists a draft; immutable term-sheet versions, append-only `deal_events`, 14-day hashed share links, and `/s/[shareToken]` exist.                                                                                                                                                                        | Functional locally                      |
| E2 click-sign + redline        | Two-party click-sign (create → invite → accept → both signatures → `SIGNED`) verified live in-browser with two Clerk identities, with matching `deal_events`/`deal_parties`/`contract_signatures` rows. Redline reset logic exists in `src/lib/db/contracts.ts` but has no edit-terms UI to trigger it from a genuinely different v2. | Click-sign verified; redline UI missing |
| E3 milestones + reconciliation | Only the milestone schema/builder inputs exist; no real deliver/approve/report/dispute flow yet.                                                                                                                                                                                                                                      | Not started                             |
| E8 Gemini Settlement Agent     | Prototype displays S06/S07/S09/S15-style AI surfaces only. No Vertex AI SDK adapter, agent run persistence, or production Gemini call exists.                                                                                                                                                                                         | Not started                             |
| E4 payments                    | No Stripe Payment Link, Connect, webhook, or reconciliation adapter exists.                                                                                                                                                                                                                                                           | Not started                             |
| Production                     | `handseltrust.tech` registration was reported by the owner, but DNS, Vercel deployment, Clerk production instance, Stripe KYC, and Vertex configuration are not verified in this repository.                                                                                                                                          | External work pending                   |

### What a new agent must read first

1. `AGENTS.md` and `CLAUDE.md` for non-negotiable architecture, money, event, and security rules.
2. This continuity record, then `spec-handsel-mvp.md`, `ui-ux-spec.md`, and `docs/ARCHITECTURE.md`.
3. `docs/BACKEND-IMPLEMENTATION-PLAN.md` for the approved slice order.
4. Run `graphify query "<current task>"` when `graphify-out/graph.json` exists; Graphify is navigation support, not a replacement for this handoff or git history.
5. Inspect `git status --short` before editing. The working tree is currently intentionally non-clean; preserve all existing changes and never reset or broadly format them.

### Current working-tree handoff

The latest committed baseline is `8c31229` (`feat: full-stack MVP build — prototype UI, deal builder, term sheets, contracts, DB layer`). At the time of this record, uncommitted work includes:

- E2 reliability and integration-test safety updates in contract, DB, i18n, and invite-accept paths.
- Clerk landing controls plus the new `src/app/landing-auth.tsx` and `src/app/sign-up/` route.
- `.agents/` Clerk skill bundle and `skills-lock.json` from `npx skills add clerk/skills`.
- `src/app/deals/[dealId]/contract/page.tsx`: the contract page now creates v1 from the
  latest term sheet when none exists yet, instead of 404ing. This was the actual blocker
  stopping any user from ever reaching the contract screen (the deal-hub "Create / open
  contract →" link is a plain `<a href>` GET; it never called the existing
  `POST /api/deals/[dealId]/contract` creation route).

Do not discard, overwrite, or commit these as an undifferentiated batch. First review the diff, keep a commit limited to one verified concern, and exclude secrets, `.env*.local`, `.clerk/`, generated build output, and unrelated user work.

### Latest verification evidence

On 2026-07-17, after the Clerk landing-control change:

- `npm test`: **16 test files / 64 tests passed**.
- `npm run typecheck`: passed.
- `npm run build`: passed; App Router emitted the sign-in, sign-up, onboarding, dashboard, deal, term-sheet, and contract routes.
- Headed browser smoke check: signed-out landing showed `Sign in` and `Get started`; console error count was zero.
- Targeted Prettier check for changed auth files and `git diff --check`: passed.

`npm run format:check` is not presently a clean whole-repo gate because downloaded Clerk skill files and pre-existing Markdown do not match the repository formatter. Do not bulk-format them as a side effect of product work.

On 2026-07-17 (same day, later session), E2 two-party click-sign acceptance, run live
against the local dev Postgres (`127.0.0.1:54329/handsel_test`) through the actual
browser UI with two distinct Clerk identities:

1. Creator identity created deal `Glow Ritual Product Line` (draft), generated term
   sheet v1, opened `/deals/{id}/contract` (auto-created contract v1 — see fix above),
   and click-signed.
2. Creator generated a counterparty invite; signed out.
3. Second Clerk identity signed in, opened the invite link, accepted it (joined
   `deal_parties` with role `brand`), and click-signed the same content hash.
4. Verified directly against Postgres: `deals.state = 'SIGNED'`; `deal_parties` has one
   `creator` row and one `brand` row under two different `clerk_user_id`s;
   `deal_events` is a clean append-only sequence —
   `DEAL_DRAFT_CREATED → TERM_SHEET_VERSION_CREATED → CONTRACT_VERSION_CREATED →
CONTRACT_INVITE_CREATED → CONTRACT_SIGNATURE_CREATED(creator) →
CONTRACT_INVITE_ACCEPTED(brand) → CONTRACT_SIGNATURE_CREATED(brand) →
DEAL_FULLY_SIGNED(brand)`.
5. `npm test` (64/64) and `npm run typecheck` re-verified green after the page.tsx fix.

Redline (criterion 3) was not exercised: there is no deal-terms edit mutation, so a
second `createTermSheetVersion()` call reproduces the same content hash and
`createRedlineVersion()` correctly rejects it via `RedlineHashUnchangedError`. Founder
decision: defer building an edit-terms UI; it is not on the E3 critical path.

`TEST_DATABASE_URL` is not set in `.env.local` — only `DATABASE_URL` (pointing at the
`handsel_test` local dev database) is configured. No destructive integration tests were
run or attempted; `isDedicatedTestDatabase()`-gated suites remain unexercised until a
genuinely separate test database is configured.

### Safety and test constraints

- Never reveal, copy, commit, or request Clerk, database, Stripe, Vertex, or browser-session secrets.
- `deal_events` is append-only. Money stays integer minor units. Authorization is party-scoped in the data layer; private unauthorized access returns 404.
- **Do not run destructive integration tests against the application database.** They require a separate `TEST_DATABASE_URL` and explicit `ALLOW_DESTRUCTIVE_INTEGRATION=true`; they must never target the same host/database as `DATABASE_URL`.
- CI has a PostgreSQL service, but its integration-test activation and full hosted run have not yet been independently verified. Treat CI success as unproven until a real GitHub Actions run is inspected.
- E2 is contest/demo click-sign only until G2 legal review. E4 live escrow remains blocked by G3/Stripe approval and the two-pilot-pair gate.

### Exact next action

Start E3 (milestones + sales reconciliation) with failing-first Vitest domain tests:
banker's-rounded rev-share pure function (`gross`, `%` → minor units, no floats, creator

- brand shares sum exactly to the gross share pool), deliver/approve state transitions,
  idempotent 7-day auto-approve, and the two-consecutive-late-report dispute freeze — per
  `spec-handsel-mvp.md` E3 acceptance criteria. Build domain-first (`src/domain`, pure, no
  I/O) before wiring `src/lib`/`src/app`. Do not start Stripe or Gemini work yet.

### Update and commit protocol

After every accepted vertical slice, update this section with: date, stage,
observable outcome, verification commands/results, external blockers, changed
paths, and the one next action. Keep it concise and remove stale claims rather
than stacking contradictory status notes.

Graphify must still be refreshed after code changes, but it does **not** replace
a local git commit: Graphify maps relationships; a commit preserves a verified,
revertible decision. Make a local commit only at an atomic, verified boundary
with an isolated diff. Never push, deploy, modify hosted services, or fold
unrelated dirty changes into that commit without explicit authorization.

## Problem

Creator × brand product-line partnerships (co-launched physical products with revenue share
or equity) routinely collapse because the deal infrastructure doesn't exist:

- Terms are negotiated over DMs/text messages; equity is promised verbally.
- 72% of creators report payment delays or disputes; only 34% have written contracts
  (InfluenceFlow 2026). 42% of micro-influencers report late or non-payment.
- After launch, sales data is opaque to the creator; payouts arrive late, small, or never.
- Each failed collaboration raises the trust cost of the next one, for both sides.

Real cases motivating this product: a 20k-follower creator whose supplement-brand
co-launch stalled after 3 months of text-message negotiations and verbal equity promises;
another creator who closed a deal on a handshake, delivered everything, waited 90 days,
and received a fraction of the promised split with zero visibility in between.

## Target User

- **Primary:** creators (10k–500k followers) entering product-line collaborations with
  brands — not one-off sponsored posts, but co-launched physical product lines with
  ongoing revenue share. Initial geographic focus: Taiwan / Hong Kong creator market,
  with English support for cross-border deals.
- **Secondary:** brand/DTC operators who want creators as long-term product partners and
  need a credible way to commit (structured terms attract better creators).

## Value Proposition

Turn scattered, unverifiable collaborations into searchable, verifiable, trusted deal
records. Handsel is the **deal-to-payout layer**: structured terms → on-platform contract
→ tracked sales → milestone-gated payouts. The name is the promise: a _handsel_ is the
first payment placed in the hand at the start of a venture, sealing that the promise
will be kept.

## MVP Scope (deal tool first, marketplace later)

1. **Structured deal builder** — creator enters follower count, niche, engagement rate;
   brand enters revenue-share terms, projected revenue, deliverables. Output: a
   standardized term sheet both sides can redline.
2. **On-platform contract** — e-signed, stored, versioned. The contract never leaves
   the platform.
3. **Milestone & payout tracking** — deliverables checklist, sales reconciliation
   (brand-reported at MVP, platform-verified later), payouts released per milestone via
   Stripe Connect escrow-style holding.
4. **Deal record & history** — every completed deal becomes a verifiable track record
   both parties can show future partners.

### Explicitly OUT of MVP scope

- Matchmaking / discovery marketplace (phase 2 — tool first solves cold-start).
- Equity issuance (phase 2 — rev-share only at MVP; equity via standardized templates +
  lawyer network later).
- Automated sales-feed integrations (Shopify/momo/蝦皮) — phase 2; MVP uses
  brand-reported reconciliation with dispute flags.
- Native mobile app.

## Success Metrics

- 10 real deals signed and running through the platform in the first 90 days post-launch.
- ≥ 1 deal reaching a milestone payout released through the platform.
- Creator NPS on "would you run your next deal here" ≥ 40.
- Zero deals where terms exist only off-platform after signup.

## Key Risks

1. **Marketplace cold start** — mitigated by MVP being a tool for deals already in
   negotiation, not a matchmaker.
2. **Sales tracking trust gap** — brands can under-report; MVP mitigates with
   reconciliation + dispute process, phase 2 adds commerce integrations.
3. **Adjacent competitors** — Collabstr and AhaCreator offer escrow + contracts for
   one-off campaign deals; Pietra owns creator supply chain. Differentiation: Handsel is
   the only player focused on **long-running product-line partnerships with ongoing
   revenue-share settlement**, not single-content-delivery campaigns. This gap must be
   re-validated quarterly.
4. **Payments/regulatory** — holding and releasing funds across TW/HK/US requires care;
   Stripe Connect chosen to keep Handsel out of money-transmitter territory.
5. **Naming collision (phonetic)** — hansel.io ("Hansel", India, product-growth SaaS)
   sounds identical. Spelling/trademark class differ; formal trademark search required
   before public launch.

## Brand Architecture

```
C4T (parent, cat logo, "Center for Transformation")
 └── Handsel 信約 (product brand, own logo, footer: "A C4T Company")
```
