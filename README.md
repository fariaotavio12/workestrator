# Workestrator

**Monte squads de agentes de IA que colaboram automaticamente para cumprir uma tarefa — coordenados por um orquestrador que decide, passo a passo, quem age em seguida.**

Não há pipeline fixo. Você monta um "escritório" com agentes (cada um com seu papel, prompt e modelo), senta eles em cadeiras, e um agente coordenador decide dinamicamente qual deles trabalha a cada passo até a tarefa terminar.

> ⚠️ **Projeto em desenvolvimento ativo.** APIs, esquema e telas ainda mudam. Veja [Segurança](#segurança) antes de rodar com execução real habilitada.

> 📋 **Plano atual:** [abra aqui o plano consolidado de arquivos, Instagram, autenticações e runs paralelos](PLANO-ATUAL.md).

![Workestrator em ação](docs/assets/demo.gif)

## Por que é diferente

- **Orquestração dinâmica, não workflow fixo.** O coordenador escolhe o próximo agente a cada passo com base no que já rodou — não um DAG desenhado à mão.
- **Roda com as CLIs locais que você já autenticou.** Em vez de exigir API keys, o runner pode usar o `claude`, `codex` ou `gpt` já logados na sua máquina (também suporta Anthropic API, OpenAI e endpoints OpenAI-compat).
- **App desktop (Electron) para execução real.** Agentes podem usar ferramentas de verdade (Bash/Read/Write/Edit) numa pasta de trabalho escopada, além de scripts e servidores MCP.
- **Checkpoints e perguntas no meio do run.** Um agente pode pausar pedindo aprovação humana ou fazer uma pergunta antes de continuar.
- **Caminho para virar plataforma de comunidade** — compartilhar e importar squads, skills e knowledge bases (veja [`docs/community-platform-plan.md`](docs/community-platform-plan.md)).

## Estrutura

```txt
apps/
  web/  # Cliente React + Vite + Electron
  api/  # API Kotlin + Spring Boot
```

Cada app mantém sua própria toolchain. A raiz do repositório serve para orquestração, CI, documentação e contratos compartilhados futuros.

- [`apps/web`](apps/web/README.md) — SPA React e app desktop Electron. **Comece por aqui** — o README dele explica o domínio (squads, agentes, cadeiras, scripts, runtime) em detalhe.
- [`apps/api`](apps/api/README.md) — API REST (auth, usuários, storage, embeddings).

## Requisitos

- Node.js 20+ e npm
- Java 21 (para o backend)
- PostgreSQL (para o backend)
- Para execução real de agentes via CLI local: `claude`, `codex` ou `gpt` instalados e autenticados no seu PATH

## Quickstart

```bash
git clone https://github.com/fariaotavio12/workestrator.git
cd workestrator

# Frontend
cp apps/web/.env.example apps/web/.env
npm run dev:web        # http://localhost:5173

# Backend (em outro terminal)
cp apps/api/.env.example apps/api/.env   # preencha DB e as variáveis necessárias
npm run dev:api        # http://localhost:8080  (Swagger em /swagger-ui.html)
```

Para rodar o app desktop com execução real de agentes:

```bash
cd apps/web
npm run electron:dev
```

## Comandos (raiz do monorepo)

```bash
npm run dev:web       # Vite dev server
npm run dev:api       # Spring Boot API
npm run build         # build web + API
npm run test          # testes web + API
npm run verify        # lint/build web + build API
```

Comandos por app continuam funcionando de dentro de `apps/web` e `apps/api`.

## Como funciona uma execução (resumo)

1. Você escreve um briefing e dispara o run de um squad.
2. O **coordenador** recebe o briefing + as cadeiras ocupadas + o histórico do run e responde qual agente age em seguida (ou `done`).
3. O agente escolhido é chamado no provider configurado; a saída vira o "handoff" para o próximo passo.
4. Repete até o coordenador dizer `done` ou atingir o `maxSteps`. Checkpoints e perguntas podem pausar o run pedindo interação humana.

O detalhamento completo (motor de execução, streaming SSE, runtime efêmero em Zustand, server state em TanStack Query) está no [README do `apps/web`](apps/web/README.md).

## Roadmap

Direções que quero desenvolver — contribuições nesses temas são muito bem-vindas. Veja também o plano completo em [`docs/community-platform-plan.md`](docs/community-platform-plan.md).

- **Assistente como plataforma** — levar a experiência do app desktop para um assistente-workspace completo (command palette, contexto de skill/squad/knowledge, histórico de runs). Base na Fase 9 do plano de comunidade.
- **Auto-conhecimento (opt-in)** — cada recurso criado (squad, skill, script) carregar uma descrição opcional do que faz e por quê, para o assistente e a comunidade entenderem o propósito sem precisar ler o código.
- 🚧 **Squads com sprints** — design de squad orientado a sprints bem definidas _(em andamento)_.
- **Páginas públicas de melhorias e conhecimento** — roadmap/changelog público e base de conhecimento navegável.
- **Polimento de design e padrões** — refino visual e correção de inconsistências no design system.

## Contribuindo

Contribuições são bem-vindas! Leia o [CONTRIBUTING.md](CONTRIBUTING.md) para o setup local e o fluxo de branches (`dev` → `main`). Antes de mexer no código, veja também `AGENTS.md` e `CLAUDE.md` na raiz.

## Segurança

O runner do Workestrator **executa binários e scripts locais** (com auto-aceite de permissões quando `canExecute` está ligado). Trate squads e scripts importados como código não confiável. Nunca commite segredos — use os arquivos `.env` (gitignored) a partir dos `.env.example`.

Para reportar uma vulnerabilidade, veja [SECURITY.md](SECURITY.md). **Não** abra issue pública para falhas de segurança.

## Licença

[Apache License 2.0](LICENSE) © 2026 Otávio Faria.
