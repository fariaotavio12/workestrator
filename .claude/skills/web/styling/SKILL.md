---
name: styling
description: Design system and styling rules for this React Vite web app. Use when applying Tailwind classes, semantic colors, spacing, typography, border radius, dark mode, layout, or responsive UI.
---

# Styling

Use Tailwind classes with semantic tokens from `src/index.css`. Avoid hardcoded hex values, arbitrary values, and inline styles for design tokens.

```tsx
<div className="bg-background p-4 rounded-lg" />
<p className="text-foreground text-sm font-medium" />
```

## Semantic Tokens

Prefer these classes:

- `bg-background`, `text-foreground`
- `bg-card`, `text-card-foreground`
- `bg-muted`, `text-muted-foreground`
- `bg-primary`, `text-primary`, `text-primary-foreground`
- `text-destructive`, `bg-destructive`
- `border-border`, `border-input`

## Radius

- `rounded-md`: compact controls
- `rounded-lg`: buttons, inputs, small panels
- `rounded-lg`: cards and standard containers
- `rounded-2xl`: large dialogs/sheets only
- `rounded-full`: avatars, pills

Do not use `rounded-3xl` or larger in new UI.

## Typography

Use `<Typography variant="...">` — nunca escreva raw `<h1>/<p>/<span>` para texto de conteúdo.

```tsx
import { Typography } from "@/components/typography";

<Typography variant="display-lg">Título principal</Typography>
<Typography variant="body-md" className="text-muted-foreground">Descrição</Typography>
<Typography variant="title-sm" as="h3">Card title</Typography>
```

Variantes mais usadas: `display-lg/md/sm`, `title-lg/md/sm`, `body-md/sm`, `caption`, `nav-link`, `section-label`.
Ref completa: `.claude/skills/typography/SKILL.md`.

## Spacing

- Page sections: `gap-6`, `p-4`, `px-4`, `p-6`.
- Inside cards/forms: `gap-3` or `gap-4`.
- Reserve `gap-1` and `gap-2` for compact internal groups.

## Responsive Layout

Use stable responsive constraints:

- `grid`, `flex`, `min-w-0`, `max-w-*`, `overflow-hidden`.
- Keep table and toolbar controls from shifting size on hover/loading.
- Ensure text fits on mobile and desktop.

## What Not To Do

- `bg-[#...]` when a token exists.
- `text-[15px]` when `text-sm` or `text-base` works.
- `rounded-[10px]` when `rounded-lg` works.
- Inline `style` for colors, spacing, radius, or typography.
