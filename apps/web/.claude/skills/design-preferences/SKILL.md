---
name: design-preferences
description: Design preferences and visual standards for this React Vite web app. Read before building or reviewing any screen, page, dashboard, form, table, landing section, card, modal, or component to match the expected visual style.
---

# Design Preferences

## Vibe

Minimalista, limpo, bem espaçado. Cal.com inspired. Nada chamativo, sem excesso de ornamento. Quando em dúvida, faça menos.

For operational/dashboard screens, prioritize scanability, density, predictable navigation, and quiet UI over marketing composition.

## Color Palette

Cal.com monochrome palette — always use semantic vars, never raw hex:

| Token | Valor | Uso |
|---|---|---|
| `--primary` / `--foreground` | `#111111` | CTA principal, h1/h2 |
| `--background` | `#ffffff` | Canvas padrão |
| `--card` | `#f5f5f5` | Cards de feature |
| `--muted` | `#f8f9fa` | Fundos suaves |
| `--muted-foreground` | `#6b7280` | Texto secundário |
| `--border` | `#e5e7eb` | Bordas de 1px |
| `--success` | `#10b981` | Confirmação |
| `--warning` | `#f59e0b` | Alerta |
| `--destructive` | `#ef4444` | Erro / remoção |

Badge pastels: `--orange #fb923c`, `--violet #8b5cf6`, `--rose #ec4899` — só em avatares e tag pills.

## Radius

Maximum `rounded-2xl`.

- Cards and containers: `rounded-lg`
- Buttons and inputs: component default or `rounded-lg`
- Badges/chips/avatars: `rounded-full`
- Dialogs/sheets: `rounded-2xl`

## Typography

Use `<Typography variant="...">` — never raw `<h1>`, `<p>`, `<span>` para texto de conteúdo. Detalhes completos em `.claude/skills/typography/SKILL.md`.

## Spacing

- Default page/block gap: `gap-6`.
- Screen/page padding: `p-4`, `px-4`, or `p-6`.
- Inside cards/forms: `gap-3` or `gap-4`.
- Avoid `gap-1`/`gap-2` as the main page rhythm.

## Cards

Use `Card` for repeated items, framed tools, and modal-like content. Do not put cards inside cards. Do not make every page section a floating card.

## Forms

Keep forms calm and predictable. Primary submit actions should be visually clear; secondary actions should be quieter.

## Tables And Lists

Use table/list systems already in the project. Prefer separators and restrained row states over heavy card grids for dense operational data.

## Landing Pages

Landing pages may be more expressive, but must still show the real product/offer quickly and avoid decorative clutter.
