# Plano — "Continuar de onde parou" / Retry de um run

Objetivo: quando um run termina (abortado por erro, rejeitado, ou concluído), permitir **retomar a
execução do ponto onde parou** — sem refazer os passos que já rodaram — em vez de só reiniciar do zero.

## Como o runtime funciona hoje (base para o plano)

Arquivo central: `src/features/security/orchestrator-shared/runtime/orchestrator-runtime.ts`.

- O run vivo (`RunRecord`) fica **só em memória** (`activeRuns`, module-level) enquanto roda e é
  **persistido de uma vez ao terminar** (`POST /squads/{id}/runs`, `saveRunApi`). Não há PUT incremental.
- O `RunRecord` persistido guarda `steps[]` (cada um com `agentId`/`seatId`/`artifact`), `qaLog[]` e
  `status` (`done`/`aborted`/`failed`). **Isso é suficiente para reconstruir o histórico.**
- O `Runtime` (efêmero: `pendingSeatId`, `pendingCheckpointKind`, `pendingQuestion`, `currentStep`,
  `events`, `log`) mora no store do renderer e **é perdido** quando o run termina ou o app fecha.
- O loop `advanceOrchestrated` é **stateless por chamada**: ele monta o prompt do coordenador a partir
  de `run.steps` (histórico) e pergunta "qual a próxima cadeira". Ou seja, **se recriarmos `activeRun`
  com os `steps` já feitos e chamarmos `advanceOrchestrated`, ele naturalmente continua** — o coordenador
  (agora roteador JSON) escolhe o próximo passo olhando o que já foi produzido e não repete.
- Controles hoje: `run-status-bar.tsx` (Pause/Resume/Stop/Reset) e `run-interaction-panel.tsx`
  (aprovar/rejeitar checkpoint, responder pergunta). Já existem `resolveCheckpoint` e `answerPrompt`.

## Escopo por fases

### Fase 1 — Retomar um run terminado (persistido) — cobre o caso "morreu, quero continuar"

Nova função `resumeRun(squadId, run: RunRecord)` em `orchestrator-runtime.ts`:

1. Guard: não retomar se já houver run ativo no squad.
2. Recriar `activeRuns.set(squadId, { ...run, status: "running", endedAt: null })` (reaproveita
   `steps` e `qaLog`).
3. Reconstruir o `Runtime`: `status: "running"`, `currentStep = steps.length`, `perAgentStatus` = `done`
   para cada `seatId` já executado, e **reidratar `events`/`log`** a partir dos `steps` (para o transcript
   mostrar o que já rodou).
4. Despachar conforme onde parou:
   - Terminou logo após um passo com `requiresCheckpointAfter` sem aprovação → restaurar o checkpoint
     (`status: "checkpoint"`, `pendingSeatId` = seat do último passo, `pendingCheckpointKind: "after"`);
     o usuário aprova pelo painel já existente.
   - Abortou por erro do coordenador / parse-fail / erro de step → chamar `advanceOrchestrated(squadId)`
     (re-pergunta ao coordenador; com o roteador JSON novo isso agora funciona).
   - Caso geral → `advanceOrchestrated(squadId)`.
5. Validação de drift: se um `seatId`/agent do histórico não existe mais, `advanceOrchestrated` já trata
   cadeira inválida (aborta com mensagem) — manter esse guard.

**Decisão a confirmar:** manter o **mesmo `id`** (retoma o mesmo run; o registro é reescrito no próximo
`saveRunApi`) **ou** criar um **novo `RunRecord` semeado** com os steps antigos + campo opcional
`resumedFromRunId` (mantém o run abortado imutável no histórico). Recomendo o **novo record semeado** —
histórico limpo e auditável.

### UI da Fase 1

- `run-status-bar.tsx`: quando `runtime.status ∈ {completed, aborted}`, mostrar botão **"Continuar"**
  (chama `resumeRun` com o último `RunRecord`).
- Lista de execuções (histórico): cada run passado ganha ação **"Continuar"** → `resumeRun(squadId, run)`.
  A lista já vem de `useRunsQuery` (`GET /squads/{id}/runs`).
- Reusar `resolveCheckpoint`/`answerPrompt` para estados pendentes após retomar.

### Fase 1.5 — "Tentar novamente o último passo" (retry pontual)

Variante `retryLastStep(squadId, run)`: **descarta o último `step`** (o que falhou/ficou ruim) e
re-executa aquela cadeira via `runOrchestratedAgentStep`. Útil quando um passo produziu lixo. Botão
"Refazer último passo" ao lado de "Continuar".

### Fase 2 — Retomar após fechar o app / crash (persistência incremental)

Hoje, um run ainda `running` quando o app fecha **não é persistido** (só em memória) → perdido. E o
estado pendente de checkpoint/pergunta **não é salvo**. Para cobrir isso:

- Backend: `PUT /squads/{id}/runs/{id}` para salvar snapshots incrementais (a cada passo/checkpoint),
  incluindo `pendingSeatId`, `pendingCheckpointKind`, `pendingQuestion`, `currentStep`, `status`.
- Runtime: chamar esse PUT em `completeOrchestratedStep`, ao entrar em checkpoint e ao pausar.
- `resumeRun` passa a reidratar também o estado pendente exato (pergunta/checkpoint) do snapshot.
- Ao abrir o app, oferecer "retomar run interrompido" para runs em `running`/`checkpoint`/`awaiting_input`.

## Limitações conhecidas (documentar na entrega)

- Fase 1 só retoma runs que chegaram a um estado **terminal e persistido** (aborted/failed/done). Run
  perdido por fechar o app no meio só é coberto na Fase 2.
- Uma **pergunta pendente** (`awaiting_input`) que não foi respondida antes de terminar não é persistida
  (é runtime-only) → na Fase 1 ela não é restaurável; cai no `advanceOrchestrated` (o agente pode
  perguntar de novo). Fase 2 resolve.
- Drift de config (agente/cadeira removidos após o run) → retomar aborta com mensagem clara.

## Backend (repo `backend-orquestrador`, feature `run`)

Estado atual (`features/run`): `RunController` em `/squads/{squadId}/runs` só tem **POST** (`createRun`)
e **GET lista** (`listRuns`). `RunEntity` (tabela `runs`): `id, squadId, userId, input, status, startedAt,
endedAt, steps(jsonb), qaLog(jsonb)`. `RunStatus` = `running|done|failed|aborted`. Importante: `steps`
e `qaLog` são **jsonb opacos, "owned by the frontend contract"** — o backend só faz passthrough.

### Fase 1 — backend: praticamente ZERO
Como o front cria um **novo `RunRecord` semeado** (recomendação) e `steps` é passthrough, o `POST /runs`
atual **já persiste tudo** que a retomada precisa. Única adição opcional:
- Coluna nullable `resumedFromRunId UUID?` em `RunEntity`/`Run`/DTOs (linhagem do run retomado). Como o
  backend roda `ddl-auto=update`, **coluna nova nullable é criada automaticamente** — sem migração manual.

### Fase 2 — backend: persistência incremental + retomar após crash
1. **PUT `/squads/{squadId}/runs/{runId}`** (novo) — atualiza um run existente (`status`, `endedAt`,
   `steps`, `qaLog`, e o snapshot abaixo). Arquivos a tocar:
   - `RunController.kt`: `@PutMapping("/{runId}")` chamando `runService.updateRun(userId, squadId, runId, req)`.
   - `dto/RunDtos.kt`: `UpdateRunRequest` (campos atualizáveis).
   - `service/RunService.kt`: `updateRun` com **checagem de posse** (run pertence ao `userId` e ao `squadId`,
     mesmo padrão `@GetUserId` dos outros endpoints) → 404/403 se não for do usuário.
   - `repository/RunRepository.kt` (porta) + `JpaRunRepositoryAdapter.kt`: `findById`+`save` (o `save` do
     JPA faz upsert). `JpaRunRepository` já é `JpaRepository`, então `save`/`findById` existem.
2. **GET `/squads/{squadId}/runs/{runId}`** (opcional) — carregar um run específico pra retomar (hoje o
   front usa a lista `GET /runs`; single é mais limpo mas não é bloqueante).
3. **Snapshot de estado pendente** (pra restaurar checkpoint/pergunta exatos após crash): adicionar **uma**
   coluna nullable `runtimeSnapshot jsonb?` (em vez de várias colunas) guardando `{ currentStep,
   pendingSeatId, pendingCheckpointKind, pendingQuestion }`. Mantém o passthrough "frontend-owned" e é
   auto-criada pelo `ddl-auto=update` (nullable).
4. **Runtime (front)** passa a chamar `PUT /runs/{id}` em `completeOrchestratedStep`, ao entrar em
   checkpoint e ao pausar — persistindo o snapshot a cada transição.

### ⚠️ Gotcha de constraint (já batemos nisso 2x nesta feature)
`RunStatus` é `@Enumerated(STRING)` → o Postgres tem um `runs_status_check`. Enquanto **não adicionarmos
valor novo** ao enum, não há problema. Se um dia adicionar (ex.: `paused`), o `ddl-auto=update` **não**
atualiza o check → INSERT/UPDATE quebra (igual aconteceu com `scripts_kind_check`). Fix: drop/recreate em
`schema.sql`, mesmo padrão de `providers_kind_check`/`scripts_kind_check`. Fase 2 reusa `RUNNING` (já
existe), então **não precisa mexer no check agora** — só ficar atento.

## Testes (Vitest — `orchestrator-runtime.test.ts`)

- `resumeRun` reconstrói `activeRun` com os steps e continua (coordenador escolhe o próximo, não repete).
- `resumeRun` em run parado num checkpoint restaura `status: "checkpoint"` + `pendingSeatId`.
- `resumeRun` com cadeira inexistente aborta com mensagem.
- `retryLastStep` remove o último step e re-executa a mesma cadeira.

## Resumo de arquivos a tocar

| Camada | Arquivo | Mudança |
|---|---|---|
| Runtime | `orchestrator-runtime.ts` | `resumeRun`, `retryLastStep`, reidratação de events/log |
| Store | `use-orchestrator-runtime-store` | (nenhuma nova; reusa `setRuntime`) |
| UI | `run-status-bar.tsx` | botões "Continuar" / "Refazer último passo" |
| UI | lista de execuções/histórico | ação "Continuar" por run |
| API (Fase 2) | `executions/api` + backend | `PUT /runs/{id}` incremental |
| Testes | `orchestrator-runtime.test.ts` | casos acima |
```
