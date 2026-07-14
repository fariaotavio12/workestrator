---
name: typography
description: Typography system for this React Vite web app. Use when writing any text content, headlines, labels, descriptions, or captions. Read before adding any text element to a page or component.
---

# Typography

## Regra

**Nunca** escreva `<h1>`, `<h2>`, `<p>`, `<span>` ou similar para texto de conteúdo.
Sempre use `<Typography variant="...">`.

```tsx
import { Typography } from "@/components/typography";
```

O componente aplica a classe CSS de mesmo nome que a variante (definidas em `@layer components` em `src/index.css`) e renderiza o elemento semântico correto por padrão.

## Variantes disponíveis

| Variante | Tamanho | Peso | Quando usar |
|---|---|---|---|
| `display-xl` | 64px | 600 | Hero único acima da dobra |
| `display-lg` | 48px | 600 | Título de seção principal |
| `display-md` | 36px | 600 | Título de página interna |
| `display-sm` | 28px | 600 | Sub-seção ou card destaque |
| `title-lg` | 22px | 600 | Nome de plano, modal title |
| `title-md` | 18px | 600 | Card title, intro de seção |
| `title-sm` | 16px | 600 | Card title pequeno, label de lista |
| `body-md` | 16px | 400 | Texto corrido |
| `body-sm` | 14px | 400 | Texto secundário, rodapé |
| `caption` | 13px | 500 | Badge label, legenda |
| `button` | 14px | 600 | Botões — aplicado automaticamente via CVA no Button |
| `nav-link` | 14px | 500 | Itens de nav |
| `hero-title` | 64px | 600 | Hero com fonte display |
| `hero-description` | 18px | 400 | Parágrafo abaixo do hero |
| `section-label` | 12px | 600 uppercase | Rótulo de seção tipo "01 — COLOR PALETTE" |
| `section-heading` | 48px | 600 | Heading de seção longa |
| `section-intro` | 16px | 400 | Introdução de seção |
| `ui-header` | 13px | 600 | Cabeçalho de painel/card pequeno |
| `inline-link` | — | 500 underline | Link inline em prosa |

## Prop `as`

O elemento HTML padrão é semântico por variante (ex: `display-xl` → `h1`, `body-md` → `p`, `caption` → `span`).
Use `as` para substituir quando o elemento semântico não for adequado ao contexto:

```tsx
<Typography variant="title-sm" as="h3">Section title</Typography>
<Typography variant="body-md" as="div">Wrapper div</Typography>
<Typography variant="caption" as="p">Legenda em parágrafo</Typography>
```

## Exemplos por contexto

### Página / hero
```tsx
<Typography variant="display-lg" className="text-foreground">
  Base calma, consistente e pronta para produto.
</Typography>
<Typography variant="body-md" className="text-muted-foreground max-w-xl">
  Descrição do produto abaixo do hero.
</Typography>
```

### Card
```tsx
<Typography variant="title-sm">{card.title}</Typography>
<Typography variant="body-sm" className="text-muted-foreground">{card.description}</Typography>
```

### Seção numerada (design system style)
```tsx
<Typography variant="section-label" className="text-muted-foreground">01 — FEATURES</Typography>
<Typography variant="display-sm">O que está incluído</Typography>
<Typography variant="body-md" className="text-muted-foreground">Descrição da seção.</Typography>
```

### Nav
```tsx
<Typography variant="nav-link" as="span">{item.label}</Typography>
```

## O que não fazer

```tsx
// ❌ Errado
<h2 className="text-2xl font-semibold">Título</h2>
<p className="text-sm text-gray-500">Descrição</p>

// ✅ Correto
<Typography variant="display-sm">Título</Typography>
<Typography variant="body-sm" className="text-muted-foreground">Descrição</Typography>
```
