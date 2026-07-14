---
name: icons
description: Icon usage rules for this React Vite web app. Use when adding, styling, or troubleshooting icons from lucide-react or custom SVG/brand icons.
---

# Icons

Use `lucide-react` for app UI icons. Import icons directly and style with `className`.

```tsx
import { Plus, Search } from "lucide-react";

<Plus className="size-4 text-primary" />
<Search className="size-4 text-muted-foreground" />
```

## Buttons

Prefer icon + text for clear actions and icon-only buttons for common tools.

```tsx
<Button type="button">
	<Plus className="size-4" />
	Novo cliente
</Button>
```

For icon-only buttons, include accessible text via `aria-label` or a tooltip.

```tsx
<Button type="button" size="icon" aria-label="Buscar">
	<Search className="size-4" />
</Button>
```

## Custom Icons

Put brand/custom icons in `src/assets` or a local `icons.tsx` file when they are not available in lucide.

## Rules

- Use `lucide-react`, not `lucide-react-native`.
- Use semantic text color classes such as `text-muted-foreground`, `text-primary`, `text-destructive`.
- Keep icon sizing stable with `size-*` classes or explicit `size={16}` when the component pattern already does that.
- Do not add raw SVG inline when a lucide icon exists.
