# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with this repository.

This frontend is now part of the Workestrator monorepo at `apps/web`. When working from the monorepo root, also read `../../CLAUDE.md` and `../../AGENTS.md`. Frontend-specific root skills and agents are mirrored under `../../.claude/skills/web` and `../../.claude/agents/web`.

## Commands

```bash
npm run dev              # Start Vite dev server with HMR
npm run build            # TypeScript compilation + Vite build
npm run build:dev        # Build for dev environment
npm run build:main       # Build for production environment
npm run lint             # ESLint check
npm run format           # Prettier format
npm run format:check     # Prettier check
npm run preview          # Preview production build locally
```

Vitest is available for focused unit tests. Use it for pure orchestration logic such as store, runner, triggers and migrations.

## Architecture

This is the Workestrator React/TypeScript SPA: a client-side console for coordinating squads of AI agents, built with Vite, React Router, Tailwind, Radix UI, TanStack Query and Axios. Keep shared infrastructure generic, but product-facing UI and copy should reflect Workestrator.

Use vertical feature slices. Domain UI, API, types, hooks, validation and local helpers belong in `src/features/<feature>`.

Shared infrastructure belongs in:

- `src/app`: providers, routing, global hooks, route constants and app-wide utilities.
- `src/components/ui`: reusable UI primitives.
- `src/components/modules`: reusable composed modules.
- `src/lib`: generic non-domain helpers.
- `src/lib/api`: shared API clients, types and utilities.

Do not recreate `src/api`. Domain API code belongs in `src/features/<feature>/api`.

## Key Patterns

Routing is centralized in `src/app/routing` and route constants live in `src/app/variables/rotas.ts`.

Authentication state lives in `src/app/providers/authProvider.tsx`. Server state should use TanStack Query. Avoid adding global client state unless a feature has a clear cross-screen need.

API services should be wrapped in feature-local `api/service.ts` files and exported through `api/index.ts`. Components and pages should not call Axios directly.

Forms use React Hook Form and Zod. Keep schemas close to the feature or form that owns them.

Use `notify` from `components/ui/toast/notify` for user feedback and `getApiErrorMessage()` for API failures.

## Naming

- Use `@/` absolute imports for cross-feature imports.
- Prefer named exports, arrow functions and `type` for new TypeScript shapes.
- Use `import type` for type-only imports.
- Keep comments concise and only where they clarify non-obvious behavior.

## Environment

```sh
VITE_API_URL
```

Environment files currently point to `http://localhost:8080` and should be changed when the real backend/runner exists.

## Build Notes

- `vite` is overridden to `rolldown-vite@7.2.5`.
- Tailwind v4 is configured through CSS.
- React 19 is used.
