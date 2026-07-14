---
target: src/features/public/design-system
total_score: 27
p0_count: 1
p1_count: 2
timestamp: 2026-07-06T20-46-00Z
slug: src-features-public-design-system
---
Method: dual-agent (A: a3ae560fd09b352ac · B: a352c1b19c3a2735d)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toasts/skeletons/progress demoed well; no scroll-position indicator on an ~18,000px page |
| 2 | Match System / Real World | 2 | Copy claims "Cal Sans" / Cal.com scheduling language that doesn't match the real stack (Inter only) |
| 3 | User Control and Freedom | 3 | No in-page nav/TOC to jump between the 11 sections or back to top |
| 4 | Consistency and Standards | 4 | `Section` + `UsageCard` wrappers keep component demos uniform throughout |
| 5 | Error Prevention | 3 | N/A mostly; demo destructive actions correctly gated behind confirm/outline styling |
| 6 | Recognition Rather Than Recall | 2 | 11 sections, each with a stable `id`, but nothing links to them — user must scroll-hunt |
| 7 | Flexibility and Efficiency | 2 | No search/filter across ~30 components; ironically the page's own `Command` demo shows the missing capability |
| 8 | Aesthetic and Minimalist Design | 3 | Individual sections are clean; every one of 30+ components always fully expanded (code + demo) adds a lot of chrome |
| 9 | Error Recovery | 3 | FieldWrapper error and QueryErrorState demos present and correctly styled |
| 10 | Help and Documentation | 2 | The "documentation" actively misleads about the font stack — hurts more than it helps |
| **Total** | | **27/40** | **Acceptable** — solid component discipline, dragged down by stale copy + missing navigation |

## Anti-Patterns Verdict

**Borderline — leans "yes, subtly off."** The component vocabulary itself would pass a Linear/Notion-fluent user's trust test (real prop usage, no lorem-ipsum). What fails is the page's own narration: it still describes itself as a Cal.com scheduling-app clone ("Cal Sans", "The better way to schedule", "Your all-purpose scheduling app", "Smarter, simpler scheduling") while the actual CSS ships Inter only. For a domain-neutral template's reference page, that's a bigger tell than any visual cliché — the chrome is genericized, the copy underneath isn't.

The numbered "01 — COLOR PALETTE" ... "11 —" section labels are **not** a slop tell here: this is a genuinely sequential 11-section reference document, the numbering aids wayfinding, and it's applied consistently rather than performatively.

**Deterministic scan** (`detect.mjs`): the page file itself scans clean (0 findings). `src/index.css` flags 2 `overused-font` hits (both just point at the single Inter `@import`/font-family declaration — expected for a single-family product UI, not a defect per product.md's "one family is often right" rule).

**Live browser overlay** (injected via `live-server.mjs` + `detect.js`, then torn down): fired several real, actionable findings —
- **low-contrast**: `#6b7280` (muted text) on `#f5f5f5` (card bg) ≈ 4.4:1, just under the 4.5:1 AA floor; `#ef4444` (error red) on `#f5f5f5` ≈ 3.5:1, well under.
- **skipped-heading**: page's `<h2>` is directly followed by `<h4>` (no `<h3>`) at the first section boundary.
- **cramped-padding**: a `div.flex.h-10...cursor-context-menu` demo trigger has 0px vertical padding for 14px text.
- **nested-cards**: high count, but on inspection these are demo/framing containers (Card-in-Card is literally what the page is showcasing) — **likely inflated, not a real defect**.
- **repeated-section-kickers**: fired on the same 11 numbered labels already ruled intentional above — **not a real defect in this context**.
- **gradient-text** and **bounce-easing**: both fired once in the automated scan, but a manual DOM query (`background-clip:text` + gradient, and `animation-name` containing "bounce") across the live page found zero matching elements, and a source grep found no `bg-clip-text` usage anywhere in `src`, and the only "bounce" hit in source is an unrelated framer-motion spring config (`bounce: 0`) on the Tabs component, not used on this page. **Could not reproduce — treating as unconfirmed/likely false positive**, but worth a second look if you want certainty.

## Overall Impression

The component-level craft is genuinely good — real prop coverage, consistent wrapper patterns, sensible color/typography token documentation with usage rules attached. The page's biggest problem isn't visual, it's that its own words haven't caught up to being a template: it still talks like Cal.com's marketing site, which will actively mislead the next engineer or agent who reads it as ground truth. The second-biggest problem is structural: an 11-section, ~18,000px reference page has no way to jump to a specific section despite every section already carrying a stable anchor `id` in the code.

## What's Working

- **Live examples exercise real component APIs**, not placeholder markup — e.g. `MultiCombobox` demoed with `maxVisibleValues={2} showClearAllOption showSelectAllOption`, `FieldWrapper` with `showCharCounter maxLength={200}`. The code snippet next to each demo matches what's actually rendered.
- **`Section` + `UsageCard` is a well-judged reuse pattern** — two small wrappers keep 30+ component demonstrations structurally identical, which is the product-register's own "consistent affordances" rule being practiced by the tool that documents it.
- **Token documentation carries usage rules, not just swatches** — e.g. the badge-pastel group explicitly states "nunca em CTAs principais," which is the right level of guidance for a reference doc.

## Priority Issues

**[P0] Stale/false font documentation actively misleads readers.**
- Why it matters: This page exists so engineers and agents can trust it as ground truth. It repeatedly claims "Cal Sans" is the display typeface (`typographyScale` entries' `note: "Cal Sans"`, hero copy, section 02 title/description) when the real stack — confirmed by the live detector ("Primary font: inter (100% of text)") and by `getComputedStyle` on the actual hero heading — is Inter only. A new contributor or coding agent scaffolding a new screen will believe a font import is missing and go looking for a typeface that doesn't exist.
- Fix: Remove every `note: "Cal Sans"` field and the Cal.com/scheduling sample sentences (hero description, section 02 title "Cal Sans + Inter", its description, and the `surface-dark`/`on-dark-soft` color descriptions that reference "rodapé" and "pricing" — none of that exists in this template). Replace with neutral, accurate copy describing the actual Inter-only system.
- Suggested command: `/impeccable document` (regenerate DESIGN.md + this page's copy from the real tokens) or `/impeccable clarify` (rewrite the misleading copy directly).

**[P1] Real WCAG AA contrast failures on muted and error text.**
- Why it matters: confirmed via the live detector: `#6b7280` on `#f5f5f5` ≈ 4.4:1 (needs 4.5:1) and `#ef4444` on `#f5f5f5` ≈ 3.5:1 (needs 4.5:1). This directly violates the PRODUCT.md accessibility target (body text ≥4.5:1) and the general Impeccable color rule that muted-gray-on-tint is the single most common accessibility failure.
- Fix: Darken `--muted-foreground` slightly toward ink, or increase the error-red's contrast against `surface-card` specifically (may need a card-context error token rather than the flat `--destructive`).
- Suggested command: `/impeccable audit` (systematic contrast pass) or `/impeccable polish`.

**[P1] No in-page navigation despite every section already having a stable anchor id.**
- Why it matters: `cores`, `tipografia`, `acoes`, `formularios`, `datas`, `navegacao`, `overlays`, `feedback`, `layout`, `charts`, `dados` are all real `id`s in the code already — the scaffolding for a fix exists but nothing consumes it. This is the single biggest cognitive-load and heuristic gap (#3 User Control, #6 Recognition, #7 Efficiency) on a page whose whole job is fast lookup, and it directly hurts the "Alex" power-user persona, who has no way to jump straight to e.g. "Table" without scrolling past 10 other sections.
- Fix: Add a sticky/collapsible anchor TOC (the page already imports `Command` for its own demo section — reusing that as a jump-to-section palette would be an elegant, on-brand answer).
- Suggested command: `/impeccable layout`.

**[P2] Heading hierarchy skips a level (h2 → h4, no h3).**
- Why it matters: confirmed by the live detector (`skipped-heading`). Screen-reader users navigating by heading level lose a structural landmark; this is a quick, concrete accessibility fix.
- Fix: Audit the heading levels rendered by `Typography` variants inside `Section`/sub-cards and insert or relabel to keep a continuous h2→h3→h4 chain.
- Suggested command: `/impeccable audit`.

**[P2] Hero row has no mobile stacking.**
- Why it matters: `flex items-start justify-between gap-4` (hero container) never gets a `flex-col` breakpoint. At 375px this squeezes the title column next to the ThemeSwitcher rather than stacking, producing a cramped, top-heavy mobile hero — product.md calls responsive behavior "structural, not fluid typography," and this is the one place that structural response is missing.
- Fix: `flex-col items-start md:flex-row md:items-start md:justify-between`.
- Suggested command: `/impeccable adapt`.

## Persona Red Flags

**Alex (Power User)**: No command-palette/search across ~30 documented components — must scroll past everything before the target section. The irony: the page's own section 06 demos a `Command` search ("Buscar componente...") that the page itself doesn't offer for its own navigation.

**Sam (Accessibility-Dependent)**: Confirmed contrast failures (above) hit exactly the `text-muted-foreground` captions/descriptions Sam relies on being legible. No heading-level shortcut beyond the skipped h2→h4 jump either, so screen-reader section-jumping is degraded.

**Jordan (First-Timer / new agent reading the template)**: Jordan is who the P0 finding damages most — arriving with no prior context, they take the page's "Cal Sans" claim at face value and either hunt for a font file that doesn't exist or scaffold new screens assuming a special display typeface is loaded.

## Minor Observations

- `ColorSwatch`'s description `className` has a dead ternary: both branches of `dark ? "text-muted-foreground" : "text-muted-foreground"` are identical — the `dark` prop currently has no visual effect.
- Badge-pastel swatches (`badge-orange`, `badge-pink`, `badge-violet`, `badge-emerald`) don't obviously map to the real CSS custom properties in `src/index.css` (which defines `--orange`, `--violet`, `--rose`, `--blue` — no `--pink` or `--emerald`). Worth confirming these are sourced from real tokens rather than hardcoded hex.
- Section granularity is uneven — Charts (10) covers one component, Forms (04) covers five — which slightly undercuts the numbered sequence's implied "comparable steps" promise.
- `cramped-padding` detector hit on a `cursor-context-menu` demo trigger div (0px vertical padding for 14px text) — small, easy P3 fix.
- No progressive disclosure: all 30+ code snippets render fully expanded always; a `Collapsible` "Show code" toggle (already imported elsewhere on the page) would let the default view scan faster.

## Questions to Consider

- If this page's whole purpose is "show every component with a snippet," why doesn't it use its own `Command` component to let you search itself?
- Is an ~18,000px single-scroll page the right shape for a growing reference doc, or would this scale better as one route per category now that React Router is already wired up?
- The Cal Sans/Cal.com copy survived multiple "sync skills & agents" commits — is this page considered out of scope for template genericization, or just missed?
