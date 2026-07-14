# AGENTS.md

This is the Workestrator monorepo.

Before starting any task, check for a `.claude` folder at the monorepo root and inside the app/package you are editing. App-local `.claude` files are the source of truth for that app.

The root `.claude` folder is organized by application:

```txt
.claude/
  agents/
    web/  # frontend agents
    api/  # backend agents
  skills/
    web/  # frontend skills
    api/  # backend skills
```

Use `.claude/skills/web` and `.claude/agents/web` for `apps/web` work. Use `.claude/skills/api` and `.claude/agents/api` for `apps/api` work. Do not add app-specific skills or agents directly under `.claude/skills` or `.claude/agents`.

Current layout:

```txt
apps/
  web/      # React/Vite/Electron client
  api/      # Kotlin/Spring Boot API
packages/  # shared packages can be added later
```

## Commands

From the monorepo root:

```bash
npm run dev          # starts the web app
npm run dev:api      # starts the API
npm run build        # builds web + API
npm run lint         # lints the web app
npm run test         # runs web + API tests
npm run verify       # verifies web + API
```

App-specific commands still work from `apps/web`:

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run verify
```

API-specific commands still work from `apps/api`:

```bash
gradlew.bat bootRun
gradlew.bat build
gradlew.bat test
```

## Architecture

Keep each application self-contained under `apps/<app>`.

For `apps/web`, follow its local `apps/web/AGENTS.md` and `apps/web/.claude` rules. In particular, keep feature API code feature-local and do not recreate `src/api`.

For `apps/api`, follow its local `apps/api/CLAUDE.md` and `apps/api/.claude` rules. Keep its Gradle/Kotlin lifecycle independent from the web app. Use the monorepo root only for orchestration, documentation, CI, and shared contracts.
