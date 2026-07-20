# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

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
npx tsc --noEmit -p tsconfig.app.json   # Typecheck app code (root tsconfig.json is a no-op solution
                                          # file with `files: []` — `tsc --noEmit -p .` reports 0 errors
                                          # even with real type errors present; always target tsconfig.app.json)
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

## Design System

Design reference page: `src/features/public/design-system/page-design-system.tsx`
Live at `/design-system` — shows every component with code snippet and method of use.

### Tokens

Design tokens (colors, radius, shadows) live in `src/index.css` inside `@theme inline` and `:root`.
Workestrator uses a technical orchestration palette: neutral surfaces, blue/cyan execution accents, green success, amber checkpoints and red failure/destructive states.
Always use semantic CSS vars (`var(--primary)`, `var(--muted)`) and avoid raw hex in components.

### Typography

Typography classes are defined in `@layer components` in `src/index.css`.
Use the `<Typography>` component (`src/components/typography/typography.tsx`) instead of raw HTML.

```tsx
import { Typography } from "@/components/typography";

<Typography variant="display-lg">Título principal</Typography>
<Typography variant="body-md" className="text-muted-foreground">Descrição</Typography>
<Typography variant="title-sm" as="h3">Card title</Typography>
```

Available variants (mapped to CSS classes of the same name):

| Variant | Size / Weight | When to use |
|---|---|---|
| `display-xl` | 64px / 600 | Hero único acima da dobra |
| `display-lg` | 48px / 600 | Título de seção principal |
| `display-md` | 36px / 600 | Título de página interna |
| `display-sm` | 28px / 600 | Sub-seção ou card destaque |
| `title-lg` | 22px / 600 | Nome de plano, modal title |
| `title-md` | 18px / 600 | Card title, intro de seção |
| `title-sm` | 16px / 600 | Card title pequeno, label de lista |
| `body-md` | 16px / 400 | Texto corrido |
| `body-sm` | 14px / 400 | Texto secundário, rodapé |
| `caption` | 13px / 500 | Badge label, legenda |
| `button` | 14px / 600 | Botões (aplicado via CVA no Button) |
| `nav-link` | 14px / 500 | Itens de nav |
| `hero-title` | 64px / 600 | Hero com fonte display |
| `hero-description` | 18px / 400 | Parágrafo abaixo do hero |
| `section-label` | 12px / 600 uppercase | Rótulo de seção tipo "01 — COLOR PALETTE" |
| `section-heading` | 48px / 600 | Heading de seção longa |
| `section-intro` | 16px / 400 | Introdução de seção |
| `ui-header` | 13px / 600 | Cabeçalho de painel/card pequeno |
| `inline-link` | 500 underline | Link inline em prosa |

The `as` prop overrides the rendered element (default is semantic per variant):
```tsx
<Typography variant="title-sm" as="span">inline</Typography>
<Typography variant="body-md" as="div">wrapper</Typography>
```

### Component conventions

**Forms:** wrap every field in `<FieldWrapper label htmlFor description error>`. Never add raw `<label>` + `<p>` manually.

**File upload:** use `<FileUI.Input>` (exported as `FileUI` from `@/components`), not a raw `<input type="file">`.

**Form footer:** use `<FooterButton isSubmitting isCreateMode>` for create/edit page footers.

**Overlays decision tree:**
- Quick action list → `DropdownMenu`
- Right-click area → `ContextMenu`
- Short config with inputs → `Popover`
- Blocking decision → `Dialog`
- Adaptive (auto center/lateral) → `SmartOverlay`
- Mobile-friendly bottom sheet → `Drawer`
- Structured lateral panel (header + scroll body + footer) → `AppSheet`

**Feedback:**
- Temporary confirmation → `notify.success / .error / .warning / .info`
- Data load failure with retry → `ErrorState`
- Empty list/table (no data, not an error) → `EmptyState`
- Copy to clipboard → `<ClipBoard texto="..." />`

**Charts:** always wrap recharts inside `<ChartContainer config={chartConfig}>`. Define colors as `var(--primary)` / `var(--muted-foreground)` inside the config.

**Breadcrumb:** use `<BreadCrumbComponent />` for auto-generation from route. Use the primitives (`Breadcrumb`, `BreadcrumbList`, etc.) for manual composition.

## Tools/Integrations (Script kinds, secrets, MCP, scheduler)

`Script` (feature `scripts`) doubles as the "Tool" model — `kind: command | inline | file` execute locally in the runner's scoped workspace; `kind: http | mcp | connector` are resolved by the Electron runner (`electron/runner/runner.ts`) into an `.mcp.json` plugged into the Claude CLI via `--mcp-config --strict-mcp-config` (only when `canExecute` and `providerKind === "claude-cli"`). See `docs/plano-integracoes-e-flow-builder.md` for the full design.

- **Tool calling em providers OpenAI-compat (Ollama/vLLM/LM Studio/OpenAI)**: `callOpenAiCompat` roda um loop de function calling próprio (`electron/runner/openai-tools.ts` + `resolveOpenAiTools` em `runner.ts`), porque esses providers não passam pela Claude CLI e portanto não têm `--mcp-config`. Só ferramentas de **rede** entram: `http` (fetch declarativo, mesma `HttpToolDef` do `http-tool.mjs`) e `mcp`/`connector` (cliente MCP de verdade via `@modelcontextprotocol/sdk/client`, stdio ou streamable HTTP). `command`/`inline`/`file` ficam de fora de propósito — quem concede execução local é a CLI, com as guardas dela, e não há equivalente aqui. Consequência: `buildAgentPrompt` (`orchestrator-runtime.ts`) **não** anuncia scripts executáveis quando `providerKind` é `openai`/`openai-compat` — anunciar capacidade que o transporte não entrega fazia o agent gastar o turno tentando, não fechar o passo, e o coordenador redispachar em loop (era o bug de "loop infinito" em vez de chamar a tool). Guardas do loop: teto de `MAX_TOOL_ITERATIONS` rodadas, resultado de tool truncado em 8k chars (janela curta de modelo local), nome de tool alucinado volta como erro com a lista das que existem (o modelo se corrige na rodada seguinte) e 400 citando tools vira mensagem explicando que o modelo escolhido não suporta function calling.
- **Modelos "thinking" (qwen3, deepseek-r1, gpt-oss…)**: mandam a cadeia de raciocínio num campo separado do delta, com `content` vazio o tempo todo até concluírem. O nome do campo não é padronizado — Ollama usa `delta.reasoning`, DeepSeek/vLLM/OpenRouter usam `delta.reasoning_content`; `readReasoning` lê os dois. Ignorar isso fazia o parser acumular string vazia e reportar "O endpoint não retornou nenhum texto" mesmo com o modelo funcionando (verificado ao vivo contra `qwen3.5:9b`: ~198 chunks de `reasoning` e só então um `tool_calls` completo num único chunk). O raciocínio vira evento SSE `thinking` (já renderizado pela UI), acumulado em blocos de `THINKING_FLUSH_CHARS` — um evento por token criaria centenas de itens no painel de atividade. Quando o turno fecha só com raciocínio e sem resposta, o erro cita o fim do `reasoning` em vez de uma mensagem genérica.
- **Rodar squad no navegador (sem Electron)**: `requireRunner(squadId)` libera o run fora do desktop quando as duas condições valem — `runStepEndpointAvailable()` (servidor local do Electron **ou** `import.meta.env.DEV`, já que o middleware de `vite.config.ts` só existe em `vite dev`) e `isApiOnlySquad(squad, providers)` (coordenador + agents **sentados** todos em provider de API; `claude-cli`/`codex-cli`/`gpt-cli` exigem binário local). No build publicado não há quem atenda `/api/run-step` — a API Kotlin não tem esse endpoint —, então lá o gate segue fechado e a UI explica o motivo real (CLI local vs. web sem executor) em vez do texto único antigo.

- **Secrets are encrypted at rest in the backend** (AES-256-GCM, `SecretCipher.kt`, master key via `SECRETS_MASTER_KEY`) — not just a local vault. `GET /secrets/{id}/value` resolves the decrypted value, scoped by `@GetUserId`, called only by the runner (never the browser). `apiKeyRef`/`authRef` reference a `Secret.id` (not a label). `electron/secrets-vault.ts` is now only an optional offline read-through cache (`SecretCache`) if the backend is briefly unreachable — the backend is the source of truth. A single `resolveSecret`/`applyAuthToHttpTarget` path in `runner.ts` covers both the LLM provider's `apiKeyRef` and tools' `authRef`, across 7 `authType` schemes (bearer/header/query/basic/oauth2_client_credentials/oauth2_refresh/raw) — see plan doc §8.
- `kind: http` scripts spawn a generic local MCP server (`electron/mcp-servers/http-tool.mjs`); `kind: connector` with `connectorProvider: "youtube"` spawns `electron/mcp-servers/youtube.mjs` (wraps the `yt-dlp` binary, must be on the user's PATH — not bundled; official Data API v3 mode is optional via `WORKESTRATOR_YOUTUBE_API_KEY`). Other connectors (Composio/Zapier/n8n) require `config: '{"gatewayUrl": "..."}'` — there's no guessed default URL.
- **Scheduler local**: `orchestrator-shared/runtime/scheduler.ts`, mounted via `<OrchestratorScheduler />` in `security/layout.tsx`. Polls every 30s for squads with `trigger: { type: "schedule", enabled: true }` and fires `startRun(squadId, briefing, "schedule")`. Runs in the **renderer** (not the Electron main process) — deliberately, to reuse `orchestrator-runtime.ts`'s module-level engine instead of inventing a new main→renderer IPC channel. Only fires while the app window is open.
- **Coordenador e histórico de runs**: por padrão o coordenador (`buildCoordinatorPrompt`) só vê o run atual (briefing + `buildCoordinatorHistory(run.steps)`), **nunca** execuções passadas. A flag opt-in `OrchestratorConfig.useRunHistory` (toggle "Consultar histórico" no `orchestrator-config-dialog`; coluna backend `orchUseRunHistory boolean default false` em `SquadEntity`) faz o `startRun` carregar `buildRunHistorySummary` (últimos 5 runs: data + briefing + resultado resumido, orçado em ~1500 chars) via `fetchRunsApi` e injetar no prompt do coordenador — pra ele evitar repetir temas. Só o coordenador recebe; agents não. Carregado só no `startRun` (não em continue/retry).
- **Snapshot de arquivos por run (histórico)**: o workspace do runner (`orchestrator-workspace/`) é único e resetado a cada `startRun`, então arquivos de um run somem no próximo. Ao finalizar (`persistFinishedRun` em `orchestrator-runtime.ts`), o runtime chama `snapshotRun(runId)` → `POST /api/snapshot-run` (`runner.ts` `handleSnapshotRun`), que copia os arquivos alterados (via git) para `orchestrator-workspace/.runs/<runId>/` (preservado pelo reset) e devolve o manifesto, persistido em `RunRecord.files` (backend: coluna `jsonb default '[]'` em `RunEntity`). O histórico (`squad-history-dialog` → `run-detail-sheet`) lista os arquivos e faz preview via `registerPreviewRoot({ runId })`. Só há arquivos reais no app Electron (runner com fs); no browser/dev o manifesto ainda aparece, mas sem preview.
- Backend Kotlin compile was never verified in this environment (Gradle daemon can't establish a loopback connection here) — run `./gradlew compileKotlin` before relying on backend changes. Backend code now lives at `../../apps/api` in this monorepo. Keep using the backend Gradle checks from `apps/api`; `spring.jpa.hibernate.ddl-auto=update` is still the current local schema behavior unless the API docs say otherwise.
- `npm run test` runs the full Vitest suite (wired as of this session). MCP-resolution and scheduler decision logic have dedicated coverage in `electron/runner/runner.test.ts` and `orchestrator-shared/runtime/scheduler.test.ts`.
- **Conectores (catálogo + OAuth "Conectar")**: `secrets/connectors-catalog.ts` holds static presets (Google, Slack, Notion, GitHub, Composio, custom) rendered as cards on `page-secrets.tsx` via `ConnectorCard`. `Secret.connectorId` (backend column, not `metadata` — keys outside `KNOWN_AUTH_METADATA_KEYS` leak into request headers, see runner.ts) maps a secret back to its preset for the status pill. Presets with `authUrl` (Google, Slack) drive `ConnectOAuthDialog`, which calls `window.__ORCH_API__.connectOAuth` (Electron IPC `oauth:connect` → `electron/oauth-flow.ts`, `authorization_code` + PKCE via a loopback server — RFC 8252) instead of the manual paste-token form; presets without it fall back to `SecretFormDialog` prefilled. The OAuth result is stored as a plain `oauth2_refresh` secret (no new `SecretAuthType` needed) so it reuses the rotation logic below untouched.
- **OAuth2 token rotation**: `exchangeOAuth2Token` in `runner.ts` persists a reissued `refresh_token` back to the backend via `ResolvedSecret.rotate()` (closure created in `createBackendSecretResolver`, calls `PUT /secrets/{id}/value`) — without this, providers that rotate refresh tokens (Google, GitHub App, Notion) silently break on the second run. Token cache is keyed by `secretId:clientId:scopes`, not `tokenUrl:clientId` (would collide across two secrets of the same provider), and a failed exchange evicts the cache entry so reconnecting actually retries.
- `/api/test-secret` (runner.ts `handleTestSecret`, wired in `server.ts` and the `vite dev` middleware in `vite.config.ts`) backs the "Testar conexão" button — does a real token exchange for `oauth2_*` secrets, otherwise just confirms a value is set (no generic way to hit an arbitrary provider for non-OAuth schemes).
- Browser preview tools (`preview_screenshot`/`preview_eval`/claude-in-chrome) were unavailable in this environment during the connectors work — verification for that change relied on `tsc`/`eslint`/`vitest` plus a clean dev-server boot (checked via `preview_logs`), not an actual click-through. Re-verify visually before shipping if that matters.

## Build Notes

- `vite` is overridden to `rolldown-vite@7.2.5`.
- Tailwind v4 is configured through CSS.
- React 19 is used.
- Known issue: HMR loop on dev server due to non-component exports in some files (authProvider, button). Hard reload (`Ctrl+Shift+R`) on `http://localhost:5173` resolves a blank page.
