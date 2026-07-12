# Handsel — Architecture

> Companion to [spec-handsel-mvp.md](../spec-handsel-mvp.md) (WHAT to build).
> This file is HOW the codebase is organised so it stays maintainable. Read this
> before adding any new module.

## System overview

```
 Browser (creator / brand / admin)
        │
        ▼
 ┌─────────────────────────────── Vercel ───────────────────────────────┐
 │  Next.js App Router (src/app)                                        │
 │   ├── UI routes (deal builder, contract, milestones, profile, admin) │
 │   ├── Route handlers /api/* (validation boundary — zod)              │
 │   └── Cron routes (clock expiry, reconciliation) ◀── Vercel Cron     │
 │              │                                                       │
 │              ▼                                                       │
 │  src/domain  ← pure business rules, NO framework/I-O imports         │
 │   ├── deal/stateMachine   (every legal transition; TDD 80%+)         │
 │   ├── money/revShare      (pure fn, minor units, banker's rounding)  │
 │   └── events/             (append-only event write model)            │
 │              │                                                       │
 │              ▼                                                       │
 │  src/lib     ← adapters: talk to the outside world                   │
 │   ├── db/       Postgres (Vercel Marketplace provider)               │
 │   ├── stripe/   Connect Express, webhooks, reconciliation            │
 │   ├── esign/    Dropbox Sign API (pending G2 lawyer gate)            │
 │   └── auth/     Clerk (authN); authZ = deal-party scoping in db/     │
 └──────────────────────────────────────────────────────────────────────┘
        │                    │                     │
        ▼                    ▼                     ▼
    Postgres            Stripe Connect        Dropbox Sign
```

## The one dependency rule

```
src/app ──▶ src/lib ──▶ src/domain          (arrows point at what may be imported)
```

- `src/domain` imports **nothing** from `app` or `lib`. Pure TS. This is what makes
  the trust core (state machine, payout math) fully unit-testable.
- `src/lib` may import `domain` types; never imports from `app`.
- `src/app` orchestrates: parse/validate input → call domain → persist via lib.
- Violating this rule is the #1 thing to reject in review.

## Non-negotiable invariants (from CLAUDE.md — enforced in review)

1. **Money = integer minor units.** No floats anywhere near amounts.
2. **Append-only events.** All deal/contract/payout state changes go through
   `deal_events` (INSERT only — no UPDATE/DELETE). Current state is a projection.
3. **Validate at every boundary.** Route handlers parse with zod before touching
   domain; never trust client input or webhook payloads (verify Stripe signatures).
4. **AuthZ at the data layer.** Every query is deal-party scoped (defends IDOR and
   middleware-bypass CVEs). Public profile pages read a separate projection with
   only public-class fields (founder decision S2).
5. **Stripe money ops record intent-event BEFORE the API call, settled-event after.**
   Webhooks are idempotent (event-id dedupe). Nightly reconciliation repairs drift.

## Money flow (eng decision 1A — Stripe 90-day hold limit)

```
 milestone created ──▶ (waiting) ──▶ due-30d: PREFUND charge ──▶ escrow held
                                          │ declined                 │ approved /
                                          ▼                          ▼ 7d auto-approve
                                    FUNDING_FAILED            TRANSFER to creator
                                    (retry UI + alert)
 rev-share: monthly report ──▶ compute (pure fn) ──▶ charge brand ──▶ transfer creator
```

Far-future milestones lock commitment, not cash — prefund fires 30 days before due,
so held funds never approach Stripe's 90-day limit.

## Directory map

| Path | Owns | Rule of thumb |
|---|---|---|
| `src/app/` | Routes, UI, API handlers, cron endpoints | Thin; no business logic |
| `src/domain/` | Business rules (trust core) | Pure TS; TDD-first |
| `src/lib/` | DB, Stripe, e-sign, auth adapters | All I/O lives here |
| `db/migrations/` | Numbered SQL migrations | Forward-only; never edit an applied one |
| `e2e/` | Playwright journeys (Stripe test mode, no mocks) | Critical path: create→sign→milestone→payout |
| `docs/` | This file + future ADRs | Update diagrams in the same commit as the change |

## Locked technology decisions

| Concern | Choice | Why / status |
|---|---|---|
| Framework | Next.js App Router + TS on Vercel | CLAUDE.md |
| DB | Postgres (Vercel Marketplace) | CLAUDE.md |
| Payments | Stripe Connect **Express** | Founder S4 |
| Money flow | Prefund 30d before due (1A) | Stripe 90-day hold limit (docs-verified) |
| Auth | Clerk | Eng default 2026-07-12; authZ stays in our data layer |
| E-sign | Dropbox Sign API | Working assumption — **gated on G2 lawyer consult** |
| Validation | zod at boundaries | Eng default |
| Tests | vitest (unit/domain) + Playwright (E2E) | CLAUDE.md testing expectations |

## Build order (from spec, with gates)

```
G0 git init ✅ ─▶ E6 auth ─▶ E1 deal builder ─▶ E2 contract(+G2) ─▶ E3 milestones ─┬▶ E4 payouts(+G1,G3, ≥2 creators)
                                                                                   └▶ E5 profiles          └▶ E7 admin
```
