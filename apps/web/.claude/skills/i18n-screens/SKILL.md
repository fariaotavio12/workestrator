---
name: i18n-screens
description: Implement i18n (PT/EN) on a screen or feature in this React Vite web app — co-locate copy in <feature>/translations/{pt,en}.json under a single `translation` namespace, wire resources, and replace hardcoded text with t(). Use when internationalizing a page/component or maintaining/validating translation files.
---

# i18n — implement on screens

The web uses **i18next + react-i18next** with a **single `translation` namespace** and **co-located** translation files (parity with the mobile app). For high-level copy rules see the `translations` skill.

## Canonical layout

```txt
src/app/i18n/
  index.ts            # i18next init (imported once in main.tsx); re-exports config + hooks
  config.ts           # SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, DEFAULT_NS="translation"
  resources.ts        # imports every translations file and SPREADS them into one `translation` object
  react-i18next.d.ts  # augments CustomTypeOptions from PT (single ns) -> type-safe keys
  types.ts            # RecursiveKeyOf -> TxKeyPath (every dot-path key)
  hooks.ts            # useT, useLanguage, useFormat, translate, TxKeyPath
src/translations/
  {pt,en}.json        # GLOBAL/shared: wrapped under common / language / validation / errors
src/features/<feature>/translations/
  {pt,en}.json        # feature copy, wrapped under the feature key
src/components/<shared>/translations/
  {pt,en}.json        # shared-component copy, wrapped under its key
```

- **Co-located**: each feature ships its own `translations/{pt,en}.json` next to its code. Cross-cutting copy (common, validation, errors, language) lives in root `src/translations/`.
- **One file = one top-level key**: `features/public/auth/translations/pt.json` = `{ "auth": { "login": { "title": "..." } } }`. Never wrap twice; never reuse a top-level key across two files (the validator flags collisions).
- **Single `translation` namespace**: every file is spread into one object, so keys are accessed **flat**: `t("auth.login.title")`, `t("common.actions.save")`.
- PT is the default + fallback. For every file, `pt.json` and `en.json` must have identical keys.

## Accessing translations

```tsx
import { useT } from "@/app/i18n";
const { t } = useT(); // no namespace argument — single `translation` ns
t("auth.login.title");
t("dashboard.leagues.participants", { count: n }); // interpolation/plurals
```

- `useFormat()` → `formatDate / formatNumber / formatList` (locale-aware Intl).
- `useLanguage()` → `{ language, setLanguage, toggle, available }`; `<LanguageSwitcher />` from `@/components`.
- `translate(key)` (from `@/app/i18n`) for non-component / module code; not reactive to language change.
- Type-safety is automatic: `react-i18next.d.ts` derives keys from `resources.pt`, so `t()` autocompletes and a wrong/missing key is a compile error. **No manual `.d.ts` edit when adding a feature** — only `resources.ts`.

## Adding / migrating a feature

1. Create `src/features/<feature>/translations/{pt,en}.json`, each wrapped under one top-level key (the feature name, unique across the app).
2. Register in `src/app/i18n/resources.ts`: add the two imports and spread them into `pt.translation` / `en.translation`.
3. In the screen: scan every user-facing string (JSX text, `placeholder`, `aria-label`, `title`, toasts, zod messages). Add a nested key to **both** `pt.json` and `en.json`, then replace the literal with `t("<feature>.<path>")` via `const { t } = useT()`.
4. Dynamic values → interpolation `{{var}}`; plurals → `key_one`/`key_other` + `{ count }`; dates/numbers → `useFormat()`.
5. Zod schemas: build inside the component with `useMemo(() => z.object({...t()}), [t])` (don't keep hardcoded module-level messages).
6. Module-level label maps (enum→label) → i18n keys; resolve inside the component (`t(\`<feature>.type.${value}\`)` or an in-component literal map).
7. API errors keep `getApiErrorMessage`; generic copy in `common`/`errors`.

## Validation

`scripts/validate-translations.mjs` (run via `npm run i18n:check`, wired into `npm test`) globs every `**/translations/{pt,en}.json`, checks PT/EN parity per file, and detects duplicate top-level keys across files. Always finish with: `npm run i18n:check` + `npm run lint` + `npx tsc --noEmit -p tsconfig.app.json` + `npm test`.

## Rules

- **Never** leave hardcoded user-facing text. Every new string gets a key in **both** `pt` and `en`.
- Top-level keys are global (single ns) — keep them unique per file; nest the rest by UI area.
- Do **not** translate code identifiers, API enum values, route paths, or the "Liftz" brand.
- `pt-en-tabs` is a different layer (bilingual **entity content** typed in forms) — never confuse it with UI strings.
- ESLint enforces `func-style`: use arrow consts, not `function` declarations.
