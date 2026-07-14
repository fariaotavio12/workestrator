# Workestrator

Workestrator é uma aplicação (SPA React + app desktop Electron) para montar e rodar **squads de agentes de IA que colaboram automaticamente para cumprir uma tarefa**. Um agente coordenador (o "orquestrador") decide dinamicamente, passo a passo, qual agente da equipe age em seguida — não existe um fluxo/pipeline fixo pré-desenhado.

## Índice

- [Conceito e domínio](#conceito-e-domínio)
- [Como funciona uma execução](#como-funciona-uma-execução)
- [Páginas do produto](#páginas-do-produto)
- [Arquitetura de código](#arquitetura-de-código)
- [Por que existe um app Electron](#por-que-existe-um-app-electron)
- [Autenticação](#autenticação)
- [Rotas](#rotas)
- [Ambientes e variáveis](#ambientes-e-variáveis)
- [Comandos](#comandos)
- [Design system](#design-system)

## Conceito e domínio

Toda a modelagem do domínio ("client-only", sem persistência própria além do backend) vive em `src/features/security/orchestrator-shared/`.

- **Squad**: a unidade central — um "escritório" com nome, ícone, `trigger` de execução (`manual`, `schedule` — a cada 5 min / 1h / diário —, ou `onComplete`, encadeado a outro squad), uma lista de `agents` (biblioteca própria do squad, não compartilhada entre squads), uma lista de `seats` (cadeiras), a config do `orchestrator` (o coordenador) e um `runtime` (estado efêmero de execução em andamento).
- **Agent**: pertence a um squad específico. Tem `name`, `role`, `systemPrompt`, um `modelRef` (provider + modelo escolhido), referências a `scriptIds` (não guarda cópia do script, só o id), `canExecute` (habilita ferramentas reais — Bash/Read/Write/Edit — numa pasta de trabalho escopada, sem sandbox real, com auto-aceite) e `requiresCheckpoint` (pausa o run pedindo aprovação humana antes de chamar esse agente). Também carrega metadados visuais (`character`, `gender`, `accentColor`) usados no "escritório".
- **Seat**: posição fixa num grid (col/row) do escritório do squad — pode estar vazia ou ter um `agentId` sentado nela.
- **Script**: biblioteca compartilhada e reutilizável de ferramentas que os agentes podem usar. Três tipos (`ScriptKind`):
  - `command` — aponta para um binário já existente (ex.: `npm test`);
  - `inline` — corpo de script escrito pelo usuário, materializado em arquivo só quando o agente que o usa tem `canExecute: true`;
  - `file` — referencia um caminho absoluto no disco do runner, lido ao vivo (nunca copiado) — só providers locais (`claude-cli`) conseguem resolver.
- **ModelProvider**: cadastro de quem executa os agentes — um CLI local já autenticado na máquina (`claude-cli`, `codex-cli`, `gpt-cli`) ou uma API externa (`anthropic-api`, `openai`, `openai-compat` com `baseUrl` customizada). A API key nunca é persistida em claro: só um `apiKeyRef` (nome de uma variável de ambiente) fica no client — o valor real só existe no lado do runner/servidor.
- **OrchestratorConfig**: o coordenador do squad — tem seu próprio `systemPrompt`, `modelRef` e um `maxSteps` (guardrail contra loop infinito/custo, encerra o run mesmo sem decisão "done").
- **Runtime**: estado efêmero (nunca persistido) de uma execução em andamento — `status` (`idle`/`running`/`paused`/`completed`/`checkpoint`/`awaiting_input`/`aborted`), `currentStep`, `perAgentStatus` por cadeira, `log`, `streamingText` (texto sendo gerado ao vivo) e `pendingQuestion`/`pendingQaHistory` (quando um agente pergunta algo no meio do turno, pausando o run até o usuário responder).
- **RunRecord** (Execution): o histórico persistido — id, `squadId`, `input` (briefing inicial), `status`, lista de `steps` com `Artifact` (saída de cada passo, que vira o "handoff" para o próximo agente) e `qaLog` (perguntas/respostas ocorridas durante o run).

O estado do domínio se divide em duas fontes bem separadas:

- **Server state** (providers, squads, scripts, runs) vive em **TanStack Query**, em pastas `api/` feature-local (`squads`, `squad-detail`, `scripts`, `models`, `executions`).
- **Runtime efêmero** (nunca persistido) vive em **Zustand** (`use-orchestrator-runtime-store`), só dentro de `orchestrator-shared/model`.

## Como funciona uma execução

O motor de execução (`orchestrator-shared/runtime/orchestrator-runtime.ts`) é module-level (funções soltas, não hooks) — o run precisa continuar mesmo se o componente React que o iniciou for desmontado (o usuário pode navegar para outra tela enquanto o squad continua trabalhando).

1. `startRun(squadId, input)` valida que há ao menos uma cadeira ocupada, cria um `RunRecord` em memória (`activeRuns`, um `Map` module-level — persistido no backend de uma vez só, ao final do run) e chama `advanceOrchestrated`.
2. `advanceOrchestrated` monta um prompt para o **coordenador** com o briefing, as cadeiras ocupadas disponíveis e o histórico do que já rodou, pedindo que ele responda em JSON qual `seatId` deve agir a seguir (ou `"done"`).
3. Se o agente escolhido tem `requiresCheckpoint: true`, o run pausa em status `checkpoint`, esperando `resolveCheckpoint(squadId, approved)`.
4. Senão, `runOrchestratedAgentStep` chama de verdade o provider configurado naquele agente (`callAgentStep`), passando `systemPrompt` + prompt (com o output do passo anterior como contexto, mais os scripts anexados se `canExecute`), atualizando `runtime.streamingText` conforme os chunks chegam via SSE.
5. Se a resposta for interpretada como uma pergunta (`parseAgentTurn`), o run pausa em `awaiting_input` até `answerPrompt` ser chamado; senão o conteúdo vira um `Artifact`, o passo é registrado no `RunRecord` e `advanceOrchestrated` roda de novo — repete até o coordenador responder `"done"` ou bater `maxSteps`.
6. `pauseRun` / `resumeRun` / `stopRun` / `resetRun` controlam esse ciclo. Ao terminar, `finishRun` persiste o `RunRecord` final via API e invalida a query de execuções daquele squad.

### `model-client.ts` — como o browser fala com o provider de IA

Toda chamada de modelo passa por `POST /api/run-step`, em streaming via **SSE**: eventos `chunk` (texto incremental, alimenta `streamingText`), `done` (resolve com `{ output, usedFallbackModel }`) ou `error` (classificado em `AgentCallError` com `code`: `unauthenticated` / `rate_limited` / `unsupported_provider` / `unknown`).

Nenhuma API key trafega pelo navegador — o client só manda a `apiKeyRef` (nome da variável), e é o servidor (middleware dev do Vite ou o servidor local do Electron) quem resolve o valor real via `process.env`. O `baseUrl` muda conforme o ambiente:

- no navegador (`vite dev`), as chamadas caem no middleware dev-only registrado em `vite.config.ts`;
- no app Electron empacotado, `window.__ORCH_API__.baseUrl` (injetado pelo preload) aponta para o servidor HTTP local do processo main — mesmo handler compartilhado (`electron/runner/runner.ts`), hosts diferentes.

## Páginas do produto

- **Squads** (`/orquestrador/squads`) — lista/tabela de squads existentes, com nome, ícone, descrição, gatilho (Manual/Agendado/Encadeado) e um badge de status ao vivo (lido do Zustand runtime store). Ações: criar, duplicar, excluir; clicar na linha abre o detalhe.
- **Squad Detail** (`/orquestrador/squads/:id`) — tela principal de montagem: mostra o "escritório" (`OfficeCanvas`) com as cadeiras num grid e o coordenador central. O usuário pode editar dados do squad, adicionar cadeiras (até `MAX_SEATS`), criar agentes, sentar/trocar um agente numa cadeira, configurar o coordenador (`systemPrompt`, modelo, `maxSteps`) e disparar uma execução (informando o briefing/input). Durante uma execução ativa, editar cadeiras/squad fica bloqueado.
- **Scripts** (`/orquestrador/scripts`) — biblioteca compartilhada de scripts (comando, inline ou arquivo) que qualquer agente pode referenciar como ferramenta.
- **Modelos** (`/orquestrador/modelos`) — cadastro de providers de modelo (CLI local Claude/Codex/GPT, Anthropic API, OpenAI, OpenAI-compat), modelos disponíveis e referência de API key (nunca a key em si).
- **Execuções** (`/orquestrador/execucoes`) — dashboard agregando o histórico de runs de todos os squads (busca as runs de cada squad conhecido e junta em memória, já que não existe endpoint de "todas as runs"). Mostra métricas (execuções nos últimos 7 dias, taxa de sucesso, nº de squads, tempo médio), um gráfico semanal e a lista de execuções recentes.

## Arquitetura de código

Vertical feature slices. Domínio de UI, API, tipos, hooks, validação e helpers locais ficam em `src/features/<feature>`.

Infraestrutura compartilhada fica em:

- `src/app` — providers, roteamento, hooks globais, constantes de rota e utilitários app-wide.
- `src/components/ui` — primitivas de UI reutilizáveis.
- `src/components/modules` — módulos compostos reutilizáveis.
- `src/lib` — helpers genéricos não-domínio.
- `src/lib/api` — clients, tipos e utilitários de API compartilhados.

Não recriar `src/api` — API de domínio vive em `src/features/<feature>/api`.

## Por que existe um app Electron

Os providers "reais" hoje são **CLIs locais já autenticados na máquina do usuário** (`claude`, `codex`, `gpt`). O runner literalmente faz `spawn()` desses binários (`electron/runner/runner.ts`), lê a saída e monta os argumentos de execução não-interativa específicos de cada CLI (incluindo flags de auto-aceite de permissões quando `canExecute` está ligado). Isso exige um processo Node com acesso a `child_process`, PATH do sistema e disco — algo que um browser puro não pode fazer.

O app desktop resolve isso rodando um **servidor HTTP local** (`electron/runner/server.ts`, porta efêmera em `127.0.0.1`, protegido por um token de sessão gerado no boot) dentro do processo main, hospedando `/api/run-step` e `/api/list-models` — os mesmos handlers usados pelo middleware de dev do Vite, então a lógica de negócio é 100% compartilhada entre "rodando local em dev" e "app empacotado". `electron/main.ts` também corrige o `PATH` em macOS/Linux (apps GUI não herdam o PATH do shell do usuário) e expõe um diálogo nativo do SO para escolher arquivo/diretório ao configurar scripts do tipo `file`.

O `electron/preload.ts` é a ponte de segurança: com `contextIsolation` ligado e `nodeIntegration` desligado, o renderer nunca tem acesso direto a Node/`child_process`. Ele expõe só `window.__ORCH_API__` via `contextBridge`, contendo `baseUrl` e `token` (lidos de argumentos passados à `BrowserWindow`) e `selectPath()` (invoca o IPC de seleção de arquivo). É esse objeto que `model-client.ts` checa para decidir para onde mandar as requisições e qual header de token anexar — ausente no navegador puro.

### Release automática do executável

`.github/workflows/electron-release.yml` builda o app (Windows/macOS/Linux, em paralelo) a cada push na `main` e publica os instaladores como assets de uma release no GitHub via `electron-builder --publish always` (script `electron:release`). Usa o `VITE_API_URL` de `.env.electron` (produção), não o de `.env.main` — o build empacotado roda com `--mode electron`, não `--mode main`. Como a versão em `package.json` não é bumpada automaticamente, cada push atualiza os assets da mesma release/tag; para releases versionadas de fato, bump o `version` do `package.json` antes do merge.

## Autenticação

Autenticação contra o backend próprio (`apps/api`, via `VITE_API_URL`). O modelo é híbrido: o backend seta um **cookie HttpOnly** no login (axios com `withCredentials`), e o token também é salvo localmente como caminho alternativo Bearer. No mount, a aplicação sempre tenta hidratar o usuário logado (`isInitializing` bloqueia a UI enquanto isso não resolve); também lê um parâmetro `?token=` da URL (fluxo de OAuth/redirect) e o persiste. O contexto (`src/app/providers/authProvider.tsx`) expõe `user`, `login`, `register`, `logout`, `isAdmin` e `isInitializing`/`isLoading`.

## Rotas

Rotas do orquestrador, todas protegidas por middleware de autenticação e dentro do layout de dashboard:

| Rota | Página |
|---|---|
| `/orquestrador/squads` | Lista de squads |
| `/orquestrador/squads/:id` | Detalhe/montagem de um squad |
| `/orquestrador/scripts` | Biblioteca de scripts |
| `/orquestrador/modelos` | Cadastro de model providers |
| `/orquestrador/execucoes` | Dashboard de execuções |

Fora do orquestrador existem rotas públicas (login/registro/recuperação de senha, landing page), o design system (`/design-system`) e 404.

## Ambientes e variáveis

```sh
VITE_API_URL
```

O `mode` do Vite controla qual `.env.<mode>` é carregado e, no build, o `base` de assets:

| Script | Mode | `.env` usado | Uso |
|---|---|---|---|
| `npm run dev` | `localhost` | `.env` (`http://localhost:8080`) | desenvolvimento local contra o backend local |
| `npm run build:dev` | `dev` | `.env.dev` | build para ambiente de homologação |
| `npm run build:main` | `main` | `.env.main` (`https://workestrator.zappyon.com`) | build de produção |
| `npm run electron:dev` / `electron:build` | `electron` | conforme configurado | app desktop empacotado (`base: "./"`, necessário porque o Electron carrega via `file://`) |

O plugin `orchestratorRunnerPlugin` em `vite.config.ts` registra os middlewares dev-only (`/api/run-step`, `/api/list-models`) delegando para os handlers de `electron/runner/runner.ts` — só existe rodando `vite dev`, nunca em build/preview de produção (lá quem atende essas rotas é o processo Electron).

## Comandos

```bash
npm run dev              # Vite dev server com HMR
npm run build             # Compilação TypeScript + build Vite
npm run build:dev         # Build para ambiente de homologação
npm run build:main        # Build para produção
npm run lint              # ESLint
npm run format             # Prettier (write)
npm run format:check      # Prettier (check)
npm run preview           # Preview do build de produção
npm run electron:dev      # App Electron em modo dev (Vite + servidor local)
npm run electron:build    # Build + empacotamento do app desktop (electron-builder)
npx tsc --noEmit -p tsconfig.app.json   # Typecheck (o tsconfig.json da raiz é um arquivo "solution"
                                          # vazio — sempre rodar contra tsconfig.app.json)
```

Vitest está disponível para testes unitários focados — usar principalmente para lógica pura de orquestração (store, runner, triggers, migrações).

## Design system

Página de referência: `src/features/public/design-system/page-design-system.tsx`, disponível em `/design-system` — mostra cada componente com snippet de código e forma de uso.

Tokens de design (cores, radius, shadows) vivem em `src/index.css`, dentro de `@theme inline` e `:root`. A paleta é de orquestração técnica: superfícies neutras, acentos azul/cyan de execução, verde de sucesso, âmbar de checkpoint e vermelho de falha/estados destrutivos. Sempre usar variáveis CSS semânticas (`var(--primary)`, `var(--muted)`), nunca hex cru em componentes.
