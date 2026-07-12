# Handsel 信約 — UI/UX Spec (MVP)

> Derived from CLAUDE.md, proposal.md, spec-handsel-mvp.md (E1–E7, founder decisions
> S1–S4, eng decision 1A). Bilingual product: 繁體中文 + English, language toggle
> everywhere. Two primary roles: **Creator** and **Brand**; one internal role: **Admin**.
> Design principle from CLAUDE.md: trust is the product — every screen must make a
> promise more verifiable or a payout more certain. Neither side gets a privileged flow.

## 1. Core UX logic — the deal lifecycle drives everything

The whole product is ONE object (the Deal) moving through states. Every screen is a
view of that object; every primary action is a state transition. The UI must always
answer three questions on any deal screen: **where is this deal now, who must act
next, and what happens if they don't (which clock is ticking)**.

```
 DRAFT ──share──▶ NEGOTIATING ──both sign──▶ SIGNED ──prefund──▶ ACTIVE
  (creator or      (redline loop:             (14d signing        │
   brand starts)    each edit = new            window clock)      ├─ milestone loop:
                    version, signatures                           │   deliver → approve/7d → payout
                    reset; 14d offer clock)                       ├─ monthly sales report (+7d grace)
                                                                  ├─ DISPUTED (freeze → 14d → default clause)
                                                                  ▼
                                                              COMPLETED → verifiable track record
```

**Clock visibility rule:** every active clock (offer expiry, signing window, report
grace, 7-day auto-approve, prefund T-30, dispute 14d) renders as a visible countdown
chip on the deal — never a hidden backend behavior. Clocks build trust only if seen.

**Event-log rule:** every deal screen has an "Activity" timeline rendering the
append-only event log in human language (bilingual). Nothing happens silently.

**Role symmetry rule:** creator and brand see the same deal screens with role-specific
action slots — not two different portals. What differs is only *which* actions are
enabled.

## 2. Screen count

**14 screens total**: 10 core app screens + 2 public screens + 1 settings + 1 admin
console (desktop-first; see §5).

## 3. Screen list & specs

### S01 — Landing page (public)
- **Purpose:** explain deal-to-payout value prop to both sides; entry to sign-up. Bilingual toggle top-right.
- **Key components:** hero (promise: 口頭承諾 → 可驗證合作), how-it-works 4-step strip (terms → sign → track → get paid), dual CTA ("I'm a creator" / "I'm a brand"), trust markers (Stripe, e-sign audit trail).
- **Primary actions:** sign up (role-tagged), sign in, language toggle.
- **States:** static; no empty/loading/error beyond auth redirect failure toast.
- **Nav:** → S02 auth; → S12 public profiles (from any track-record link).

### S02 — Auth & onboarding (Clerk-hosted + role/profile step)
- **Purpose:** account creation, role selection (creator / brand — switchable later, not both at once in MVP), minimal profile.
- **Key components:** Clerk sign-in/up embed; role picker; profile form (creator: display name, niche, follower count, engagement rate, socials; brand: company name, product category, website); language preference.
- **Primary actions:** authenticate; save profile.
- **States:** loading (Clerk widget), error (auth failure, field-level bilingual validation errors), empty (first-run profile form).
- **Nav:** → S03 dashboard on success; invited users deep-link straight to S05 term sheet after auth.

### S03 — Dashboard (role-aware home)
- **Purpose:** answer "what needs my action now" in one glance.
- **Key components:** action-required list sorted by clock urgency (sign by X, report due Y, approve deliverable Z, fix failed funding); active deals cards (state badge + next-actor + clock chip); "start a deal" CTA; completed-deals count linking to S12.
- **Primary actions:** open deal; start new deal (→ S04).
- **States:** empty ("no deals yet" + start-deal CTA + invite-partner explainer), loading (skeleton cards), error (retry banner).
- **Nav:** hub — out to S04, S07, S13; badge to S11 if any dispute open.

### S04 — Deal builder (wizard, E1)
- **Purpose:** structured terms in, standardized term sheet out. The core "replace DMs" moment.
- **Key components:** 4-step wizard — ① parties & product (invite counterparty by email/link; product category; deal currency, locked with "cannot change later" note) ② creator stats & deliverables ③ commercial terms (rev-share %, projected revenue, milestone editor: title/amount/due-date rows, 1–20) ④ dispute default clause (mandatory 3-option choice with plain-language explainer — S3 decision) + review. Progress bar; save-as-draft everywhere.
- **Primary actions:** save draft; generate term sheet (→ S05); server-side field-level validation on every step.
- **States:** empty (guided step 1), loading (validation/save spinners), error (bilingual field errors incl. all 12 invalid-input classes from spec; wizard blocks advance until clean).
- **Nav:** ← S03; → S05 on generate.

### S05 — Term sheet view (shareable, E1)
- **Purpose:** the negotiation artifact. Read-only render of a version; counterparty can view WITHOUT an account (unauthenticated read of the share link), must auth to respond.
- **Key components:** print-quality bilingual term sheet; version selector + diff highlights vs previous version; offer-expiry countdown chip (14d); comment/redline panel (per-section comments in MVP, not inline text editing — edits happen by revising in S04, producing v n+1); "accept & proceed to contract" CTA; PDF export.
- **Primary actions:** (counterparty) request changes / accept; (owner) revise → new version; share link copy.
- **States:** empty (v1 fresh), loading (PDF gen), error (expired link → "offer expired" page with re-request CTA), stale-version banner ("v3 exists — you're viewing v2").
- **Nav:** ← S04 (revise); → S06 when both accept.

### S06 — Contract & e-sign (E2)
- **Purpose:** turn agreed terms into a signed, hash-bound contract. Gravitas moment — most formal screen in the product.
- **Key components:** contract render (from term-sheet version, content hash shown); embedded Dropbox Sign signing frame; signature status panel (who signed, when; signing-window 14d countdown); version history with signature-reset events; export (PDF + hash + event trail).
- **Primary actions:** sign; download; (either party pre-signature) request revision → back to S04/S05 flow with reset warning modal ("all signatures will reset").
- **States:** loading (e-sign frame), error (409 stale-version → "terms changed, review v n+1" interstitial; e-sign provider failure with retry), empty n/a.
- **Nav:** → S07 once fully signed.

### S07 — Deal detail (the ACTIVE hub, E3/E4 surface)
- **Purpose:** single source of truth for a live deal. Tabbed container.
- **Key components:** header (parties, product, state badge, next-actor, most-urgent clock chip); tabs: **Overview** (status timeline + activity/event log), **Milestones** (list → S08), **Sales reports** (list → S09), **Payouts** (→ S10), **Dispute** (→ S11, only visible if open or openable); open-dispute button (with freeze warning).
- **Primary actions:** navigate tabs; role-specific quick actions surfaced from children (e.g. "report due in 3 days" banner → S09).
- **States:** loading (skeleton), error (retry), empty per-tab (no reports yet, etc.).
- **Nav:** ← S03; children S08–S11.

### S08 — Milestone detail (E3)
- **Purpose:** deliverable handshake: creator proves, brand approves, money releases.
- **Key components:** deliverables checklist; evidence uploader (files/links) — creator side; review panel with approve/reject + reason — brand side; 7-day auto-approve countdown after delivery; funding status strip (prefund T-30 countdown → "funds held ✓" → released; FUNDING_FAILED banner with brand retry CTA — 1A model); milestone amount in deal currency (minor-units-accurate).
- **Primary actions:** (creator) mark delivered + attach evidence; (brand) approve / reject-with-reason; (brand) retry failed funding.
- **States:** empty (nothing delivered), loading (upload progress), error (upload fail, funding declined banner both parties see), locked (dispute freeze overlay).
- **Nav:** ← S07 milestones tab.

### S09 — Sales report (E3)
- **Purpose:** brand reports monthly sales; creator sees computed share BEFORE money moves. Transparency centerpiece.
- **Key components:** (brand) monthly form: units, gross revenue, optional evidence; live computed rev-share preview (pure-function output shown pre-submit); (both) report history table with status chips (on-time / late / disputed); grace-period countdown (+7d); "2 consecutive late = auto-dispute" warning state.
- **Primary actions:** (brand) submit report; (creator) acknowledge / flag discrepancy (→ opens dispute S11).
- **States:** empty (no reports due yet — next due date shown), loading (compute preview), error (validation; late banner), overdue (red chip + notification note).
- **Nav:** ← S07 reports tab; flag → S11.

### S10 — Payouts & Stripe onboarding (E4)
- **Purpose:** where promises become money. Also hosts Stripe Connect Express onboarding.
- **Key components:** Stripe onboarding embed/redirect card (creator: payout account; brand: payment method) with KYC status; payout ledger (per milestone/report: intent → settled, amounts, dates — mirrors dual-event model); upcoming prefunds (T-30 schedule); failed-operations banner with plain-language explanation + retry (brand) / "we're on it" (creator).
- **Primary actions:** complete Stripe onboarding; (brand) retry failed charge; export payout history CSV.
- **States:** empty (no payouts yet), loading (Stripe redirect/return), error (onboarding incomplete blocks E4 actions with clear checklist; charge declined), all-good (green settled rows).
- **Nav:** ← S07 payouts tab; ← S13 (payout account settings deep-link).

### S11 — Dispute (E3/S3 decision)
- **Purpose:** structured, rule-based conflict path — platform never arbitrates.
- **Key components:** freeze notice (which payouts frozen); 14-day negotiation countdown; structured response forms (claim → response → counter, each with evidence upload); pre-signed default clause card ("if unresolved by DATE, contract executes: [refund brand / split by delivered proportion / external mediation]"); resolution proposal + mutual-accept buttons; outcome record.
- **Primary actions:** submit structured response; upload evidence; propose/accept resolution; (clock expiry) view default-clause execution status.
- **States:** empty (open-dispute form with consequences warning), loading, error, resolved (outcome summary, unfreeze confirmation), executed (default clause applied, event-linked).
- **Nav:** ← S07 dispute tab; outcome events also appear in S07 timeline.

### S12 — Public profile / track record (E5, S2 visibility)
- **Purpose:** the verifiable reputation asset — reason to run the NEXT deal here.
- **Key components:** identity header; completed/active deal cards showing ONLY public-class fields (existence, parties, category, status, milestones completed count, mutual ratings); privacy note ("amounts & terms are never public"); share button.
- **Primary actions:** view; share; (owner viewing own) toggle per-deal visibility (→ S13 setting).
- **States:** empty ("no completed deals yet"), loading, error, private-deal placeholder (hidden entirely per S2 opt-out — no existence leak).
- **Nav:** public URL; ← S03 header link.

### S13 — Settings
- **Purpose:** account, language, payout plumbing, visibility.
- **Key components:** profile edit; language (中文/EN); Stripe account card (status + manage link → S10/Stripe dashboard); per-deal visibility toggles (S2 opt-out); notification preferences (email); danger zone (account deletion request — support-mediated in MVP).
- **Primary actions:** save; toggle visibility; manage Stripe.
- **States:** loading, error (save failure), success toasts.
- **Nav:** ← S03 avatar menu.

### S14 — Admin console (E7, internal only)
- **Purpose:** ops safety net — rule-executor, never discretionary.
- **Key components:** failed money-operations queue (op, deal, error class, age; retry / mark-resolved — every action event-logged); dispute console (view state, extend clock by mutual consent record, execute pre-signed clause button); audit log viewer (filter by deal/actor/event-type); money-flow alert feed.
- **Primary actions:** retry; mark-resolved with note; execute default clause; search audit log.
- **States:** empty (queue clear ✓), loading, error; every destructive action = confirm modal with event-log preview.
- **Nav:** separate authed area (admin role only); not linked from user UI.

## 4. Cross-screen systems

- **Clock chips:** one shared component; color ramps (neutral → amber ≤3d → red ≤24h); always shows what expires and what happens then.
- **State badges:** one shared vocabulary matching the domain state machine exactly (DRAFT…COMPLETED) — never invent UI-only states.
- **Activity timeline:** shared renderer of deal_events, bilingual templates per event_type.
- **Notifications (email, MVP):** every clock at T-3d/T-24h, every state transition, every money event — both parties always. No silent anything.
- **Error language:** every user-facing failure states what happened + who acts next + the deadline impact, in both languages.

## 5. Mobile vs desktop

- **Desktop-first** for S04 (builder), S06 (contract), S14 (admin) — dense forms and legal reading.
- **Fully responsive** S03, S05, S07–S12: creators live on phones; approving a milestone, checking a payout, reading a term sheet, and viewing profiles MUST work one-handed on mobile (single-column stacking, sticky action bar with clock chip).
- No native app (out of scope). Print stylesheet for S05/S06 PDF parity.

## 6. Explicitly NOT in this spec

Matchmaking/browse screens, equity UI, commerce-integration dashboards, multi-member
org management, in-app chat (negotiation happens via structured comments/versions
only), and any admin discretion tools beyond rule execution — all out of MVP scope
per CLAUDE.md.
