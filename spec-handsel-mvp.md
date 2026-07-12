# SPEC: Handsel MVP — Deal-to-Payout Platform (Epic)

> Status: CONFIRMED by founder 2026-07-11 (S5) — ready for /plan-eng-review
> Source: design doc `~/.gstack/projects/C4T_Handsel/melvin-main-design-20260710-225226.md` (APPROVED),
> CLAUDE.md, proposal.md, CEO review 2026-07-10 (HOLD SCOPE, 7 must-deliverables), founder
> decisions S1–S4 (2026-07-11).
> Interview program waived by founder 2026-07-11 — product defaults below are founder-ratified
> reviewer defaults, not user-research findings.

## Context

Creator × brand product-line partnerships collapse because deal infrastructure doesn't
exist (72% payment disputes, 34% written contracts — InfluenceFlow 2026). Handsel is the
deal-to-payout layer: structured terms → e-signed contract → tracked milestones →
gated payouts → verifiable deal history. TW/HK market, bilingual 中文/English.
Stack: Next.js (App Router) + TypeScript on Vercel, Postgres, Stripe Connect (Express),
vetted e-sign provider. Money in integer minor units. All deal/contract/payout state
changes are append-only events.

## Current State

Greenfield. Repo contains only CLAUDE.md, proposal.md, TODOS.md, spec docs. No git init
yet (Gate G0). Verified 2026-07-11.

## Pre-Build Gates

| Gate | What | Blocks |
|------|------|--------|
| G0 | `git init` + GitHub repo + Vercel project connection | everything |
| G1 | Stripe entity spike (1 day): TW/HK availability for the operating entity, supported payout currencies, **fund-holding window limits vs deal durations** (Reviewer Concern OV-1) | E4 architecture assumptions |
| G2 | Lawyer consult (hours): e-sign enforceability in TW + HK for cross-border B2B contracts | E2 implementation |
| G3 | Stripe account setup + KYC (long lead time — start immediately, exempt from build gates) | E4 go-live |

## Core Domain Model

### Deal state machine (single source of truth — TDD, 80%+ coverage mandatory)

```
 DRAFT ──edit/redline──▶ NEGOTIATING ──both-signed──▶ SIGNED ──funded──▶ ACTIVE
   │                        │    ▲                       │                  │
   ▼                        ▼    │ (any edit resets      ▼          ┌───────┼─────────┐
 CANCELLED              CANCELLED│  signatures,       CANCELLED     ▼       ▼         ▼
 (by creator)           (either) │  new version)      (funding   MILESTONE DISPUTED  CANCELLED
                                 │                     window      _MET      │        (per contract
                                 └── offer expiry 14d  expired)     │        │         default terms)
                                     signing window 14d             ▼        ▼
                                                              PAYOUT_    14d structured
                                                              RELEASED  response window
                                                                 │        │
                                                          (loop per   RESOLVED ──▶ ACTIVE
                                                           milestone)    │ or
                                                                 ▼       ▼ default-terms
                                                             COMPLETED  execution
```

Invalid transitions are rejected at the domain layer and logged. Every transition is an
append-only event: `deal_events(id, deal_id, actor_id, event_type, payload_jsonb,
content_hash, created_at)` — no UPDATE/DELETE on this table, ever.

### Money-flow model (founder kept escrow primitive; hybrid shape)

- **Milestone minimums (prefund-window escrow — eng decision 1A, 2026-07-12):** each
  milestone carries a fixed amount in the deal currency. Far-future milestones lock the
  brand's commitment (saved payment method + signed contract), not cash. **Prefund fires
  30 days before the milestone due date**: brand is charged, funds held on the platform
  account (Stripe separate charges & transfers), released to creator on approval or
  7-day auto-approval. Rationale: Stripe holds funds for a maximum of ~90 days
  (docs-verified, resolves G1/OV-1), so hold windows must stay short; 30-day lead keeps
  the "money is already in place" trust signal without ever approaching the limit.
  Declined prefund → milestone enters FUNDING_FAILED (retry UI, both parties notified).
- **Revenue share (post-report settlement):** brand submits monthly sales report (7-day
  grace); platform computes rev-share amount from contract terms; brand is charged; funds
  transferred to creator. Late 2 consecutive periods → auto-dispute.
- **Single currency per deal**, chosen at creation, locked for terms/reconciliation/payout.
- **Webhooks:** all Stripe webhooks idempotent (event-id dedupe table); nightly
  reconciliation job compares Stripe balance transactions vs local event log; any
  mismatch → alert + admin queue.

### Lifecycle clocks (S1, founder-ratified)

| Clock | Duration | On expiry |
|-------|----------|-----------|
| Term sheet offer | 14 days | offer → EXPIRED, both notified |
| Signing window (after first signature) | 14 days | unsigned party deemed declined; deal → CANCELLED |
| Sales report | monthly + 7-day grace | auto-flag late + notify both; 2 consecutive late → auto-dispute |
| Milestone review (brand approval of deliverable) | 7 days | auto-approve + payout release |

### Visibility model (S2, founder-ratified)

| Field | Class |
|-------|-------|
| deal existence, party identities, product category, status, milestone count completed, mutual ratings | public (default on; either party may opt the whole deal private) |
| revenue-share %, amounts, sales data, contract text, dispute details | parties-only, permanently |
| admin/audit events | internal |

Every query is deal-party scoped by default (IDOR defense); public profile pages read a
separate projection containing only `public`-class fields.

### Dispute flow (S3, founder-ratified — platform never exercises discretion)

1. Either party opens dispute → related milestone payouts freeze (event logged).
2. 14-day structured negotiation: platform provides response forms + evidence upload.
3. Unresolved → execute the contract's pre-signed default clause (mandatory choice at
   signing): (a) refund brand, (b) split by delivered proportion, (c) external mediation.
4. Founder/admin role can only: nudge, extend clock by mutual consent, execute the
   pre-signed clause. No discretionary fund movement.

## Child Specs

| # | Title | Priority | Effort (human/CC) | Depends on |
|---|-------|----------|-------------------|------------|
| E1 | Deal builder + bilingual term sheet | P1 | ~1wk / ~1-2d | G0 |
| E2 | Contract + e-sign + redline versioning | P1 | ~1.5wk / ~2-3d | E1, G2 |
| E3 | Milestones + sales reconciliation | P1 | ~1wk / ~2d | E2 |
| E4 | Payout engine (Stripe Connect Express) | P1 | ~1.5wk / ~3d | E3, G1, G3, ≥2 committed creators |
| E5 | Deal history + public profiles | P2 | ~3d / ~1d | E3 |
| E6 | Auth + org model (creator/brand accounts) | P1 | ~3d / ~1d | G0; provider per eng-review |
| E7 | Admin ops + alerts (money-flow alerts, retry, dispute console) | P1 | ~4d / ~1d | E4 |

```
G0 ──▶ E6 ──▶ E1 ──▶ E2 ──▶ E3 ──┬─▶ E4 ──▶ E7
      (auth)        ▲            └─▶ E5
G2 ────────────────┘ (lawyer gate before E2)
G1, G3 ─────────────────────────────▶ E4
```

Sequencing rationale: E1 doubles as the demo artifact; E2 needs legal clearance; E4 is
gated on external commitment (build-phase criterion) and carries the most irreversible
risk, so it goes last before ops tooling.

### E1: Deal builder + term sheet

- Creator inputs: follower count, niche, engagement rate, deliverables offered.
- Brand inputs: rev-share %, projected revenue, milestone list (title, amount, due),
  deal currency (locked), dispute default clause (mandatory choice).
- Output: standardized bilingual (中文/EN) term sheet, print-quality page + PDF export,
  shareable read-only link (unauthenticated view allowed for counterparty invite).
- Validation (server-side, fail loud): follower count 0–500M int; rev-share 0.01%–95%;
  amounts positive int minor units; milestones 1–20; all boundary cases rejected with
  field-level bilingual messages.

Acceptance criteria:
1. A deal created with valid inputs renders a bilingual term sheet at a shareable URL
   within 2s (p95, Vercel prod).
2. All 12 invalid-input classes (nil, empty, negative, >max, wrong type, >100%, 0
   milestones, 21 milestones, duplicate milestone titles, unsupported currency,
   script-injection strings, 47-char names) are rejected server-side with specific
   messages; nothing persists.
3. Term sheet content is immutable once shared: any edit creates version n+1 with a new
   content hash; the URL shows latest version + version history.
4. E2E (Playwright): create → share → counterparty view passes on Chrome/Firefox/Safari.

### E2: Contract + e-sign + redline

- Contract generated from term sheet version; signature binds to content hash.
- Any modification → new version, all signatures reset, both parties notified.
- Single active version; no parallel drafts.
- E-sign provider selected at eng-review (requirements: API-embeddable, audit trail,
  TW/HK legal validity per G2, bilingual UI).
- Clocks: offer expiry + signing window per S1.

Acceptance criteria:
1. Signing a stale version (content hash mismatch) is impossible — server rejects with
   409 and surfaces "terms changed, review v(n+1)".
2. A fully signed contract's PDF + hash + event trail can be exported by either party.
3. Redline loop: 5 alternating edits produce exactly 5 versions, each signature reset
   event logged; no orphan signatures.
4. Expiry clocks fire within 5 minutes of deadline (cron/queue) and are idempotent.

### E3: Milestones + reconciliation

- Deliverables checklist per milestone; creator marks delivered (evidence upload);
  brand approves or 7-day auto-approve.
- Monthly sales report form (brand): units, gross revenue in deal currency, optional
  evidence. Computed rev-share preview shown before submission.
- Late handling per S1. Dispute flags per S3.

Acceptance criteria:
1. Rev-share computation is a pure function with property-based tests: for all valid
   (gross, %) pairs, output in minor units, no floats anywhere, rounding = banker's,
   creator+brand shares sum exactly to gross share pool.
2. Auto-approve fires exactly once per milestone (idempotent under duplicate cron runs).
3. Two consecutive late reports open a dispute automatically and freeze the next payout.

### E4: Payout engine

- Stripe Connect Express onboarding for both parties (creator = payout recipient;
  brand = customer with saved payment method).
- Milestone funding + release per money-flow model; rev-share settlement charges.
- Failure handling (CEO review Finding 3): named error classes — `StripeChargeDeclined`,
  `TransferFailed`, `WebhookLost` (reconciliation catch), `FundingWindowExceeded` —
  each with retry policy (3x exponential), both-party notification, and admin-queue
  fallback. No catch-all handlers. Zero silent failures.
- Payout release recorded as event BEFORE Stripe call (intent) and AFTER confirmation
  (settled); mismatch after 24h → alert.

Acceptance criteria:
1. E2E on Stripe test mode (no mocks): fund milestone → approve → payout lands in test
   creator account; every step visible in deal event log.
2. Kill the webhook endpoint during a payout: reconciliation job detects and repairs
   state within one cycle; alert fired; no double-transfer (idempotency proven by test).
3. A declined funding charge leaves the milestone in FUNDING_FAILED with retry UI for
   brand; creator notified; no state corruption.
4. Admin can retry/mark-resolved any failed money operation; action is event-logged.

### E5: Deal history + public profiles

- Public projection per S2 visibility table; profile page per user with completed-deal
  track record; either party can opt a deal private.

Acceptance criteria:
1. Public page contains ONLY public-class fields (verified by test asserting the
   projection schema, not the UI).
2. User A cannot read any parties-only field of a deal they're not in — direct API
   probing returns 404 (not 403, no existence leak) for private deals.

### E6: Auth + accounts

Provider decision deferred to /plan-eng-review per CLAUDE.md (no custom password
storage). Requirements: email + OAuth, org-style brand accounts with multiple members
(phase 2 — MVP is 1 user per side), bilingual, session security defaults.

### E7: Admin ops + alerts

Money-flow failure alerts (email at MVP), admin console: failed-operation queue,
retry/mark-resolved (event-logged), dispute console (execute pre-signed clause only),
audit log viewer. No hand-edited DB — enforced by review + no write credentials outside
the app path.

## Testing Plan (trust core = TDD mandatory, 80%+)

| Layer | What | Count (est.) |
|-------|------|--------------|
| Unit (TDD) | state machine transitions incl. all invalid ones; rev-share pure function (property-based); clock expiry logic; visibility projection | ~120 |
| Integration | event log append-only enforcement; webhook idempotency; reconciliation repair; IDOR probes | ~40 |
| E2E (Playwright, Stripe test mode) | create → sign → milestone → payout critical path; dispute freeze path; redline reset path | ~8 journeys |

## Success Metrics (from design doc, build-phase + post-launch)

- ≥2 creators committed before E4 implementation starts (build gate).
- First external deal within 4 weeks of build completion, else return to CEO review.
- 10 deals in 90 days post-launch; ≥1 milestone payout released; repeat-deal rate tracked.

## Out of Scope

- Matchmaking/discovery, equity issuance (recorded as contract clauses only),
  Shopify/momo/蝦皮 integrations, native mobile, multi-currency settlement,
  multi-member org accounts.

## Rollback Strategy

- Event-sourced core: state is replayable; bad deploy → revert + replay projections.
- Stripe operations are the non-revertible edge: intent/settled dual events + admin
  queue are the compensating controls. Feature flag on E4 payout release (manual-confirm
  mode first week).

## Effort Estimate

Human ~6-7 weeks total / CC-accelerated ~10-14 working days, sequenced E6→E1→E2→E3→E4/E5→E7,
plus G1-G3 calendar time (start G3 immediately).

## Files Reference (proposed structure — greenfield)

| Path | Purpose |
|------|---------|
| `src/domain/deal/stateMachine.ts` | deal state machine (TDD first) |
| `src/domain/money/revShare.ts` | pure rev-share computation |
| `src/domain/events/` | append-only event log write model |
| `src/app/(deal)/...` | deal builder, contract, milestone UI routes |
| `src/lib/stripe/` | Connect wrappers, webhook handlers, reconciliation job |
| `db/migrations/` | Postgres schema (deals, deal_events, milestones, reports, disputes, webhook_events) |
| `e2e/` | Playwright journeys |

## Related

- Design doc (APPROVED): `~/.gstack/projects/C4T_Handsel/melvin-main-design-20260710-225226.md`
- TODOS.md: trademark clearance (P1, pre-launch)
- Reviewer Concern OV-1 (escrow holding window) → G1 verification
