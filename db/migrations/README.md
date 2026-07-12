# Migrations

Numbered, forward-only SQL migrations (`0001_*.sql`, `0002_*.sql`, …).

Rules:
- Never edit a migration that has been applied anywhere — write a new one.
- `deal_events` is append-only: the schema must grant the app INSERT/SELECT only
  (no UPDATE/DELETE) on it.
- Money columns are `bigint` minor units. No `numeric`/`float` for amounts.

First migration lands with E6/E1 (TDD: schema follows the first failing
integration test, not the other way around).
