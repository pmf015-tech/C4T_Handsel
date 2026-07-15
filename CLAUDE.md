# Handsel — Project Constitution

## Project

**Handsel 信約** — a deal-to-payout platform for creator × brand product-line
partnerships. Product of **C4T** (parent company, "Center for Transformation").
See `proposal.md` for the full product case; this file is the working constitution.

## Goal

Turn creator–brand product collaborations (currently negotiated over DMs with verbal
promises) into structured, contracted, tracked, and milestone-paid deals.

## Target User

Creators (10k–500k followers) and brand operators co-launching physical product lines
with revenue share. Initial market: Taiwan / Hong Kong, bilingual 中文/English.

## Tech Stack

- **Next.js (App Router) + TypeScript** on **Vercel**
- **Postgres** (via Vercel Marketplace provider) — deals, contracts, milestones, payouts
- **Stripe Connect** — funds holding and milestone-gated payouts (keeps us out of
  money-transmitter scope)
- E-signature: start with a vetted library/service, do not hand-roll crypto
- Auth: platform-native solution (decide at eng-review; no custom password storage)

## MVP Scope

1. Structured deal builder (creator stats + brand terms → standardized term sheet)
2. On-platform e-signed contract, versioned
3. Milestone/deliverable tracking + brand-reported sales reconciliation
4. Milestone-gated payouts via Stripe Connect
5. Verifiable deal history per user

## Out of Scope (do not build, do not scaffold "for later")

- Matchmaking / discovery marketplace
- Equity issuance
- Automated commerce integrations (Shopify/momo/蝦皮)
- Native mobile apps
- Anything speculative — YAGNI applies

## Product Principles

- **Trust is the product.** Every feature must make a promise more verifiable or a
  payout more certain. If it doesn't, cut it.
- Tool first, marketplace later: serve deals that already exist before matching new ones.
- Both sides are customers: never design a flow that advantages brand over creator or
  vice versa.
- Contracts and money flows must be auditable end-to-end.

## Coding Rules

- Follow karpathy-guidelines: think before coding, simplicity first, surgical changes,
  goal-driven execution.
- Money amounts: integer minor units only (cents), never floats.
- All state changes to deals/contracts/payouts are append-only events (audit trail).
- Validate at every boundary; payments and contract code require security review before
  merge.

## Testing Expectations

- TDD for deal state machine, payout calculations, and reconciliation logic (these are
  the trust core — 80%+ coverage mandatory there).
- E2E (Playwright) for the critical path: create deal → sign → milestone → payout.
- No mocked Stripe in E2E against staging; use Stripe test mode.

## Hackathon Context (until 2026-08-18)

Handsel is being built for **XPRIZE "Build with Gemini"** (Money & Financial Access).
Overrides while the contest runs:

- **Gemini API via Vertex AI is mandatory** for at least one production LLM call
  (satisfies the Google Cloud requirement too). The Gemini Settlement Agent (spec E8)
  is the AI-native-operations centerpiece: contract→settlement-rules extraction, sales
  reconciliation, statement generation, dispute triage — all logged to deal_events.
- Gemini proposes, deterministic domain code disposes: agent output is always
  reconciled against the pure rev-share function before money moves.
- Revenue during contest = paid settlement reports / pilots (Stripe Payment Links,
  no fund-holding). Live escrow only if Stripe Connect approval lands in time.
- E-sign temporarily = click-sign + content hash + email receipt (Dropbox Sign and
  G2 lawyer gate resume after the contest).
- Internal submission target **2026-08-16** (HK deadline 08-18 04:00).

## Status

- [x] proposal.md written
- [x] /office-hours (design doc APPROVED — ~/.gstack/projects/C4T_Handsel/)
- [x] /plan-ceo-review (HOLD SCOPE; 7 must-deliverables; 1 concern OV-1 → G1 spike)
- [x] /spec → spec-handsel-mvp.md (CONFIRMED 2026-07-11; E1–E7 + gates G0–G3)
- [x] /plan-eng-review (partial, 2026-07-12): G1 answered — Stripe ~90-day hold limit
  confirmed → money-flow = prefund 30d before due (1A); auth = Clerk; e-sign =
  Dropbox Sign API (pending G2 lawyer gate). See docs/ARCHITECTURE.md.
- [x] G0: git init + project scaffold (Next.js 15 + TS strict + vitest; build green)
- [x] ui-ux-spec.md (2026-07-12: 14 screens S01–S14; clock-visibility / event-log /
  role-symmetry UX rules) — ready for image2 UI generation
- [ ] G2 lawyer consult (blocks E2) · G3 Stripe KYC (start now) · GitHub repo + Vercel connect
- Note: founder waived user interviews 2026-07-11; build gate "≥2 committed creators before E4" is the first external validation signal.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
