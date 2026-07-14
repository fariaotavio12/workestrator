---
name: code-style
description: Code style, UI component, styling, icon, form, toast, and page implementation rules for this React Vite web app. Use when building or reviewing pages, components, UI states, copy, imports, styling, icons, skeletons, toasts, tables, dialogs, and overlays.
---

# Code Style

Use project primitives before custom UI. Import reusable components from the public barrel `@/components`.

```ts
import { Button, Card, Input } from "@/components";
```

## Pages

- Public page components live in `src/features/public/<feature>`.
- Protected page components live in `src/features/security/<feature>`.
- Prefer `page-<screen>.tsx` for new/migrated pages.
- Keep route logic in `src/app/routing`.
- Use named exports for feature components.
- Use semantic HTML where helpful: `section`, `header`, `main`, `form`, `button`.
- Keep page files as orchestration shells. Extract substantial UI sections into feature-local components under the screen's `components/` folder.
- Componentize when a page grows beyond roughly 250 lines, has multiple independent sections, repeats JSX blocks, or mixes list/table, filters, dialogs, forms, detail panels, and local helper render functions in one file.
- Keep feature-local components near the screen that owns them; do not move domain-specific pieces to `src/components`.

## Naming Language

- Use English for code identifiers, including feature folders, files, functions, hooks, variables, mocks, types, query keys, route constants, schemas, stores, and tests.
- Keep Portuguese in i18n copy, not in code names.
- Mirror Portuguese only when an external backend contract requires it; isolate that external DTO shape in the API layer when possible.

## UI Components

Use existing UI components from `@/components`:

- **Texto de conteúdo:** `<Typography variant="...">` — nunca raw `<h1>/<p>/<span>`
- **Actions:** `Button`, `Badge`, `CustomLink`, `Kbd`, `Toggle`, `ToggleGroup`
- **Forms:** `FieldWrapper` (label + error + description), `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Combobox`, `MultiCombobox`
- **File upload:** `<FileUI.Input>` — nunca `<input type="file">` direto
- **Form footer:** `<FooterButton isSubmitting isCreateMode>` em páginas create/edit
- **Dates:** `DatePicker`, `DateRangePicker`, `Calendar`, `InputOTP`
- **Containers:** `Card`, `CardHeader`, `CardContent`, `CardFooter`
- **Overlays:**
  - Lista de ações → `DropdownMenu`
  - Right-click → `ContextMenu`
  - Config rápida → `Popover`
  - Decisão bloqueante → `Dialog`
  - Auto centro/lateral → `SmartOverlay`
  - Bottom sheet mobile → `Drawer`
  - Painel lateral estruturado → `AppSheet` (header + scroll body + footer)
- **Navigation:** `Tabs`, `Accordion`, `Collapsible`, `Breadcrumb`, `BreadCrumbComponent`
- **Feedback:** `Skeleton`, `QueryErrorState`, `notify`, `ClipBoard`, `Progress`, `Avatar`
- **Charts:** `ChartContainer` wrapping recharts; cores via `var(--primary)`
- **Data:** `ResponsiveTableCustom` para telas/listagens; `TableCustom` apenas para composição reutilizável avançada.

Não criar primitivos UI avulsos se já existe componente local.
Ao adicionar componente reutilizável: pasta própria + `index.ts` + `.stories.tsx` + export em `src/components/index.ts`.
Adicionar exemplo em `src/features/public/design-system/page-design-system.tsx`.

## Tables

Leia também `.claude/skills/tables/SKILL.md` antes de criar, migrar ou revisar qualquer tabela/listagem.

- Em páginas de feature, use `ResponsiveTableCustom` importado de `@/components`.
- Defina colunas via `ColumnDef<TData>[]` e `useMemo`.
- Configure responsividade com `columnDef.meta`: `mobileHeader`, `mobileStatus`, `mobileOrder`, `mobileHidden`, `mobileLabel`, `mobileValueClassName`.
- Passe `pagination`, `onPageChange`, `onSizeChange`, `data`, `columns` e `isPending` para `ResponsiveTableCustom`.
- Use `renderActions` para ações por linha.
- Não monte linhas manualmente com `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>` em páginas.
- Não envolva tabela em `Card`; o componente responsivo já possui superfície, borda, skeleton e footer.

## Tabs

Use sempre a composição completa do componente local:

```tsx
<Tabs defaultValue="list">
	<TabsList>
		<TabsTrigger value="list">Lista</TabsTrigger>
		<TabsTrigger value="tree">Árvore</TabsTrigger>
	</TabsList>

	<TabsContents>
		<TabsContent value="list">...</TabsContent>
		<TabsContent value="tree">...</TabsContent>
	</TabsContents>
</Tabs>
```

- `TabsContent` deve ficar sempre dentro de `TabsContents`.
- Nunca renderize `TabsContent` diretamente como filho de `Tabs`; isso mantém a aba inativa no fluxo da página e pode exibi-la abaixo com blur.
- Não esconda abas inativas manualmente com `blur`, `opacity`, `absolute`, `hidden`, `inert`, `forceMount` ou condicionais improvisadas.
- Use `TabsContents` para controlar a área de conteúdo e garantir que apenas a aba ativa apareça.

## Forms

Use React Hook Form + Zod. Schemas em pasta `schema` ou `form` para formulários não triviais.

```tsx
<FieldWrapper label="Email" htmlFor="email" error={errors.email?.message}>
	<Input id="email" {...register("email")} />
</FieldWrapper>
```

Nunca adicionar `<label>` + `<p>` de erro manualmente — use sempre `FieldWrapper`.

## Toasts

Use the local toast abstraction:

```ts
import { notify } from "@/components";

notify.success("Salvo com sucesso");
notify.error("Nao foi possivel salvar");
```

## Text

Use `<Typography variant="...">` para todo texto de conteúdo. Nunca use raw `<h1>/<p>/<span>` diretamente.

```tsx
import { Typography } from "@/components/typography";
<Typography variant="title-sm">Card title</Typography>
<Typography variant="body-md" className="text-muted-foreground">Descrição</Typography>
```

## Required Patterns

- Use `@/` absolute imports for cross-feature imports.
- Use `type` and `import type` for TypeScript types.
- Prefer arrow functions for new feature code.
- Keep loading, empty, and error states explicit.
- Avoid direct API calls in page components.
- User-facing copy uses i18n: never hardcode strings — add keys to `<feature>/translations/{pt,en}.json` and render via `const { t } = useT()` (`t("<feature>.<path>")`). See the `i18n-screens` / `translations` skills.
