# Contribuindo com o Workestrator

Obrigado pelo interesse em contribuir! Este guia cobre o setup local e o fluxo de trabalho.

## Antes de começar

- Leia `AGENTS.md` e `CLAUDE.md` na raiz, mais o guia do app que você vai mexer (`apps/web/CLAUDE.md` ou `apps/api/CLAUDE.md`).
- Para mudanças grandes ou que afetam a arquitetura, **abra uma issue antes** para alinhar a abordagem — evita retrabalho.
- Ao rodar com execução de agentes habilitada, leia [SECURITY.md](SECURITY.md): o runner executa código local.

## Setup local

Requisitos: Node.js 20+, npm, Java 21, PostgreSQL. Para execução real de agentes via CLI, ter `claude`/`codex`/`gpt` autenticados no PATH.

```bash
git clone https://github.com/fariaotavio12/workestrator.git
cd workestrator

# Frontend
cp apps/web/.env.example apps/web/.env
npm run dev:web

# Backend
cp apps/api/.env.example apps/api/.env   # preencha as variáveis
npm run dev:api
```

## Fluxo de branches

O branch de integração é **`dev`**. `main` é promovido a partir de `dev` apenas via PR controlado pelo mantenedor.

```bash
git switch dev
git pull origin dev
git switch -c feature/minha-mudanca
```

- Crie sua branch a partir de `dev`.
- Abra o PR **contra `dev`**, não `main`.
- Use nomes descritivos: `feature/...`, `fix/...`, `docs/...`.

## Antes de abrir o PR

Rode as verificações localmente:

```bash
npm run verify        # lint/build do web + build da API
npm run test          # testes web + API
```

Para o frontend, o typecheck deve mirar o tsconfig do app:

```bash
cd apps/web && npx tsc --noEmit -p tsconfig.app.json
```

## Padrões de código

- **Frontend:** vertical feature slices em `src/features/<feature>`. Named exports, arrow functions, `type` para shapes novas. Use os componentes do design system (veja `apps/web/CLAUDE.md`), nunca hex cru — sempre variáveis CSS semânticas.
- **Backend:** feature slices com repositório em 3 camadas. Sem Lombok. Use as exceptions de `shared/exceptions/`, nunca `ResponseEntity` manual de erro. Textos de Swagger em inglês.
- Mantenha comentários enxutos e só onde esclarecem algo não óbvio.

## Abrindo o PR

- Descreva **o que** muda e **por quê**.
- Vincule a issue relacionada, se houver.
- Marque se há mudança de esquema de banco, nova variável de ambiente, ou impacto de segurança.
- PRs pequenos e focados são revisados mais rápido.

## Reportando bugs e pedindo features

Use os templates de issue. Para vulnerabilidades de segurança, **não** abra issue pública — siga o [SECURITY.md](SECURITY.md).
