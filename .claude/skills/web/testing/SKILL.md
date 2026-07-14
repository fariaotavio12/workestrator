---
name: testing
description: Testing rules for this React Vite web app. Use when writing, reviewing, or planning unit tests, component tests, route tests, API hook tests, or E2E/browser flows.
---

# Testing

This project does not currently have a complete test framework configured. When adding tests, prefer web tooling:

- Unit/component: Vitest or Jest + React Testing Library.
- E2E/browser: Playwright.

Do not use React Native Testing Library or Maestro in this web app.

## Component Tests

Prefer a shared test utility wrapper once tests are configured:

```txt
src/lib/test-utils.tsx
```

It should include providers needed by components: QueryClient, Router, Theme/Auth mocks as appropriate.

## Rules

- Place tests next to the file: `component.test.tsx`.
- Test visible behavior, not implementation details.
- Use `data-testid` only when accessible queries are not stable enough.
- Prefer `screen.getByRole`, `getByLabelText`, and user-event interactions.
- Mock API boundaries, not local component internals.
- Add focused tests when migrating feature API code or auth/routing behavior.

## E2E

Use Playwright for critical user flows after it is configured:

```txt
e2e/
  auth.spec.ts
  dashboard.spec.ts
```

Critical flows: login, protected route redirect, main CRUD flows, payment/subscription states.
