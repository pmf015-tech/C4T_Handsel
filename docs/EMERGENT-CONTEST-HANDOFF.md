# Handsel × Emergent Builder's Contest — Build and Handoff Brief

> Last researched and verified: 2026-07-17 HKT. This document is a handoff aid,
> not a replacement for `CLAUDE.md`, `spec-handsel-mvp.md`,
> `ui-ux-spec.md`, or `docs/ARCHITECTURE.md`.

## Executive decision

Keep Handsel in Codex and Claude Code until **E3 is complete end to end**, then
hand a clean GitHub feature branch to Emergent. Do not transfer the project while
E3 exists only as domain functions.

The E3 handoff gate is satisfied only when a real creator and brand can use the
browser to complete this chain:

1. creator marks a milestone delivered and supplies evidence;
2. brand approves it, or the idempotent seven-day auto-approve job does so once;
3. brand submits a monthly sales report;
4. Handsel computes and displays the exact revenue split in integer minor units;
5. two consecutive late reports open a dispute and freeze the next payout;
6. every transition is an append-only `deal_events` insert and is visible in the
   UI; and
7. the browser result, API response, and PostgreSQL records agree.

At that point Emergent should start with **E8 Settlement Agent**, followed by the
paid settlement-report path, E4 Stripe test-mode flow, and the contest evidence
pack. This division protects the money and state-machine core while giving
Emergent a bounded, visually demonstrable AI feature to accelerate.

## Current repository position

The repository is in **Stage 4 — Building**. The verified build order is E6 → E1
→ E2 → E3 → E8 → E4 → E5/E7.

| Area                | Current status on 2026-07-17                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| E6 auth and profile | Functional with Clerk, server-authenticated onboarding, PostgreSQL profile persistence, and dashboard redirect                                       |
| E1 deal builder     | Functional draft creation, immutable hashed term sheet, append-only event, and 14-day public share link                                              |
| E2 contract         | Two-party content-hash click-sign journey verified; redline edit UI remains deferred                                                                 |
| E3 settlement core  | Rev-share and milestone domain logic are committed; sales lateness domain work exists locally; DB, API, cron, UI, and browser proof are not complete |
| E8 Gemini agent     | Prototype-only visual surfaces; no Vertex AI adapter, persisted run, or production Gemini call                                                       |
| E4 payments         | Not started                                                                                                                                          |
| Production          | Vercel/domain/Clerk work is in progress externally and must be re-verified before submission                                                         |

Latest local verification observed before this handoff document:

- `npm test`: 19 files and 104 tests passed.
- `npm run typecheck`: passed.
- Recent commits include the E3 rev-share and milestone state-machine slices.
- The worktree is intentionally not clean. Never reset it or import an
  uncommitted snapshot into Emergent.

## Languages and locked stack

The primary programming language is **TypeScript**. The web UI uses React through
Next.js; server routes also use TypeScript. SQL is used only for forward-only
PostgreSQL migrations, and CSS is used for presentation.

| Layer          | Locked choice                                                            |
| -------------- | ------------------------------------------------------------------------ |
| Web and server | Next.js 15 App Router, React 19, strict TypeScript                       |
| Hosting        | Vercel                                                                   |
| Database       | PostgreSQL through the existing `postgres` adapter                       |
| Authentication | Clerk for authN; data-layer deal-party scoping for authZ                 |
| Validation     | zod at every server and external boundary                                |
| Payments       | Stripe Payment Links plus Stripe Connect Express                         |
| Required AI    | Gemini through the **Vertex AI SDK only**                                |
| Tests          | Vitest for domain/unit/integration; Playwright for real browser journeys |
| Migrations     | Numbered, forward-only SQL in `db/migrations`                            |

Emergent must not replace PostgreSQL with MongoDB, Next.js with a generated
FastAPI application, Clerk with custom auth, Vertex AI with an Emergent universal
model key, or Vercel with a new production database without an approved architecture
decision. Its generic defaults are not authority for this repository.

## Authority and mandatory read order

Every agent must read these files before editing:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `proposal.md`, especially “Build continuity and handoff”
4. `spec-handsel-mvp.md`
5. `ui-ux-spec.md`
6. `docs/ARCHITECTURE.md`
7. `docs/BACKEND-IMPLEMENTATION-PLAN.md`
8. this document

When documents conflict, `CLAUDE.md` wins and the conflict must be reported rather
than silently resolved.

## Non-negotiable implementation rules

1. Dependency direction is `src/app → src/lib → src/domain`.
2. `src/domain` is pure TypeScript with no framework, database, network, or file I/O.
3. Money is integer minor units everywhere. No floating point near an amount.
4. Every deal, contract, milestone, dispute, agent, and payout state change is an
   append-only `deal_events` insert. Do not update or delete that table.
5. Every private query is scoped to an authenticated deal party at the data layer.
   Unauthorized private deal access returns 404, not 403.
6. Every server input, database result that crosses a trust boundary, webhook, and
   model output is validated with zod.
7. Stripe writes an intent event before the API call and a settled event after it.
   Webhooks are signature-verified and event-ID deduplicated; reconciliation repairs
   drift without double transfers.
8. Gemini proposes; deterministic domain code disposes. Model output never directly
   charges money or changes authoritative settlement math.
9. Every Gemini decision is validated, reconciled against domain rules, persisted to
   `deal_events`, and visible in S15.
10. No secrets, customer data, OTPs, or credentials enter git or an AI prompt.

## What “built successfully” means

A generated screen, a green-looking preview, or code that compiles is not complete.
Each slice is complete only when all applicable checks below pass:

- its `spec-handsel-mvp.md` acceptance criteria are demonstrably satisfied;
- domain logic was developed failing-test first and domain coverage remains at least
  80 percent;
- all boundary inputs have server-side zod validation with bilingual field errors;
- the real UI calls the real API and persists to the intended PostgreSQL environment;
- populated, empty, loading, and error states exist; active clocks use countdown chips;
- creator and brand see role-symmetric pages with only allowed actions enabled;
- the relevant responsive screens work at 390 px;
- event rows prove each state transition and contain no secret model reasoning;
- `npm test`, `npm run typecheck`, and `npm run build` pass;
- the relevant Playwright happy path passes without mocked Stripe;
- `git diff --check` passes and the diff contains no unrelated rewrites;
- a manual browser check confirms browser → API → PostgreSQL → UI consistency; and
- `proposal.md` is updated with evidence, remaining gaps, and the next exact slice.

For an E8 slice, add these gates:

- at least one genuine production Vertex AI Gemini call is evidenced;
- agent input/output uses a versioned zod schema;
- deterministic reconciliation proves any payable amount;
- failure falls back to a clear manual workflow;
- the S15 log shows the run, result, verification status, and human review state; and
- raw chain-of-thought is never stored or displayed. Store concise decision summaries,
  inputs, outputs, validation results, and model metadata only.

## Emergent capability and skills decision

Official Emergent documentation says an existing GitHub repository and branch can be
pulled into a task and saved back. It also documents higher-quality production agents,
GitHub integration, PostgreSQL as an external database, preview/production environment
separation, custom agents/system-prompt editing on qualifying plans, and an Emergent
MCP server for Claude Code and Codex.

However, **Emergent does not automatically execute local Codex or Claude Code
`SKILL.md` files**. There is no official guarantee that importing `.agents/`,
`.codex/skills`, or `.claude/skills` activates those workflows inside an Emergent
agent.

Use one of these supported patterns:

1. Put durable project rules in versioned repository Markdown, as this document does.
2. If the account exposes System Prompt Editing or Custom Agent Creation, paste a
   distilled version of the rules into a Handsel-specific agent.
3. Best option for preserving `melvin-codex-workflow`: run Codex or Claude Code as the
   orchestrator, invoke the local skill there, and connect to Emergent through the
   official MCP. The local agent then creates and monitors bounded Emergent jobs while
   applying the local stage, security, testing, and handoff gates.

Official MCP setup examples:

```bash
claude mcp add --transport http --scope user emergent https://mcp.emergent.sh/
codex mcp add emergent --url https://mcp.emergent.sh/
codex mcp login emergent
```

Authentication and any paid action remain manual owner decisions.

## Agent choice inside Emergent

Emergent's public help pages currently use somewhat inconsistent labels across pages,
so choose by capability shown in the live account rather than relying only on a label.

- For importing and auditing the existing Handsel repository, choose the
  highest-quality, most thorough **production/full-stack** agent available (for
  example E-1 or E-2 when shown).
- For a small, already-specified backend or test slice, a balanced agent such as E-1.1
  is acceptable.
- Use the careful/structured option such as E-1.5 for migration, security, and payment
  review if it is available.
- Do not use Prototype for domain, auth, database, payment, or settlement-agent logic.
  It may be used only for disposable visual exploration.
- Do not use Mobile; Handsel's MVP is a responsive web application.

Start with an audit-only task. A model must prove it understands the repository before
receiving authority to change it.

## Safe GitHub handoff procedure

1. Finish E3 end to end in Codex/Claude Code.
2. Re-run tests, typecheck, build, targeted Playwright, and browser/DB verification.
3. Review the dirty worktree file by file; separate user work and secrets.
4. Update `proposal.md` with exact evidence and unresolved gaps.
5. Make narrow, reviewed commits. Do not bundle unrelated prototype or credential work.
6. Push the verified baseline to GitHub only after the owner approves the external push.
7. Create a dedicated branch such as `contest/emergent`; never let Emergent write
   directly to `main`.
8. In Emergent, start a task, choose **Pull from GitHub**, select the Handsel repository
   and `contest/emergent` branch, and run the audit prompt below.
9. Keep one bounded objective per Emergent task. Pull latest before each task and save
   a checkpoint after each green gate.
10. Review Emergent's diff locally with Codex/Claude Code before merging. Run the full
    local verification loop again.

Do not import the current dirty working tree. GitHub is the exchange boundary.

## Recommended Emergent build sequence

### Phase 0 — Repository audit, no changes

Confirm stack, architecture, current E3 evidence, missing E3 gates, environment needs,
and a surgical file plan. Reject any proposal to rewrite the stack.

### Phase 1 — E8 contract-to-rules vertical slice

Add a Vertex AI adapter in `src/lib/gemini`, a versioned zod output schema, deterministic
rule reconciliation in `src/domain`, append-only agent events, a human confirmation
queue, and the S15 populated/empty/loading/error views. Prove one real Vertex call in
the intended deployed environment.

### Phase 2 — Reconciliation and paid-report wedge

Upload a brand sales CSV, parse and validate it, have Gemini flag semantic discrepancies,
compute money with `src/domain/money`, generate a settlement statement, expose it in S09
and S15, and sell the report through a Stripe Payment Link. The contest revenue story
should not depend on Connect approval.

### Phase 3 — E4 in Stripe test mode

Implement Connect Express onboarding and the minimum fund/approve/release path, intent
and settled events, signed idempotent webhooks, failure classes, and nightly
reconciliation. Do not enable live escrow without platform approval and owner consent.

### Phase 4 — Contest evidence and release

Produce a live Emergent-published build or qualifying deployment, a short golden-path
demo, real user quote/revenue evidence, agent event screenshots, privacy-safe test data,
clear expense disclosure, and a launch/upvote plan. Verify the current deadline and
submission requirements inside the authenticated contest page before scheduling work.

## Contest strategy

The official contest announcement describes a USD 100,000 prize pool and says entrants
should build software that solves a real problem, publish and submit it, then share it
for community upvotes. The public announcement does **not** state a precise deadline or
full judging rubric, so never plan against an unverified date.

Handsel's strongest contest story is not “AI made a dashboard.” It is:

> A creator and a brand turn an informal revenue-share promise into an auditable deal.
> Gemini extracts settlement rules and detects reporting discrepancies, while exact
> deterministic code controls money and every decision is recorded for both parties.

The golden demo should fit in approximately 90 seconds:

1. open a signed deal;
2. show Gemini-extracted rules awaiting human confirmation;
3. upload a deliberately imperfect sales CSV;
4. show the discrepancy, exact reconciled payable amount, and “verified against domain
   math” evidence;
5. open the generated settlement statement and append-only agent log; and
6. show the paid-report or Stripe test-mode settlement evidence.

## Risk register

| Risk                                      | Control                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Emergent rewrites the stack               | Audit-only first task; locked-stack prompt; reject broad scaffolding               |
| Local skills are assumed active           | Keep rules in repo and orchestrate through Codex/Claude plus Emergent MCP          |
| Universal model key replaces Vertex AI    | Require Vertex AI SDK and production-call evidence for E8                          |
| Preview and production use different data | Name every environment; run migrations separately; verify deployed DB records      |
| Branch conflict or lost work              | Dedicated branch, pull latest, one bounded task, checkpoint and local review       |
| Credit burn from repeated debugging       | Small vertical slices, explicit file plan, tests before UI polish                  |
| Secret leakage                            | Environment variables only; redact logs and prompts; never paste `.env`            |
| False “done” from a preview               | Enforce browser/API/DB/event evidence and local quality gates                      |
| Contest deadline assumption               | Manually verify authenticated contest page and record the exact date/time/timezone |

## Copy-paste prompt 1 — Emergent audit only

```text
You are joining an existing production-oriented repository named Handsel 信約. Do not
write code yet. Pull the GitHub branch I selected and perform an evidence-based audit.

Read these files completely and in this order:
AGENTS.md, CLAUDE.md, proposal.md, spec-handsel-mvp.md, ui-ux-spec.md,
docs/ARCHITECTURE.md, docs/BACKEND-IMPLEMENTATION-PLAN.md, and
docs/EMERGENT-CONTEST-HANDOFF.md. If they conflict, CLAUDE.md wins and you must report
the conflict.

Handsel is a creator × brand deal-to-payout web platform. Its locked stack is Next.js
15 App Router + React + strict TypeScript, PostgreSQL, Clerk, zod, Stripe Payment Links
and Connect Express, Vertex AI Gemini, Vitest, and Playwright. Keep the dependency rule
src/app -> src/lib -> src/domain. Do not substitute MongoDB, FastAPI, custom auth,
another LLM gateway, or a new framework.

Current intended stage: E6, E1, and E2 click-sign are working. E3 must be complete end
to end before E8 begins. Verify the repository instead of trusting this summary.

Return only:
1. the exact branch and commit audited;
2. current E1-E8 status with file/test evidence;
3. whether the E3 handoff gate is actually satisfied;
4. architecture or security conflicts found;
5. required environment-variable NAMES only, never values;
6. the smallest proposed next vertical slice and exact files it would touch;
7. tests and browser/database evidence that would prove that slice complete;
8. any assumptions requiring owner approval.

Do not edit files, install packages, change infrastructure, run destructive database
commands, expose secrets, deploy, publish, or submit the contest entry. Wait for
explicit approval after the audit.
```

## Copy-paste prompt 2 — first approved E8 slice

Use this only after E3 passes the handoff gate and the audit is approved.

```text
Implement only the first E8 vertical slice: signed contract/term sheet -> Vertex AI
Gemini structured settlement-rule proposal -> deterministic validation -> human review
in S15 -> append-only deal_events audit record.

Follow all repository authority files and docs/EMERGENT-CONTEST-HANDOFF.md. Use the
Vertex AI SDK only for Gemini. Define a versioned zod schema for model output. Gemini
may propose rules but may not calculate or authorize money, mutate authoritative deal
state directly, or bypass src/domain. Persist concise inputs/outputs, validation status,
model metadata, and a decision summary; never persist chain-of-thought.

Work test-first and keep the diff surgical. Implement populated, empty, loading, error,
and manual-fallback states for the S15 slice, bilingual strings through the existing
i18n dictionary, data-layer deal-party authZ, and unauthorized 404 behavior. Every
agent decision must create an append-only deal_events row.

Before changing files, restate the acceptance checks and exact file plan. Then
implement, run relevant tests, npm test, npm run typecheck, npm run build, and the
relevant Playwright journey. Report browser -> API -> PostgreSQL -> UI evidence and the
production Vertex call evidence. Do not deploy, push, merge, publish, submit, change
credentials, or start E4 without explicit owner approval. If any required credential
or external setup is absent, stop at the safe local boundary and list the manual step.
```

## Official research sources

- [Fabrizio Romano and Emergent launch the Builder's Contest](https://emergent.sh/news/fabrizio-romano-and-emergent-launch-builders-contest)
- [Official contest entry page](https://app.emergent.sh/fabrizio)
- [GitHub integration](https://help.emergent.sh/github-integration)
- [Build your first app and agent choices](https://help.emergent.sh/first-app)
- [Emergent FAQ](https://help.emergent.sh/faqs)
- [Plans and credits](https://help.emergent.sh/plans-and-credits)
- [Platform and deployment documentation](https://help.emergent.sh/platform-documentation)
- [Emergent as MCP](https://help.emergent.sh/emergent-as-mcp)
