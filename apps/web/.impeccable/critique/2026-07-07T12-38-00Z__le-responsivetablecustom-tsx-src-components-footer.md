---
target: sidebar + responsiveTableCustom + footer
total_score: 29
p0_count: 0
p1_count: 3
timestamp: 2026-07-07T12-38-00Z
slug: le-responsivetablecustom-tsx-src-components-footer
---
Method: dual-agent (A: a59b759726c6abb25 · B: adf1550321901a379)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Table has a real skeleton (confirmed live: 40 `.animate-pulse` nodes during the simulated loading window); sidebar/footer have no async states to speak of |
| 2 | Match System / Real World | 4 | Portuguese labels, familiar icons, natural grouping |
| 3 | User Control and Freedom | 3 | Sidebar has real `Cmd/Ctrl+B` toggle + mobile Sheet dismiss; table has no reset/keyboard path beyond clicking |
| 4 | Consistency and Standards | 2 | `renderActions` wired to mobile only (confirmed structurally absent from `TableData`'s own prop type, not just a missed pass-through); footer copyright hardcoded to "2026" |
| 5 | Error Prevention | 3 | Pagination buttons correctly disable at bounds (verified live) |
| 6 | Recognition Rather Than Recall | 4 | Icons + text labels throughout nav; table headers restated as labels on mobile cards |
| 7 | Flexibility and Efficiency | 2 | Sidebar has real shortcuts (`Cmd/Ctrl+B`, `D` for theme); table/footer have zero accelerators despite `useReactTable` already providing selection machinery |
| 8 | Aesthetic and Minimalist Design | 4 | Calm, restrained, matches product register |
| 9 | Error Recovery | 2 | Table empty state is a flat dead-end ("Nenhum resultado encontrado." vs "Nenhum resultado obtido." — inconsistent between desktop/mobile, no suggested action) |
| 10 | Help and Documentation | 2 | No inline help in any of the 3 — acceptable for this component class, but real |
| **Total** | | **29/40** | **Good** |

## Anti-Patterns Verdict

**Sidebar**: trustworthy — near-verbatim shadcn/ui sidebar primitive DNA (`data-slot`/`data-sidebar` vocabulary, `peer/menu-button` CSS tricks, cookie persistence, `Cmd+B` shortcut). A Linear/Stripe-fluent dev recognizes the pattern instantly.

**ResponsiveTableCustom**: mostly trustworthy — meta-driven mobile mapping (`mobileHeader`/`mobileStatus`/`mobileLabel`/`mobileOrder`) is a genuinely good abstraction, one source of truth for both renderings. The `renderActions`-mobile-only gap is exactly the kind of subtle inconsistency that makes a fluent reviewer pause.

**Footer**: trustworthy but thin/generic — correct, unremarkable, most template-y of the three (stale hardcoded copyright).

**Deterministic scan** (`detect.mjs` across all 3 folders): clean, `[]`, verified twice. Hardcoded-hex grep: zero real hits (`footer/index.tsx`'s `#features`/`#included`/`#stack` are route hash fragments, not colors — confirmed false positive).

## Overall Impression

All three are competently built — no AI-slop tells, real token usage, a genuinely production-grade sidebar state model. The gap is in the *interaction contract*: two of the three surfaces (table row clicks, sidebar active-item semantics) look interactive/informative to a mouse+sighted user but drop that signal for keyboard and screen-reader users. That's the throughline across the top issues.

## What's Working

- **Shared pagination contract** (`TablePagination` type + `TableFooter`) used identically by desktop and mobile paths — no duplicated pagination logic; first/last buttons correctly collapse (not disappear) on narrow viewports. Verified live: clicking "Página anterior" correctly changed 5 rows and the page label.
- **Meta-driven mobile mapping** in `tableMobileData.tsx` — column defs stay the single source of truth for both the table and the card rendering, instead of a hand-maintained parallel template. Verified live: the "clientes" table showed zero `<table>` elements and 3 card borders at 375px, while the separate plain-`<Table>` demo correctly kept its `<table>` at the same width.
- **Sidebar state model** (`sidebar.tsx`) is production-grade: controlled/uncontrolled `open`, cookie persistence, real keyboard shortcut, mobile Sheet fallback, memoized context value.

## Priority Issues

**[P1] `renderActions` is structurally desktop-incapable, not just unwired — `src/components/table/responsiveTableCustom.tsx:36-45` vs `:54-61`, `src/components/table/tableData.tsx` (DataTableProps, lines 20-41)**
`ResponsiveTableCustom` threads `renderActions` into `TableCustom.MobileData` but never into `TableCustom.Data` — and `TableData`'s own prop type has no `renderActions` field at all, confirmed by reading its type definition. A consumer that supplies `renderActions` for a row-actions menu gets it on mobile and silently loses it at ≥768px, with no type error and no console warning.
Fix: add an actions-column convention to `TableData` (a dedicated last `ColumnDef` that composes `renderActions`), or drop the prop from `ResponsiveTableCustom`'s public surface and document that desktop actions must be a regular column.

**[P1] Clickable table rows are mouse-only — `src/components/table/tableData.tsx:109-116`, `src/components/table/tableMobileData.tsx:128-137`**
Both rows apply `cursor-pointer` + hover background + an `onClick` when `onRowClick` is supplied, but neither sets `role="button"`, `tabIndex`, nor handles `onKeyDown` for Enter/Space. A keyboard-only user cannot activate row navigation — WCAG 2.1.1 failure, and a direct hit for the Sam persona. (`getRowProps` is an escape hatch a caller *could* use to inject these, but no default usage does, including the design-system demo itself.)
Fix: when `onRowClick` is passed, default to `role="button" tabIndex={0]` and an `onKeyDown` handler firing on Enter/Space.

**[P1] No `aria-current` on the active sidebar item — `src/components/sidebar/navMain.tsx:48`**
`isActive={pathname === item.url}` only ever produces a `data-active` CSS hook — never `aria-current="page"` on the rendered link. A screen-reader user tabbing through the sidebar hears "Dashboard, link" identically whether or not they're currently on the dashboard.
Fix: add `aria-current={isActive ? "page" : undefined}` on the link `SidebarMenuButton` wraps.

**[P2] `SidebarMenuButton`'s disabled/loading states are dead CSS, never exercised — `src/components/sidebar/sidebar.tsx:444`**
The variant classes support `disabled:pointer-events-none disabled:opacity-50` and `aria-disabled:*`, but nothing in `navMain.tsx`/`navUser.tsx`/`themeMode.tsx` ever sets `disabled` or a loading state on a real menu item. Per the product register's "every interactive component needs default/hover/focus/active/disabled/loading/error" rule, this is a half-shipped state contract — the escape hatch exists but the next dev has to guess whether it actually works.

**[P2] Table empty state doesn't teach, and wording is inconsistent — `src/components/table/tableData.tsx:129-131` vs `tableMobileData.tsx:93-98`**
"Nenhum resultado encontrado." (desktop) vs "Nenhum resultado obtido." (mobile) — same condition, different copy, no suggested next action (clear filters, adjust search, create first record). The product register explicitly bans "nothing here" empty states.

**[P3] Footer copyright is a hardcoded, template-stale string — `src/components/footer/index.tsx:38`**
`"React Vite Template, 2026. Base neutra para produtos web."` — literal year and placeholder brand name, not `new Date().getFullYear()` or an i18n key. For a template meant to be forked, this is the kind of line that survives unedited into production more often than not.

## Persona Red Flags

**Alex (power user)**: Sidebar redeems itself with `Cmd/Ctrl+B` and `D` (theme) — genuinely good accelerators most templates skip. But the table has zero: no page-jump, no type-ahead, no bulk row selection despite `useReactTable` already providing that machinery. Managing 13+ rows across 3 pages, Alex has no faster path than clicking Next repeatedly.

**Sam (accessibility-dependent)**: Hit twice — missing `aria-current` on the active sidebar item, and mouse-only table rows (confirmed structurally, not just suspected). Positive counterweight: footer and sidebar both carry real focus-visible rings in their class chains (`ring-sidebar-ring`, `ring-ring`), and status badges pair color with a text label (not color-only).

## Minor Observations

`sidebarVariable.user` mock object (`variables.tsx:15-19`) is dead — `navUser.tsx` reads from `useAuth()` instead, never imports it · `getSubRows` param typed `any` in `tableData.tsx:33`, leaking out of an otherwise well-typed generic · page-size `Select` in `TableFooter` has no `aria-label`, relies on adjacent text only · footer's nav-link row is `flex-row` with no `flex-wrap` — untested beyond the current 4-link list, would overflow rather than wrap if extended · footer icon badge (`size-9`, rounded-lg) matches the sidebar header's badge exactly — a real cross-component consistency win, noted as a strength too · footer contrast independently verified: nav links 18.88:1, copyright text 6.60:1 against white — both comfortably pass AA.

## Questions to Consider

- If `renderActions` only reliably works on mobile, was this table ever actually used with row actions on a real desktop screen — or is the prop aspirational?
- The sidebar earns two real keyboard shortcuts — why does that discoverability effort stop at the sidebar boundary instead of extending to the table, where users spend more time?
- Is "React Vite Template, 2026" meant to survive into every forked product, or is it a placeholder nobody flagged — and if the latter, what makes it fail loudly instead of shipping silently?
