# Codex Handoff — Prototype Adjustment + Full Build Spec

Two prompts. Use Prompt A now (prototype tweak for the XPRIZE demo). Use Prompt B
when real implementation starts (W1). Both assume repo root = this project.

---

## PROMPT A — Adjust the clickable prototype (add AI Agent surfaces)

```
You are working in an existing Next.js 15 clickable prototype (NO backend — all
state is React useState toggles). Read these files first and follow their
conventions exactly:

- src/app/prototype.tsx        — router/state container (~45 lines)
- src/app/prototype-views.tsx  — all screen components (Landing, Deal, Contract,
                                 Sales, Milestone, Dispute, Payouts, etc.)
- src/app/prototype-shared.tsx — Badge, Button, Clock, Logo primitives (reuse these)
- src/app/prototype-data.ts    — demo data
- src/app/prototype.css        — all styles (flat design, deep blue #1E3A8A,
                                 amber #D97706, red #DC2626, green #15803D)

Every string is bilingual via the existing pattern:
`const zh = language === "zh-Hant"; {zh ? "中文" : "English"}` — follow it for
ALL new text.

TASK — add three AI surfaces (spec: ui-ux-spec.md §S15). Do NOT redesign
anything else. Surgical diff only.

1. NEW TAB "AI Agent" in the Deal view (prototype-views.tsx, `Deal` component —
   find the `<div className="deal-tabs">` row and add the tab after "Payouts").
   Create a new exported `AgentConsole` view navigable as "agent", rendered in
   the same tabbed position as other deal children. Content:
   - Vertical activity feed of 3 agent cards, newest first:
     a) "Contract parsed — 4 settlement rules extracted ✓" (green check,
        expandable: shows a small dl of the 4 rules: revenue share 18%,
        3 milestones, monthly report + 7-day grace, dispute default = split by
        delivered proportion)
     b) "July sales CSV reconciled — 1 discrepancy flagged ⚠" (amber, expandable:
        "Reported NT$153,000 vs affiliate-tracked NT$161,400 — variance 5.2%;
        suggested action: request clarification")
     c) "Settlement statement #007 generated" (blue, with a fake
        "View statement" secondary Button)
   - Every card shows a small chip: "verified against domain math ✓" and a
     "Gemini" badge (reuse Badge component, tone blue).
   - One pending-review banner on top: "1 extraction awaiting your
     confirmation" with Confirm button that toggles to a success notice
     (useState, same pattern as `approved`/`reportSent` toggles).
2. Contract view (`Contract` component): in the signing-panel aside, add a small
   card ABOVE version history: "Terms extracted by AI — pending your
   confirmation" with a "Review 4 rules" text link that navigates to "agent".
3. Sales view (`Sales` component): under the share-card, add an
   "AI reconciliation" result card: amber border, text "Discrepancy flagged:
   reported revenue is 5.2% below affiliate-tracked estimate", with
   "View in Agent console →" link navigating to "agent".

CSS: add new classes to prototype.css following existing naming (kebab-case,
flat, 1px #E5E7EB borders, 8px spacing grid). Reuse .clock/.badge patterns.

Acceptance (all must pass before you claim done):
- `npm run typecheck` and `npm run build` green.
- New tab reachable from Deal view; back-navigation intact; language toggle
  renders every new string in both zh-Hant and English.
- No changes to any file except prototype-views.tsx, prototype.tsx (nav union
  type + state if needed), prototype.css, prototype-data.ts (optional demo data).
- Diff stays under ~200 lines. No new dependencies.
```

---

## PROMPT B — Build the real Handsel platform (W1–W5)

```
You are building Handsel 信約 — a deal-to-payout platform for creator × brand
partnerships, entering XPRIZE "Build with Gemini" (deadline: submit 2026-08-16).
Authoritative docs IN THIS REPO — read all four before writing any code, they
override anything you assume:

- CLAUDE.md            — constitution, coding rules, hackathon constraints
- spec-handsel-mvp.md  — E1–E8 child specs, gates, acceptance criteria, W1–W5 plan
- ui-ux-spec.md        — S01–S15 screens: purpose/components/actions/states/nav
- docs/ARCHITECTURE.md — layering, invariants, money flow, locked tech decisions

TECH STACK (locked — do not substitute):
- Next.js 15 App Router + TypeScript strict, deployed on Vercel
- Postgres (Vercel Marketplace / Neon), forward-only SQL migrations in db/migrations
- Clerk (authN); authZ = deal-party scoping at the data layer, never middleware-only
- Stripe: Payment Links (paid settlement reports = contest revenue) +
  Connect Express (escrow flow; test mode until platform approval)
- Vertex AI Gemini (MANDATORY for contest): the E8 Settlement Agent —
  contract→settlement-rules extraction, sales CSV reconciliation, statement
  generation, dispute triage. Model calls via Vertex AI SDK only.
- zod at every boundary; vitest (unit/domain); Playwright (E2E, Stripe test mode,
  NO mocked Stripe)
- Existing prototype (src/app/prototype*) is the visual reference for the real
  screens; real screens replace it route by route.

ARCHITECTURE (the one dependency rule — violating it fails review):
  src/app  →  src/lib  →  src/domain
- src/domain: pure TS, ZERO framework/IO imports. Holds deal state machine,
  rev-share math, event types. TDD mandatory here: failing test FIRST, 80%+
  coverage enforced in vitest config.
- src/lib: all IO adapters (db/, stripe/, gemini/, auth/). May import domain.
- src/app: routes, UI, API handlers, cron. Thin — no business logic.

NON-NEGOTIABLE INVARIANTS (from CLAUDE.md):
1. Money = integer minor units everywhere. Floats near amounts = rejected.
2. Every deal/contract/payout state change is an append-only INSERT into
   deal_events. No UPDATE/DELETE on that table. Current state = projection.
3. Stripe money ops: write intent event BEFORE the API call, settled event
   after; idempotent webhooks (event-id dedupe); nightly reconciliation.
4. Gemini proposes, deterministic code disposes: agent output is ALWAYS
   validated (zod) and reconciled against src/domain/money math before any
   charge. Every agent decision is logged to deal_events.
5. Public profile pages read a separate projection containing only
   public-class fields (see ui-ux-spec §S2 visibility table).

PER-SCREEN STANDARD OF DONE (applies to every S01–S15 screen you build):
- Matches its ui-ux-spec entry: purpose, components, primary actions present.
- All four states implemented: populated, empty, loading, error — no blank
  screens, no unhandled promise states.
- Every active clock renders as a countdown chip (never hidden).
- Bilingual zh-Hant/EN via one i18n dictionary (no hardcoded strings).
- Server-side zod validation with field-level bilingual errors.
- Role symmetry: creator and brand see the same screen, only enabled actions
  differ; unauthorized deal access returns 404 (not 403).
- Responsive: usable at 390px for S03, S05, S07–S12; desktop-first for
  S04/S06/S14.
- At least one vitest for any logic the screen introduces + the screen's
  happy path covered by a Playwright journey (8 journeys total, see spec).

WHOLE-PROJECT STANDARD OF DONE (contest build):
- typecheck + build + all tests green on every commit; CI via GitHub Actions.
- Domain layer coverage ≥80% (state machine transitions incl. all invalid
  ones; rev-share property-based tests: shares sum exactly, banker's rounding).
- E2E critical path passes against Stripe test mode: create deal → sign →
  milestone → payout, plus dispute-freeze and redline-reset journeys.
- E8 agent demonstrably live: agent log visible in S15, every decision in
  deal_events, at least one production Gemini call (Vertex AI) — XPRIZE rule.
- Secrets only in env vars (Vercel env), never in git. .env in .gitignore.
- Build order: E6 auth → E1 builder → E2 sign (click-sign + hash for contest)
  → E3 milestones/reports → E8 agent → E4 payouts (test mode) → E5/E7 minimal.
  Ship weekly per spec's W1–W5 table; every week must produce demoable
  evidence, not just code.

WORKING RULES: karpathy discipline — think before coding, simplest thing that
works, surgical diffs, no speculative abstractions. When docs conflict,
CLAUDE.md wins; flag the conflict instead of silently choosing. Run
`graphify update .` after code changes.
```
