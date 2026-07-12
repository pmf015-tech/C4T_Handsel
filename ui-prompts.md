# Handsel — image2 UI Prompts (S01–S14)

> Usage: for EACH screen, copy the STYLE PREAMBLE block + that screen's prompt into
> image2 as one message. One screen = one prompt = one image. Never combine screens.
> Attach the approved Handsel logo (deep-blue handshake-H) as reference where the
> prompt mentions it.

## STYLE PREAMBLE (prepend to every prompt, verbatim)

```
High-fidelity UI design mockup for "Handsel 信約", a fintech-grade deal-to-payout
web platform for creator × brand partnerships. Visual direction: the gravitas of
Stripe and the clarity of Linear. Primary brand color deep royal blue #1E3A8A on
white/near-white surfaces (#FAFAFA); accent states: amber #D97706 for ticking
deadlines, red #DC2626 for overdue/failed, green #15803D for settled/verified.
Flat design, generous whitespace, 8px spacing grid, subtle 1px borders (#E5E7EB),
very restrained shadows. Typography: modern geometric sans-serif (Inter-like);
clear hierarchy, no decorative fonts. Logo: wordmark "Handsel" beside a deep-blue
letter-H mark formed by two interlocking arms in a handshake, top-left header.
UI text in English; the Chinese brand name 信約 appears ONLY next to the logo.
Recurring components (render consistently): state badge pills (DRAFT/NEGOTIATING/
SIGNED/ACTIVE/DISPUTED/COMPLETED), countdown "clock chips" (rounded pill, clock
icon + '5 days left'), and an activity timeline with small event dots. No stock
photos, no 3D illustrations, no gradients. Realistic, information-dense but calm,
believable product screenshot quality.
```

---

## S01 — Landing page
Desktop web, 1440px. Marketing landing page. Sticky header: logo left; nav
(How it works, For creators, For brands); language toggle 中/EN; Sign in button.
Hero: bold headline "Verbal promises become verifiable deals.", subline about
contracts, tracked sales and milestone payouts; two side-by-side CTAs "I'm a
creator" (solid deep blue) and "I'm a brand" (outlined). Below: a 4-step
horizontal strip with icons — Structured terms → E-signed contract → Tracked
sales → Milestone payouts. Then a trust band: "Payments held and released via
Stripe", "Every action on an audit trail". Footer with "A C4T Company" and a
small cat glyph. Populated, polished, calm.

## S02 — Auth & onboarding
Desktop web, 1440px, centered card layout on soft off-white background. Left half:
concise brand panel (logo, one-line promise, subtle deep-blue geometric pattern).
Right half: onboarding card, step 2 of 2 — role already chosen as "Creator"
(shown as small editable chip); profile form fields: display name, niche dropdown
(e.g. Beauty & skincare), follower count, engagement rate %, Instagram/YouTube
links, preferred language selector; primary button "Enter Handsel". Field labels
above inputs, one field showing inline validation error in red as example.

## S03 — Dashboard
Desktop web, 1440px. App shell: slim left sidebar (Dashboard, Deals, Profile,
Settings icons+labels), top bar with logo and avatar. Main area: greeting
"Good morning, Kaia"; an "Action required" section listing 3 rows sorted by
urgency, each row = deal name, required action ("Sign contract", "Approve
deliverable", "Sales report due"), amber/red clock chip ("2 days left"), arrow.
Below: "Active deals" as 3 cards — deal title (creator × brand product line),
state badge, next-actor line ("Waiting on: Brand"), most-urgent clock chip,
small progress dots for milestones. Top-right of section: solid blue "Start a
deal" button. Right rail: compact "Track record" card (4 completed deals ★4.9).

## S04 — Deal builder (wizard)
Desktop web, 1440px, focused flow (sidebar collapsed). Header: "New deal" +
4-step progress bar (Parties & product ✓, Creator & deliverables ✓, Commercial
terms ●, Dispute terms) with step 3 active. Main card: commercial terms form —
revenue share slider+input "Creator share: 18%", projected monthly revenue input
(TWD), and a milestone table editor: rows with milestone title, amount (NT$
integer), due date, delete icon; "+ Add milestone (3 of 20)" link. Right side
panel: live term-sheet preview thumbnail updating with entered values, note
"Currency locked after creation: TWD". Footer: Back / Save draft / Continue
(solid blue). One amount field shows red inline error "Amount must be a positive
whole number".

## S05 — Term sheet (shareable view)
Desktop web, 1440px, document-centric. Centered A4-like white document card:
bilingual-styled formal term sheet layout (parties block, product line, revenue
split table, milestone schedule table, dispute default clause line) rendered as
clean print-quality typography — body text in English. Above document: version
tabs "v1 · v2 · v3 (current)" with small diff badge "2 sections changed", and an
amber clock chip "Offer expires in 9 days". Right rail: comments panel with two
threaded section-comments and a reply box; buttons "Request changes" (outline)
and "Accept terms" (solid blue); "Copy share link" icon button. Viewer context:
counterparty brand user, not yet signed in banner on top: "You're viewing as
guest — sign in to respond".

## S06 — Contract & e-sign
Desktop web, 1440px, maximum gravitas. Two columns. Left 65%: contract document
viewer (formal typography, content hash string shown small under title:
"SHA-256: 9f2a…c41d"), embedded signature field area highlighted. Right 35%:
signing panel — signature status list: "Kaia Chen (Creator) — Signed 12 Jul,
14:02 ✓" green, "Brightside Brands — Pending" with amber clock chip "Signing
window: 11 days left"; big solid blue button "Sign contract"; below: version
history list showing "v3 created — all signatures reset" event; secondary
actions: Download PDF, Export audit trail. Discreet warning line: "Requesting
changes resets all signatures."

## S07 — Deal detail (ACTIVE hub)
Desktop web, 1440px. Deal header band: product-line title "Glow Ritual ×
Brightside", parties with avatars, ACTIVE state badge (blue), "Next: Brand
approves Milestone 2" line, amber clock chip "Auto-approve in 4 days". Tab bar:
Overview (active), Milestones, Sales reports, Payouts, Dispute. Overview tab
content: left — vertical activity timeline with dated events (contract signed,
milestone 1 payout released ✓ green, sales report submitted, milestone 2
delivered); right — summary cards: Total paid out NT$120,000, Next milestone
NT$60,000 "funds held ✓", Revenue share 18%, Reports on time 3/3. Quiet
"Open dispute" text link bottom-right.

## S08 — Milestone detail
Desktop web, 1440px, drawer/detail layout over the deal hub. Title "Milestone 2 —
First production run delivered", amount NT$60,000, due 28 Jul. Left: deliverables
checklist (3 items, 2 checked), evidence section with two uploaded file cards
(photo thumbnail, PDF) + "Add evidence" dashed uploader; "Marked delivered by
Kaia · 24 Jul". Right panel (brand view): review card — "Approve milestone"
solid green-blue button, "Request changes" outline, reason textarea; countdown
banner "Auto-approves in 4 days" amber. Funding strip on top: three mini-steps
"Prefund charged ✓ → Funds held ✓ → Release on approval" in green/blue. Payment
amounts rendered precisely, no decimals.

## S09 — Sales report
Desktop web, 1440px. Split layout. Left: "July 2026 report" form (brand view):
units sold input, gross revenue input (TWD), optional evidence uploader; live
computation card below in deep blue tint: "Creator share (18%): NT$27,540 —
calculated on submission, charged to your saved card"; submit button. Grace
banner: "Due by 7 Aug (7-day grace)" amber chip. Right: report history table —
months, gross, creator share, status chips: "On time" green ×3, "Late" amber ×1,
with footnote warning row: "2 consecutive late reports open a dispute
automatically." Creator-side acknowledgment column with small "Flag discrepancy"
link on latest row.

## S10 — Payouts & Stripe onboarding
Desktop web, 1440px. Top: Stripe Connect card — Stripe wordmark, status
"Payouts enabled ✓" green with "Manage on Stripe" link (creator view). Main:
payout ledger table: rows with source (Milestone 1 / July rev-share), intent
date, settled date, amount NT$, status chips (Settled ✓ green, Processing blue,
Failed — retry available red). One red banner row expanded: "Brand's card was
declined for Milestone 3 prefund — brand has been notified. Retry scheduled."
Side card: "Upcoming prefunds" list with T-30 schedule ("Milestone 3 — charge on
14 Aug"). Export CSV icon button top-right.

## S11 — Dispute
Desktop web, 1440px, serious but not alarming. Header: DISPUTED state badge
(red-outline), freeze notice bar: "Milestone 3 payout frozen while this dispute
is open", countdown chip "Negotiation window: 8 days left". Center: structured
thread — claim card (brand: "Delivered quantity short by 200 units" + evidence
attachment), response card (creator, with photos), each in neutral gray cards
with role labels. Bottom composer: structured response form (position dropdown,
statement textarea, evidence upload). Right rail: "Pre-agreed default outcome"
card in deep blue: "If unresolved by 20 Aug, contract executes: split by
delivered proportion", plus "Propose resolution" button and mutual-accept status.

## S12 — Public profile / track record
Desktop web, 1440px, public page (no app sidebar; marketing header). Profile
header: creator avatar, name, niche tag, follower count, "Verified deal history
on Handsel" shield line. Grid of deal record cards (4): product category icon,
parties, COMPLETED badge green, "6/6 milestones completed", mutual rating stars;
one card shows ACTIVE badge. Privacy footnote under grid: "Financial terms are
never public." Top-right "Share profile" button. Clean, portfolio-like, credible.

## S13 — Settings
Desktop web, 1440px, app shell with Settings active. Two-column settings page:
left menu (Profile, Language, Payments, Deal visibility, Notifications). Content
shows Payments + Deal visibility sections: Stripe account card with status
"Payouts enabled ✓" and manage link; below, "Deal visibility" list — each deal
row with public/private toggle switches, one toggled private showing subdued
row; helper text "Private deals are hidden from your public track record
entirely." Save toast bottom-right "Settings saved ✓".

## S14 — Admin console (internal)
Desktop web, 1440px, denser ops UI, same brand but flatter/darker header to
signal internal tool ("Handsel Ops"). Three-panel layout: left nav (Failed
operations, Disputes, Audit log, Alerts). Main: failed money-operations queue
table — columns: operation (Prefund charge / Transfer), deal, error class
(StripeChargeDeclined), age (2h), actions: "Retry" button + "Mark resolved"
with note icon; one row expanded showing event-log preview and confirm modal
pattern. Right rail: alert feed ("Reconciliation mismatch repaired ✓",
"Webhook gap detected — replayed"). Every action row shows "logged" chip —
conveys rule-executor, no discretionary powers.
