# Handsel Landing Page Design System

## 0. Research Log

- User-provided Handsel product screens: extracted the royal-blue trust palette, thin-border surfaces, product-first UI previews, and bilingual navigation pattern.
- Generated hero reference: extracted the editorial serif headline, layered contract/milestone/payout focal object, airy white canvas, and blue atmospheric glow.
- Existing `ui-ux-spec.md`: confirmed the landing-page job is to explain contract-to-payout value and drive creator/brand demo intent.

## 1. Brand Direction

Handsel is a trust product for creator-brand partnerships. The page should feel like a calm financial instrument: precise, transparent, warm enough for creators, and credible enough for brands. Use editorial contrast in the headline and product UI detail to make the promise feel concrete.

## 2. Tokens

### Color

- `--ink-950: #071a42` — primary headings and dark UI text
- `--ink-700: #405274` — supporting copy
- `--blue-700: #0b3da8` — primary action and brand blue
- `--blue-500: #2f67d8` — highlights and focus states
- `--blue-100: #e8f0ff` — soft tint surfaces
- `--sky-50: #f7faff` — page wash
- `--line: #dbe4f2` — hairline borders
- `--success: #1d9b69` — completed/verified state
- `--amber: #d78b18` — timing and attention state

### Typography

- Display: `Georgia, 'Times New Roman', serif`, 64/1.02 desktop, 44/1.04 mobile
- Sans: `Arial, Helvetica, sans-serif`, 16/1.5 body
- Eyebrow: sans, 11px, 700, 0.16em uppercase
- Section title: serif, 46/1.05 desktop, 36/1.08 mobile
- UI labels: sans, 12–14px, 700

### Spacing and shape

- Base unit: 4px. Use 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Page max width: 1200px.
- Surface radius: 18px for panels, 12px for controls, 999px only for status chips.
- Depth: prefer thin borders plus soft layered shadows; no heavy floating-card stacks.

## 3. Layout Grammar

- Header is quiet, sticky, and white with a 1px bottom rule.
- Hero is asymmetric: copy left, product proof right. The right-side object is the visual anchor.
- Use section bands that alternate white and `--sky-50`; avoid enclosing every section in a rounded card.
- CTAs are explicit and repeated at the hero and closing section. Both creator and brand audiences get an equal entry path.
- Responsive behavior: collapse nav into a compact menu, stack hero columns, make previews full-width, and keep tap targets at least 44px high.

## 4. Motion and Interaction

- Page entrance: staggered opacity + translateY only.
- Product preview: subtle floating transform on the payout card; respect `prefers-reduced-motion`.
- Language toggle updates all visible copy without navigation.
- Demo CTA opens a focused form modal and shows an inline success state after submit.

## 5. Reusable Components

- `BrandMark`: Handsel wordmark with handshake monogram treatment.
- `PrimaryButton` / `SecondaryButton`: consistent CTA hierarchy and focus ring.
- `ProductPreview`: contract, milestone, and payout proof composition.
- `FeatureRow`: concise outcome + supporting line for trust markers.
- `DemoModal`: accessible presales capture surface.
- `LanguageToggle`: English / Chinese switch with `aria-pressed` state.

## 6. Accessibility Constraints

- Semantic landmarks: header, nav, main, section, footer.
- All interactive controls use native buttons or links with visible focus states.
- Color is never the only status signal; labels accompany success/timing states.
- Modal traps focus through native dialog behavior and closes with Escape.
- Maintain readable contrast for body text and controls.
