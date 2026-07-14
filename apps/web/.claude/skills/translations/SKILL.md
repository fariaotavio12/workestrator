---
name: translations
description: Copy and internationalization rules for this React Vite web app. Use when adding user-facing text, choosing translation keys, or maintaining PT/EN copy. For the file model and the step-by-step screen migration, use the `i18n-screens` skill.
---

# Translations

This app is **i18n-enabled** (PT-BR default, EN secondary) via **i18next + react-i18next**. Every new user-facing string must be a translation key present in **both** `pt` and `en` — no hardcoded UI text.

## Copy rules

- PT-BR is the source of truth and the fallback language; EN mirrors its keys.
- Keep copy consistent and concise; match the existing product voice.
- Do not hardcode raw API error messages; use `getApiErrorMessage` (generic copy lives in the `errors` namespace).
- Do not translate code identifiers, API enum values, route paths, or the "Liftz" brand.
- `pt-en-tabs` is a different layer — bilingual **entity content** typed in forms — not UI strings. They coexist.

## Structure

```txt
src/app/i18n/                              # init, config, resources.ts, react-i18next.d.ts, types.ts, hooks
src/translations/{pt,en}.json              # global: common / language / validation / errors
src/features/<feature>/translations/{pt,en}.json   # feature copy, wrapped under its key
src/components/<shared>/translations/{pt,en}.json   # shared-component copy
```

- **Single `translation` namespace**; keys are accessed flat: `t("auth.login.title")`. Each file is wrapped under one unique top-level key and spread into `resources.ts`.
- Co-located: feature copy lives next to its code; cross-cutting copy in root `src/translations/`.
- Use the hooks from `@/app/i18n`: `useT()` (no namespace), `useLanguage()`, `useFormat()`, `translate()`. Selector: `<LanguageSwitcher />` from `@/components`. Keys are type-safe (`TxKeyPath`) — autocomplete + compile error on a missing key.

## How to implement / migrate

See the **`i18n-screens`** skill for the exact file model, the `resources.ts`/`resources.d.ts` wiring, the PT/EN parity validation script, and the per-screen migration steps. The **`i18n`** agent automates it for a given screen or feature.
