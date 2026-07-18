# Handsel — Product Proposal

> Product of C4T (Center for Transformation, parent company). Working name: **Handsel 信約**.

## Build continuity and handoff

> **Living record — last verified 2026-07-18 (HKT).** Read this section before
> resuming implementation after a fresh chat. It records repository evidence, not
> credentials or private customer data. Product authority remains `CLAUDE.md` →
> `spec-handsel-mvp.md` → `ui-ux-spec.md` → `docs/ARCHITECTURE.md`.
>
> Correction: the previous version of this record (last-verified 2026-07-17) said
> the E3 UI was still uncommitted and the latest baseline was `8c31229`. That was
> stale — Codex committed the full E3 UI slice (`53286c5`) since then. Verified
> against `git log` and a real test/typecheck/build run, not inferred.

### Current stage

**Stage 4 — Building.** The approved slice order is E6 → E1 → E2 → E3 → E8 →
E4 → E5/E7. E6, E1, and **E2 in full** (two-party click-sign _and_ the redline
loop) are verified with real browser + database evidence. **E3 is now
end-to-end**: deliver → approve/reject → sales report → auto-approve sweep are
all wired from UI through API through Postgres, with the seven-day idempotent
auto-approve now reachable via a real cron route (previously the domain
function existed but nothing triggered it — closed in this slice). The next
dependency-safe slice is **E8 Vertex AI Gemini Settlement Agent** — not Stripe.

| Area                           | Current evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Status                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Foundation                     | Next.js 15, strict TypeScript, Postgres `postgres` driver, Clerk, zod, Vitest, Playwright, numbered migrations, and GitHub Actions CI are present.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Implemented locally                |
| E6 auth + profiles             | Clerk development instance is linked; `/onboarding` writes a server-authenticated profile and `/dashboard` requires one. A real creator onboarding → Postgres profile → dashboard flow was manually verified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Functional in development          |
| Landing auth                   | `/` exposes real Clerk `Sign in` / `Get started` controls when signed out and `UserButton` when signed in. `/sign-in` and `/sign-up` routes exist.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Functional in development          |
| E1 deal builder + term sheet   | `/deals/new` validates and persists a draft; immutable term-sheet versions, append-only `deal_events`, 14-day hashed share links, and `/s/[shareToken]` exist.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Functional locally                 |
| E2 click-sign + redline        | Two-party click-sign verified live with two Clerk identities. **Redline now verified end-to-end**: signed v1 → revise 20%→30% → contract v2 with a new hash, signature reset to Waiting, deal back to `NEGOTIATING`, events `DEAL_TERMS_REVISED → TERM_SHEET_VERSION_CREATED → CONTRACT_SIGNATURES_RESET`. `reviseDealTerms` performs terms + term-sheet + redline in ONE transaction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Verified (contest-mode click-sign) |
| E3 milestones + reconciliation | Migration 0008, party-scoped `src/lib/db/milestones.ts` and `sales-reports.ts`, zod sales-report API, S07 tabs, dashboard deal list, activity timeline, clock/state components, live deterministic rev-share preview, report history, late timing badge, consecutive-late event, rejection-with-reason transition. Two-party deliver→approve, 403 role guard, and 404 IDOR proof remain verified (`142` tests, typecheck, build all pass). **New this slice**: `POST /api/cron/milestones/auto-approve`, bearer-secret-gated, calls `runAutoApproveSweep()` which re-locks each candidate row (`for update`) inside its own transaction before transitioning — closes a duplicate-audit-event race a security review caught in the first draft. Verified live against the real dev Postgres DB: no-auth → 401, wrong secret → 401, correct secret → 200 `{"ok":true,"approvedCount":0}` (0 is correct — no milestone in this DB is yet 7 days past delivery). `vercel.json` schedules it daily at 03:00 UTC. | E3 complete end to end             |
| E8 Gemini Settlement Agent     | Prototype displays S06/S07/S09/S15-style AI surfaces only. No Vertex AI SDK adapter, agent run persistence, or production Gemini call exists.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Not started                        |
| E4 payments                    | No Stripe Payment Link, Connect, webhook, or reconciliation adapter exists.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Not started                        |
| Production                     | `handseltrust.tech` registration was reported by the owner, but DNS, Vercel deployment, Clerk production instance, Stripe KYC, and Vertex configuration are not verified in this repository.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | External work pending              |

### What a new agent must read first

1. `AGENTS.md` and `CLAUDE.md` for non-negotiable architecture, money, event, and security rules.
2. This continuity record, then `spec-handsel-mvp.md`, `ui-ux-spec.md`, and `docs/ARCHITECTURE.md`.
3. `docs/BACKEND-IMPLEMENTATION-PLAN.md` for the approved slice order.
4. Run `graphify query "<current task>"` when `graphify-out/graph.json` exists; Graphify is navigation support, not a replacement for this handoff or git history.
5. Inspect `git status --short` before editing. The working tree is currently intentionally non-clean; preserve all existing changes and never reset or broadly format them.

### Current working-tree handoff

The latest committed baseline is `53286c5` (`feat: complete E3 deal operations UI`).
At the time of this record, `git status --short` shows:

- Modified, uncommitted: `src/app/contract/invite/[token]/invite-accept.tsx`,
  `src/app/layout.tsx`, `src/app/prototype-views.tsx`, `src/app/prototype.css`,
  `src/lib/db/deals.integration.test.ts`, `src/lib/db/profiles.integration.test.ts`,
  `vitest.integration.config.ts`.
- Untracked: `.agents/` (Clerk skill bundle), `.freebuff/`,
  `docs/EMERGENT-CONTEST-HANDOFF.md` (a prior handoff snapshot for a possible
  Emergent handoff — verify its E1–E8 status table against this record before
  trusting it; it understated what was already done as of this write),
  `public/handsel-mark.png`, `skills-lock.json`, `src/app/landing-auth.tsx`,
  `src/app/sign-up/`.
- The auto-approve cron slice in this record (`src/app/api/cron/milestones/auto-approve/`,
  the `runAutoApproveSweep` addition to `src/lib/db/milestones.ts`, `vercel.json`) is
  also currently uncommitted — it is verified (tests + typecheck + build + live
  HTTP proof against the dev DB) but awaiting the owner's local-commit approval
  per the operating skill's commit policy.

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

### Missing-UI guideline verification evidence (2026-07-17)

- A1: party-scoped `deal_events` reader and bilingual Activity timeline now replace
  the static deal-hub event text and appear on the contract screen too.
- B1: brand-only sales-report POST with zod boundary validation, integer minor-unit
  input, transaction-coupled `SALES_REPORT_SUBMITTED` and `LATE_DISPUTE_TRIGGERED`
  events, plus S07 live rev-share preview and shared history for both parties.
- A2/A3/A5: dashboard action-required list/cards, S07 Overview/Milestones/Sales
  tabs, real deal `StateBadge`, shared client `ClockChip`, and loading/error states.
- A4/B2/B3/A6: milestone seven-day clock, frozen/reject-with-reason flow, term-sheet
  expiry/stale-version CTA, contract countdown/version history/revision warning, and
  bilingual language links on deal and contract surfaces.
- Verification: `npm test` **25 files / 138 tests passed**; `npm run typecheck`
  passed; `npm run build` passed; `git diff --check` passed. Graphify refresh was
  attempted but the local watcher returned `Operation not permitted`; no graph files
  were changed. Authenticated browser/DB proof for the new sales report was not run.

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
- Brand side (second Clerk identity) then signed in and saw an **Approve
  deliverable** button that the creator never saw; approving → `APPROVED` with
  `approved_at` set and a `MILESTONE_APPROVED` event whose actor is the brand.
  The full deliver→approve pair is now `MILESTONE_DELIVERED` (creator) →
  `MILESTONE_APPROVED` (brand) — two distinct identities, append-only.
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

Start **E8 (Vertex AI Gemini Settlement Agent)** — the contest's mandatory
Gemini call and the AI-native centrepiece — before E4 Stripe. First slice:
contract → settlement-rules extraction. `agent_runs` persistence and
zod-validated structured output reconciled against `computeRevShare()` are
required from the first slice: Gemini proposes, the pure function decides, and
the reconciled decision is appended to `deal_events`. No money may move on
agent output that has not been reconciled against the deterministic function.
Needs Vertex AI credentials in env (not yet configured — external blocker).
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
