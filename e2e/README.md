# E2E (Playwright)

Critical-path journeys against Stripe **test mode** — no mocked Stripe
(CLAUDE.md testing expectation).

Planned journeys (spec Testing Plan, 8 total): create deal → sign → milestone →
payout; dispute freeze path; redline signature-reset path; funding-declined path.

Playwright is added as a dependency when E1 ships its first UI route — config
lands here at that point (`playwright.config.ts`).
