# Workestrator

Monorepo for the Workestrator product.

## Structure

```txt
apps/
  web/  # React, Vite and Electron client
  api/  # Kotlin and Spring Boot API
```

The root repository is for orchestration, CI, documentation and future shared contracts. Each app keeps its own toolchain and local project rules.

## Apps

- `apps/web`: frontend SPA and Electron desktop client.
- `apps/api`: backend REST API.

## Commands

From the monorepo root:

```bash
npm run dev:web       # start the Vite web app
npm run dev:api       # start the Spring Boot API
npm run build:web     # build the frontend
npm run build:api     # build the backend
npm run verify:web    # frontend lint + build
npm run verify:api    # backend Gradle build
npm run verify        # verify web + API
```

App-local commands still work:

```bash
cd apps/web
npm run dev
npm run verify
```

```bash
cd apps/api
gradlew.bat bootRun
gradlew.bat build
```

## Environment

Frontend:

```txt
apps/web/.env.example
apps/web/.env
apps/web/.env.main
apps/web/.env.electron
```

Backend:

```txt
apps/api/.env.example
apps/api/.env
```

Local `.env` files are ignored by Git. Keep real secrets out of the repository.

## CI and Deploy

GitHub Actions live at the monorepo root:

```txt
.github/workflows/
  ci.yml                # frontend CI
  deploy.yml            # frontend web deploy
  deploy-api.yml        # backend Docker build/deploy
  electron-release.yml  # desktop release
```

The backend deploy builds from `apps/api/Dockerfile`. The frontend deploy builds from `apps/web`.

## Agent Guidance

Read `AGENTS.md` and `CLAUDE.md` at the root before editing. App-specific rules remain close to each app:

```txt
apps/web/AGENTS.md
apps/web/CLAUDE.md
apps/web/.claude
apps/api/CLAUDE.md
apps/api/.claude
```

The root `.claude` folder is namespaced by app:

```txt
.claude/skills/web
.claude/skills/api
.claude/agents/web
.claude/agents/api
```

## Next Steps

- Decide whether the old standalone repositories should be archived after this monorepo is committed and pushed.
- Update any deployment secrets or GitHub repository settings that still point to the old standalone repositories.
- Add a generated API contract package under `packages/contracts` if frontend/backend contract drift becomes painful.
