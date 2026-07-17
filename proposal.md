# Handsel — Product Proposal

> Product of C4T (Center for Transformation, parent company). Working name: **Handsel 信約**.

## Build continuity and handoff

> **Living record — last verified 2026-07-17 (HKT).** Read this section before
> resuming implementation after a fresh chat. It records repository evidence, not
> credentials or private customer data. Product authority remains `CLAUDE.md` →
> `spec-handsel-mvp.md` → `ui-ux-spec.md` → `docs/ARCHITECTURE.md`.

### Current stage

**Stage 4 — Building.** The approved slice order is E6 → E1 → E2 → E3 → E8 →
E4 → E5/E7. E6, E1, and **E2 in full** (two-party click-sign _and_ the redline
loop) are verified with real browser + database evidence. **E3 is functional**
for milestone deliver/approve; its settlement half (sales-report submission UI
and rev-share payout wiring) is domain-complete but not yet wired to a screen.
The next slice is **E8 Vertex AI Gemini Settlement Agent** — not Stripe.
E3 milestone tracking is now wired end to end (migration → adapter → API → UI)
and browser-verified for the creator side. Its settlement half (sales-report
submission screen, rev-share payout wiring) is domain-complete but has no
screen yet.

| Area                           | Current evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Status                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Foundation                     | Next.js 15, strict TypeScript, Postgres `postgres` driver, Clerk, zod, Vitest, Playwright, numbered migrations, and GitHub Actions CI are present.                                                                                                                                                                                                                                                                                                                              | Implemented locally                |
| E6 auth + profiles             | Clerk development instance is linked; `/onboarding` writes a server-authenticated profile and `/dashboard` requires one. A real creator onboarding → Postgres profile → dashboard flow was manually verified.                                                                                                                                                                                                                                                                   | Functional in development          |
| Landing auth                   | `/` exposes real Clerk `Sign in` / `Get started` controls when signed out and `UserButton` when signed in. `/sign-in` and `/sign-up` routes exist.                                                                                                                                                                                                                                                                                                                              | Functional in development          |
| E1 deal builder + term sheet   | `/deals/new` validates and persists a draft; immutable term-sheet versions, append-only `deal_events`, 14-day hashed share links, and `/s/[shareToken]` exist.                                                                                                                                                                                                                                                                                                                  | Functional locally                 |
| E2 click-sign + redline        | Two-party click-sign verified live with two Clerk identities. **Redline now verified end-to-end**: signed v1 → revise 20%→30% → contract v2 with a new hash, signature reset to Waiting, deal back to `NEGOTIATING`, events `DEAL_TERMS_REVISED → TERM_SHEET_VERSION_CREATED → CONTRACT_SIGNATURES_RESET`. `reviseDealTerms` performs terms + term-sheet + redline in ONE transaction.                                                                                          | Verified (contest-mode click-sign) |
| E3 milestones + reconciliation | Migration 0008 (milestone state columns + `sales_reports`), `src/lib/db/milestones.ts`, API, and deal-hub UI. Browser-verified: creator delivered → `DELIVERED` + event; creator calling approve → 403; unknown milestone id → 404. Pure domain complete: `money/revShare.ts` (13 tests), `milestone/milestone.ts` (16), `sales/lateness.ts` (11), `deal/revision.ts` (10) — all 100% coverage. **Brand-side approve not yet browser-verified; sales-report screen not built.** | Deliver verified; approve pending  |
| E8 Gemini Settlement Agent     | Prototype displays S06/S07/S09/S15-style AI surfaces only. No Vertex AI SDK adapter, agent run persistence, or production Gemini call exists.                                                                                                                                                                                                                                                                                                                                   | Not started                        |
| E4 payments                    | No Stripe Payment Link, Connect, webhook, or reconciliation adapter exists.                                                                                                                                                                                                                                                                                                                                                                                                     | Not started                        |
| Production                     | `handseltrust.tech` registration was reported by the owner, but DNS, Vercel deployment, Clerk production instance, Stripe KYC, and Vertex configuration are not verified in this repository.                                                                                                                                                                                                                                                                                    | External work pending              |

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

On 2026-07-17 (E3 first slice), added `src/domain/money/revShare.ts` +
`revShare.test.ts` (pure, no I/O, no framework imports — matches the
`src/domain` dependency rule). Failing-first TDD: wrote 13 tests (RED, module
missing), then implemented `computeRevShare()` using BigInt internally for
exact integer arithmetic (no floating point anywhere near money) and
round-half-to-even ("banker's rounding") on the creator's share; the brand
share is the exact remainder, so the two shares are proven to sum to the
gross amount for a spread of `(gross, basisPoints)` pairs including 0, both
extremes (0bp / 10000bp), and a near-`Number.MAX_SAFE_INTEGER` gross value.
Two dedicated tests pin the round-half-to-even tie-break in both directions
(`1 @ 5000bp → 0/1`, `3 @ 5000bp → 2/1`).

- `npm test`: **17 test files / 77 tests passed** (was 16/64 before this
  slice).
- `npm run typecheck`: passed.
- No trust boundary was touched (pure function, no DB/auth/webhook/payment
  code), so no dedicated security review was required for this slice per
  `security-gates.md`; the money-specific gate (integer minor units, proven
  rounding rule) was self-checked directly against the test evidence above.
- Not yet committed — this slice is isolated to
  `src/domain/money/revShare.ts`, `src/domain/money/revShare.test.ts`, and
  this `src/domain/README.md` status-table edit; recommend committing these
  three files alone once reviewed.

### Safety and test constraints

- Never reveal, copy, commit, or request Clerk, database, Stripe, Vertex, or browser-session secrets.
- `deal_events` is append-only. Money stays integer minor units. Authorization is party-scoped in the data layer; private unauthorized access returns 404.
- **Do not run destructive integration tests against the application database.** They require a separate `TEST_DATABASE_URL` and explicit `ALLOW_DESTRUCTIVE_INTEGRATION=true`; they must never target the same host/database as `DATABASE_URL`.
- CI has a PostgreSQL service, but its integration-test activation and full hosted run have not yet been independently verified. Treat CI success as unproven until a real GitHub Actions run is inspected.
- E2 is contest/demo click-sign only until G2 legal review. E4 live escrow remains blocked by G3/Stripe approval and the two-pilot-pair gate.

### E3 + E2-redline verification evidence (2026-07-17, later session)

Run live in-browser at `http://localhost:3100` (the dev server is now pinned to
a fixed port in `.claude/launch.json` so a restart no longer drops the Clerk
session) against the local dev Postgres:

- Creator delivered a milestone → `deal_milestones.state = 'DELIVERED'` with
  `delivered_at`, and a `MILESTONE_DELIVERED` event appended.
- Creator posting `{action:"approve"}` directly to the API → **403**. Hiding the
  button in the UI is not the enforcement; the domain role check is.
- Unknown milestone id under a real deal → **404**, so a non-party cannot learn
  whether a milestone exists.
- Revising a deal whose milestone was already delivered → **409 "a milestone has
  already progressed"**. This guard prevented real data loss: a revision replaces
  milestone rows, which would have destroyed the delivery record and timestamp.
- On a clean deal: signed contract v1, revised creator share 20% → 30%, and got
  contract **v2** with a different content hash, the creator signature reset to
  Waiting, deal state back to `NEGOTIATING`, term sheets v1+v2, and the event
  chain above.
- The v1 signature row is deliberately retained. It is hash-bound to v1 and is an
  audit fact ("the creator did sign v1 at time T"); deleting it would violate the
  append-only rule. It is not an orphan — the UI reads signatures for the latest
  version only, and signatures are keyed by `contract_version_id`.

`npm test` (126), `npm run typecheck`, and `npm run build` pass. Note: running
`npm run build` while the dev server is up overwrites `.next` and makes the dev
server serve stale chunks — restart it after a build.

### Exact next action

Browser-verify the brand side of milestone approval: sign in as the second
Clerk identity on the `Glow Ritual Product Line` deal
(`0ecaa928-65d8-47c0-a7c6-f8c8baf3ae14`, milestone already `DELIVERED`), confirm
the brand sees **Approve deliverable** where the creator does not, approve it,
and check `deal_milestones.state = 'APPROVED'` with a `MILESTONE_APPROVED` event.
That closes E3 milestone tracking. Then start **E8 (Vertex AI Gemini Settlement
Agent)** — the contest's mandatory Gemini call and the AI-native centrepiece —
before E4 Stripe. `agent_runs` persistence and zod-validated structured output
reconciled against `computeRevShare()` are required from the first slice: Gemini
proposes, the pure function decides.
Do not start Stripe or Gemini work yet.

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
