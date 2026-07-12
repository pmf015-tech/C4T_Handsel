# Handsel — Product Proposal

> Product of C4T (Center for Transformation, parent company). Working name: **Handsel 信約**.

## Problem

Creator × brand product-line partnerships (co-launched physical products with revenue share
or equity) routinely collapse because the deal infrastructure doesn't exist:

- Terms are negotiated over DMs/text messages; equity is promised verbally.
- 72% of creators report payment delays or disputes; only 34% have written contracts
  (InfluenceFlow 2026). 42% of micro-influencers report late or non-payment.
- After launch, sales data is opaque to the creator; payouts arrive late, small, or never.
- Each failed collaboration raises the trust cost of the next one, for both sides.

Real cases motivating this product: a 20k-follower creator whose supplement-brand
co-launch stalled after 3 months of text-message negotiations and verbal equity promises;
another creator who closed a deal on a handshake, delivered everything, waited 90 days,
and received a fraction of the promised split with zero visibility in between.

## Target User

- **Primary:** creators (10k–500k followers) entering product-line collaborations with
  brands — not one-off sponsored posts, but co-launched physical product lines with
  ongoing revenue share. Initial geographic focus: Taiwan / Hong Kong creator market,
  with English support for cross-border deals.
- **Secondary:** brand/DTC operators who want creators as long-term product partners and
  need a credible way to commit (structured terms attract better creators).

## Value Proposition

Turn scattered, unverifiable collaborations into searchable, verifiable, trusted deal
records. Handsel is the **deal-to-payout layer**: structured terms → on-platform contract
→ tracked sales → milestone-gated payouts. The name is the promise: a *handsel* is the
first payment placed in the hand at the start of a venture, sealing that the promise
will be kept.

## MVP Scope (deal tool first, marketplace later)

1. **Structured deal builder** — creator enters follower count, niche, engagement rate;
   brand enters revenue-share terms, projected revenue, deliverables. Output: a
   standardized term sheet both sides can redline.
2. **On-platform contract** — e-signed, stored, versioned. The contract never leaves
   the platform.
3. **Milestone & payout tracking** — deliverables checklist, sales reconciliation
   (brand-reported at MVP, platform-verified later), payouts released per milestone via
   Stripe Connect escrow-style holding.
4. **Deal record & history** — every completed deal becomes a verifiable track record
   both parties can show future partners.

### Explicitly OUT of MVP scope

- Matchmaking / discovery marketplace (phase 2 — tool first solves cold-start).
- Equity issuance (phase 2 — rev-share only at MVP; equity via standardized templates +
  lawyer network later).
- Automated sales-feed integrations (Shopify/momo/蝦皮) — phase 2; MVP uses
  brand-reported reconciliation with dispute flags.
- Native mobile app.

## Success Metrics

- 10 real deals signed and running through the platform in the first 90 days post-launch.
- ≥ 1 deal reaching a milestone payout released through the platform.
- Creator NPS on "would you run your next deal here" ≥ 40.
- Zero deals where terms exist only off-platform after signup.

## Key Risks

1. **Marketplace cold start** — mitigated by MVP being a tool for deals already in
   negotiation, not a matchmaker.
2. **Sales tracking trust gap** — brands can under-report; MVP mitigates with
   reconciliation + dispute process, phase 2 adds commerce integrations.
3. **Adjacent competitors** — Collabstr and AhaCreator offer escrow + contracts for
   one-off campaign deals; Pietra owns creator supply chain. Differentiation: Handsel is
   the only player focused on **long-running product-line partnerships with ongoing
   revenue-share settlement**, not single-content-delivery campaigns. This gap must be
   re-validated quarterly.
4. **Payments/regulatory** — holding and releasing funds across TW/HK/US requires care;
   Stripe Connect chosen to keep Handsel out of money-transmitter territory.
5. **Naming collision (phonetic)** — hansel.io ("Hansel", India, product-growth SaaS)
   sounds identical. Spelling/trademark class differ; formal trademark search required
   before public launch.

## Brand Architecture

```
C4T (parent, cat logo, "Center for Transformation")
 └── Handsel 信約 (product brand, own logo, footer: "A C4T Company")
```
