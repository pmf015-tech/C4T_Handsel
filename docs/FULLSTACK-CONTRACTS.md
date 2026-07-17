# Handsel full-stack contracts

> Stage 1 output for `melvin-codex-workflow`, 2026-07-15.
> This document maps the finished clickable prototype to real server, data, and
> external-service boundaries. It does not approve a build slice or replace the
> authoritative product documents.

## Authority and conflict resolution

Implementation must read these sources in this order:

1. `CLAUDE.md`
2. `spec-handsel-mvp.md`
3. `ui-ux-spec.md`
4. `docs/ARCHITECTURE.md`
5. This contract map

Known conflicts are resolved as follows:

- During the hackathon window, `CLAUDE.md` overrides the older Dropbox Sign
  assumption. E2 uses click-sign, a content hash, and an email receipt. Dropbox
  Sign remains blocked by G2 and resumes after the contest.
- `ui-ux-spec.md` says "14 screens" but defines S01 through S15. Treat S15 as
  the AI Agent view inside S07. A global Agent navigation item may deep-link to
  that tab; it is not a second independent screen.
- The prototype's inline bilingual ternaries are a visual reference only. Real
  routes use one shared typed i18n dictionary as required by the build prompt.

## Repository evidence

The current product is a runnable client-only prototype:

- `src/app/page.tsx` renders `HandselPrototype` at `/`.
- `src/app/prototype.tsx` owns screen navigation and all product state with
  React `useState`.
- Forms and actions in `prototype-views.tsx` mutate local booleans or navigate
  to another in-memory screen.
- There are no App Router route handlers, server actions, `src/lib` adapters,
  SQL migrations, Clerk integration, Postgres client, Stripe SDK, Vertex AI
  client, or real Playwright project yet.
- `src/domain/deal/types.ts` contains only locked state and clock types; the
  state machine, money math, and event model are not implemented.

The prototype remains available as a visual oracle while real routes replace it
one route at a time.

## Dependency boundary

All real code follows one direction:

```text
src/app  ->  src/lib  ->  src/domain
```

- `src/app`: pages, layouts, route handlers, cron handlers, UI state.
- `src/lib`: Clerk, Postgres, Stripe, Vertex AI, email, PDF, and storage I/O.
- `src/domain`: pure TypeScript state transitions, money math, event contracts,
  visibility rules, and clock rules. No framework or I/O imports.

Server-rendered reads may call scoped repositories in `src/lib` directly.
Browser mutations cross a route-handler boundary, are parsed by zod, authorize
the actor server-side, call domain logic, and then persist. External webhooks and
cron jobs always enter through route handlers.

## Real route map

| Screen              | Real route                                 | Read boundary                                  | Mutation boundary                          |
| ------------------- | ------------------------------------------ | ---------------------------------------------- | ------------------------------------------ |
| S01 Landing         | `/`                                        | Public static content                          | Demo/lead form is separate from deal data  |
| S02 Auth/onboarding | Clerk sign-in/up + `/onboarding`           | Clerk session and current profile              | `POST /api/onboarding/profile`             |
| S03 Dashboard       | `/dashboard`                               | Party-scoped deal/action projection            | None; links to action routes               |
| S04 Builder         | `/deals/new`, `/deals/[dealId]/edit`       | Party-scoped draft                             | Create/save/version endpoints              |
| S05 Term sheet      | `/s/[shareToken]`                          | Capability-scoped shared version               | Accept or request-changes endpoint         |
| S06 Contract        | `/deals/[dealId]/contract`                 | Party-scoped active version and signatures     | Click-sign or request-revision endpoint    |
| S07 Deal hub        | `/deals/[dealId]`                          | Party-scoped deal projection and event log     | Tab actions delegate to child endpoints    |
| S08 Milestone       | `/deals/[dealId]/milestones/[milestoneId]` | Party-scoped milestone/evidence                | Deliver, approve, reject, retry endpoints  |
| S09 Sales report    | `/deals/[dealId]/reports/[period]`         | Party-scoped report/reconciliation             | Submit, acknowledge, flag endpoints        |
| S10 Payouts         | `/deals/[dealId]/payouts`                  | Party-scoped payout projection                 | Stripe onboarding/retry/export endpoints   |
| S11 Dispute         | `/deals/[dealId]/dispute`                  | Party-scoped dispute/evidence                  | Open, respond, propose, accept endpoints   |
| S12 Public profile  | `/profiles/[slug]`                         | Public projection only                         | Owner visibility toggle stays in S13       |
| S13 Settings        | `/settings`                                | Current profile and scoped visibility settings | Profile, language, visibility mutations    |
| S14 Admin           | `/admin`                                   | Admin-only ops projections                     | Rule-bound retry/resolve/execute endpoints |
| S15 Agent           | `/deals/[dealId]?tab=agent`                | Party-scoped agent events and pending review   | Confirm/correct/rerun endpoints            |

An unauthorized private-deal lookup returns 404 at the repository boundary. A
middleware check may improve UX but never replaces the scoped query.

## Shared request and failure contract

Every browser mutation follows this sequence:

```text
browser input
  -> route-handler zod parse
  -> Clerk identity
  -> data-layer actor/deal scoping
  -> pure domain decision
  -> transaction and append-only deal event
  -> bilingual response envelope
  -> populated/error UI state
```

Minimum response behavior:

- `400`: malformed input with field-level bilingual errors.
- `404`: missing resource or actor is not a party; never reveal existence.
- `409`: stale version, invalid transition, duplicate/replayed operation, or
  other state conflict.
- `500`: safe generic bilingual message plus an internal correlation ID; no
  secret, SQL, provider payload, or personal data in the response.

Every screen must explicitly render populated, empty, loading, and error states.
Every active lifecycle clock is returned as an absolute deadline and rendered as
a visible countdown chip. The browser never decides expiry or money outcomes.

## E6 auth and profile contract: first implementation slice

E6 is the dependency-safe first slice from both the spec and architecture.

### Browser input

```ts
type OnboardingInput =
  | {
      role: "creator";
      displayName: string;
      niche: string;
      followerCount: number;
      engagementRateBasisPoints: number;
      socials: string[];
      preferredLanguage: "en" | "zh-Hant";
    }
  | {
      role: "brand";
      displayName: string;
      productCategory: string;
      website: string;
      preferredLanguage: "en" | "zh-Hant";
    };
```

Engagement rate crosses the boundary as integer basis points, not a floating
percentage. Clerk owns credentials and sessions; Handsel never receives or
stores passwords.

### Server outcome

- Parse the role-specific payload with zod.
- Read the authenticated Clerk user ID on the server.
- Upsert one Handsel profile for that Clerk identity without accepting a user
  ID from the browser.
- Return the safe profile projection used by S02/S03.
- Reject unauthenticated requests, malformed fields, role-shape mismatches, and
  attempts to write another user's profile.

### Minimum persisted fields

- Internal profile ID
- Clerk user ID, unique
- Active role: creator or brand
- Display name
- Preferred language
- Role-specific public profile fields
- Created and updated timestamps

Profile edits are ordinary profile records, not deal state transitions, so they
do not write `deal_events`. Any later role switch that changes permissions must
be audited separately.

## E1 builder and term-sheet contract

E1 starts only after E6 and the initial schema are working.

### Mutations

- Create draft: authenticated actor becomes the first deal party.
- Save draft: validate the current wizard step server-side; invalid input does
  not persist.
- Generate/share: validate the complete E1 payload, create immutable version
  `n`, compute its content hash, append the version-created event, and issue a
  high-entropy share token.
- Revise: create version `n+1`; never mutate a shared version.
- Accept/request changes: capability viewers may read, but must authenticate
  before mutating; stale versions return 409.

### Boundary rules

- Follower count is an integer from 0 to 500,000,000.
- Revenue share is stored as integer basis points from 1 to 9,500.
- All amounts are positive integer minor units.
- A deal has one locked supported currency and 1 to 20 milestones.
- Duplicate milestone titles, unsupported currencies, script input, and all
  invalid classes named in E1 are rejected before persistence.

## Data ownership map

The Stage 3 plan must turn these ownership boundaries into a migration and
repository API:

| Data                          | Owner                 | Write rule                                                |
| ----------------------------- | --------------------- | --------------------------------------------------------- |
| Profiles                      | E6                    | Current Clerk identity only                               |
| Deals/current projection      | E1+                   | Updated only in the same transaction as its event         |
| Deal parties                  | E1                    | Used by every private repository query                    |
| Deal/contract versions        | E1/E2                 | Immutable rows; revisions insert a new version            |
| Deal events                   | All trust-core slices | INSERT/SELECT only for the app role                       |
| Milestones/reports/disputes   | E3                    | Money columns are bigint minor units                      |
| Stripe operations/webhook IDs | E4                    | Intent before provider call; replay-safe settled event    |
| Agent runs/decisions          | E8                    | Structured output plus validation result logged as events |
| Public deal projection        | E5                    | Only fields classified public by the visibility table     |

## External-service boundaries

- Clerk: authentication only. Authorization remains in Handsel repositories.
- Postgres/Neon: source of truth for profiles, projections, immutable versions,
  events, and provider-operation dedupe records.
- Vertex AI Gemini: accepts only the minimum contract/report content needed for
  the task. Output is zod-validated and checked by deterministic domain code
  before any persisted decision or money action.
- Stripe Payment Links: contest report revenue; webhook signature verified and
  event IDs deduplicated.
- Stripe Connect Express: test-mode escrow until approval; money operations use
  intent and settled events around each provider call.
- Email/PDF/evidence storage: adapters in `src/lib`; providers are not yet
  selected and cannot be scaffolded speculatively.

## Unresolved decisions for Stage 3 planning

These decisions materially affect contracts and must be resolved in the local
approved plan before their slice starts:

1. Postgres driver, migration runner, and local integration-test database.
2. Clerk profile synchronization: webhook-created profile versus first-session
   creation, including replay and deleted-user handling.
3. Share-token generation, at-rest hashing, rotation, expiry, and revocation.
4. Evidence-file storage provider, size/type limits, malware handling, and
   signed-download lifetime before E3.
5. PDF generation method for term sheets, contracts, and settlement statements.
6. Email provider and idempotent delivery receipt model.
7. Vertex AI project, region, model ID, service-account path, data retention,
   and production-call evidence policy.
8. Stripe test accounts, webhook endpoint ownership, Connect approval status,
   and Payment Link product/price ownership.
9. Cron authentication, trusted clock source, retry policy, and idempotency keys.
10. GitHub repository, CI, Vercel project, and protected environment ownership.

## External gates and non-code blockers

- G2 lawyer review still blocks production legal reliance on E2. The contest
  click-sign flow is demo-oriented and must be labelled accordingly.
- G3 Stripe KYC/Connect approval blocks live escrow, not the test-mode flow or
  paid settlement reports.
- Two committed creator-brand pairs remain the gate before E4 implementation.
- At least one production Vertex AI Gemini call is mandatory for the contest;
  local fixtures do not satisfy this rule.

## Stage 1 exit checklist

- Product intent and UI contract are identified.
- Every prototype screen has a real route and read/mutation boundary.
- Validation, authentication, authorization, event, money, and failure rules
  are explicit.
- The first dependency-safe slice is E6 auth/profile.
- Decisions that cannot be inferred safely are listed instead of silently
  chosen.
