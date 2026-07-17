# Handsel backend implementation plan

> Stage 3 decision record, approved for local execution by the founder on
> 2026-07-16. Authority remains `CLAUDE.md` → `spec-handsel-mvp.md` →
> `ui-ux-spec.md` → `docs/ARCHITECTURE.md`.

## Delivery strategy

Replace the prototype one vertical slice at a time while keeping `/prototype`
as the visual reference. Each slice must connect its real screen to a validated
server boundary and Postgres, then pass unit, integration, browser, security,
typecheck, and build gates before the next slice starts.

## Locked implementation decisions

| Concern          | Decision                                                    | Constraint                                                   |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Postgres access  | `postgres` driver with explicit repository SQL              | All private reads include party or owner scope in the query  |
| Migrations       | Forward-only numbered SQL plus a small migration runner     | Applied migration files are immutable                        |
| Local database   | PostgreSQL 16 Docker container                              | Production uses `DATABASE_URL` from Vercel/Neon              |
| Authentication   | Clerk App Router integration                                | Clerk owns credentials; Handsel owns authorization           |
| Profile creation | First authenticated onboarding submission                   | Browser never supplies a Clerk user ID                       |
| Share links      | 32 random bytes; store SHA-256 hash only                    | 14-day expiry, revocable, read-only until authentication     |
| Evidence files   | Vercel Blob, introduced with E3                             | MIME, size, and signed-read limits enforced server-side      |
| Documents        | Deterministic HTML first; PDF adapter added to E1 export    | The content hash is computed from canonical structured data  |
| Email            | Resend adapter introduced with E2                           | Idempotency receipt persisted before retry                   |
| Gemini           | Current official Vertex AI Node SDK after docs verification | Structured output parsed with zod and checked by domain math |
| Stripe           | Official Stripe Node SDK                                    | Webhook signatures and provider event IDs are mandatory      |
| Scheduled work   | Vercel Cron route protected by `CRON_SECRET`                | Every job is idempotent against persisted operation keys     |
| CI/deployment    | Local GitHub Actions workflow; deployment remains external  | Push, hosted DB changes, and Vercel changes need approval    |

## Data model

The initial migration creates:

- `profiles`: one row per Clerk identity, including active role and safe profile
  fields.
- `deals`: current projection, currency, next actor, and current immutable
  version number.
- `deal_parties`: creator/brand membership used by every private deal query.
- `deal_versions`: immutable canonical term-sheet snapshots and content hashes.
- `deal_events`: append-only audit facts; the app role receives no update/delete
  path.
- `share_tokens`: hashed capability tokens with expiry and revocation time.
- `milestones`, `sales_reports`, `disputes`: E3 projections with bigint minor
  units.
- `provider_operations`, `webhook_events`: idempotency and intent/settled state.
- `agent_runs`: structured Gemini inputs/outputs and validation result; user-facing
  decisions are also appended to `deal_events`.

Projection updates and their corresponding `deal_events` insert occur in one
database transaction. Provider calls are outside that transaction but are
surrounded by persisted intent and settled/failed events.

## Slice order and observable outcomes

1. **E6 profile onboarding**: authenticate with Clerk, save a creator or brand
   profile, then land on a real empty dashboard.
2. **E1 deal builder**: create a draft, validate all terms, share immutable v1,
   and open the unauthenticated term-sheet URL.
3. **E2 click-sign**: accept terms, sign the current content hash, and reset both
   signatures when a revision creates v2.
4. **E3 settlement core**: deliver/approve a milestone, submit sales, calculate
   banker's-rounded revenue share, and freeze on dispute rules.
5. **E8 agent**: extract settlement rules and reconcile CSV through Vertex AI;
   show validated decisions in S15.
6. **E4 payments**: sell a settlement report through Payment Links, then run
   Connect funding/release in Stripe test mode with intent/settled events.
7. **E5/E7 minimum**: public-safe history projection and rule-bound operations
   queue.

## Test and security gates

- Domain changes start with a failing Vitest and maintain at least 80% branch,
  function, line, and statement coverage.
- Repository integration tests run against real PostgreSQL and prove append-only
  events, transactionality, malformed input, 404 tenant isolation, replay, and
  conflict behavior.
- Eight Playwright journeys cover the acceptance paths from the spec. Stripe E2E
  uses test mode and never mocks the Stripe API.
- Route handlers parse untrusted payloads with zod. Safe error envelopes expose no
  SQL, provider payload, secret, or resource-existence signal.
- Production startup fails closed when required credentials are absent. Local
  tests inject narrow fakes only at external provider seams.

## Known external blockers

No Clerk, Neon/Postgres, Stripe, or Google Cloud credentials are configured in
the repository environment today. Local database and pure-domain work can proceed;
real Clerk, Stripe, and Vertex browser journeys require their corresponding keys.
G2 still limits click-sign to contest/demo use. G3 and two committed pilot pairs
still gate live Connect escrow.
