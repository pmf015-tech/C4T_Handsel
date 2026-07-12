# Domain layer — the trust core

This layer holds Handsel's business rules and MUST stay free of framework and I/O
imports (no Next.js, no Stripe SDK, no DB client). Pure TypeScript only, so every
rule is unit-testable in isolation.

**TDD is mandatory here (80%+ coverage — CLAUDE.md):** write the failing test in
`*.test.ts` next to the module BEFORE implementing.

| Module (to be built) | What it owns | Spec section |
|---|---|---|
| `deal/stateMachine.ts` | Every legal deal transition; rejects the rest | Core Domain Model |
| `money/revShare.ts` | Pure rev-share computation, banker's rounding, minor units | E3 |
| `events/` | Append-only event log write model (no UPDATE/DELETE) | Core Domain Model |

`deal/types.ts` already carries the locked state and clock constants — change
those only by updating spec-handsel-mvp.md first.
