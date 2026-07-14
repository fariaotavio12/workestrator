# Workestrator Monorepo

This repository contains the Workestrator frontend and backend.

## Start Here

Before planning or editing, read:

1. `AGENTS.md` at the monorepo root.
2. The app-local guidance for the app you are changing.
3. The matching root `.claude` namespace for that app.

## App Map

```txt
apps/
  web/  # React, Vite, Electron client
  api/  # Kotlin, Spring Boot API
```

## Claude Guidance Map

Root `.claude` is organized by app:

```txt
.claude/
  agents/
    web/
    api/
  skills/
    web/
    api/
```

For frontend work:

- Read `apps/web/CLAUDE.md` and `apps/web/AGENTS.md`.
- Use `.claude/skills/web` and `.claude/agents/web`.
- App-local `.claude` remains available at `apps/web/.claude`.

For backend work:

- Read `apps/api/CLAUDE.md`.
- Use `.claude/skills/api` and `.claude/agents/api`.
- App-local `.claude` remains available at `apps/api/.claude`.

Do not add app-specific skills or agents directly under `.claude/skills` or `.claude/agents`. Put them under the correct app namespace.

## Root Commands

```bash
npm run dev:web
npm run dev:api
npm run build
npm run test
npm run verify
```

The root package only orchestrates app commands. Keep app build systems independent:

- `apps/web` uses npm/Vite/Electron.
- `apps/api` uses Gradle/Kotlin/Spring Boot.

## Boundaries

- Keep frontend code in `apps/web`.
- Keep backend code in `apps/api`.
- Use the monorepo root for orchestration, CI, shared docs, and future shared contracts.
- If shared API contracts are added later, prefer a generated contract package under `packages/contracts` instead of coupling Kotlin DTOs directly to TypeScript.
