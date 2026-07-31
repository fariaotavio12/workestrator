# 002 — Treinamento do agente após reprovação · Tasks

A fase 1 é a mesma captura de justificativa da fase 1 da [001](../001-aprovacoes-externas-teams/tasks.md) —
fazer **uma vez**, nas duas specs, não duas.

> Fases 2 e 3 implementadas no worktree `feat/002-treinamento-pos-reprovacao`
> (`.claude/worktrees/002-treinamento`), a partir do HEAD de `feat/improve-squads`. A fase 1 ficou com a 001,
> por decisão de escopo — as fases 2 e 3 só ligam de verdade quando `RunRecord.rejections[]` for populado.

## Fase 1 — Captura da reprovação — **fica com a [001](../001-aprovacoes-externas-teams/tasks.md)**

- [x] `types/index.ts`: `RunRejectionCategory`, `RunRejectionSeverity`, `RunRejection`,
      `RunRecord.rejections?` — feito no worktree da 002, para as fases 2/3 compilarem.
- [ ] `resolveCheckpoint(squadId, approved, rejection?)`: com `approved: false` exige justificativa não
      vazia, grava a reprovação no `RunRecord` e só então aborta.
- [ ] `persistRunProgress` leva `rejections` no PUT.
      ⚠️ **a confirmar corrigido:** o design dizia "`jsonb` passthrough — sem mudança no backend", mas
      `RunEntity` tem **coluna explícita por campo** (`steps`, `qaLog`, `files`, …), não um `jsonb` genérico.
      `rejections` vai exigir coluna `jsonb default '[]'::jsonb` + campo no domínio/DTO, como `files`.
- [ ] Diálogo de reprovação em `run-interaction-panel.tsx`: justificativa (`FieldWrapper`, erro de campo, não
      toast), seletor do passo culpado com default no passo do checkpoint, categoria e gravidade opcionais.
- [x] `run-detail-sheet`: seção de reprovações do run (`training/components/run-rejections-section.tsx`) —
      já lê `run.rejections` e oferece "Treinar o agente"; fica inerte até a captura existir.
- [ ] Vitest: reprovação gravada; reprovação vazia barrada no runtime; snapshot inclui `rejections`.

## Fase 2 — Treinador e lição aprendida ✅ implementada

### Backend

- [x] Coluna `lessonsCollectionId uuid` nullable em `SquadEntity` + domínio + `UpdateSquadRequest`/
      `SquadDetailResponse` + mapeamentos + `SquadService`.
- [x] `gradlew.bat compileKotlin` em terminal normal — **BUILD SUCCESSFUL**.

### Web — motor

- [x] `knowledge/api/service.ts`: `uploadKnowledgeDocumentApi(collectionId, file)` e
      `createCollectionApi(payload)` exportados fora de hook; os hooks passaram a chamá-las.
- [x] `runtime/training-runtime.ts`:
  - [x] `buildTrainingDossier` com orçamento por seção; prioriza a saída reprovada; **nunca** inclui
        `toolLog`; trunca passos anteriores.
  - [x] prompt do treinador com as regras do contrato (`blameVerdict`, reescrita da seção, vocabulário do
        problema, proibição de segredo).
  - [x] `runTraining` via `callAgentStep` com o `modelRef` do coordenador, `canExecute: false`,
        `scripts: []`, `AbortController` próprio (`runAbortable`, chave `training`).
  - [x] parse tolerante do JSON reusando `extractBalancedJsonBlocks` do `orchestrator-decision` (agora
        exportado); saída inválida devolve erro + texto cru, nada aplicado.
  - [x] `applyLesson`: markdown no formato definido, cria a coleção do squad se ausente, grava
        `lessonsCollectionId`, sintetiza o `File`, sobe pelo multipart, e **vincula a coleção ao agente**
        quando ele ainda não a consultava.
- [x] `model/use-training-store.ts`: proposta em revisão, sobrevive ao fechamento do diálogo do run.
- [x] `resolveBlamedAgent`: o treinamento analisa o agente do **passo culpado**, não o do checkpoint.

### Web — UI

- [x] `features/security/training/components/training-sheet.tsx` (`AppSheet`): diagnóstico, lição editável,
      ações independentes. Montado em `security/layout.tsx`, fora do `RunDialog` — a revisão sobrevive a ele.
- [x] `blameVerdict != "agent"` ⇒ mostra só o diagnóstico (e o motivo de não haver proposta). A regra é
      aplicada **no parser**, não só na UI: veredito não-agente descarta o `promptPatch` mesmo se o modelo
      desobedecer.
- [x] Botão "Treinar o agente" no `run-detail-sheet` (treinar depois).
- [ ] ~~Botão no painel de interação após reprovar~~ — **deixado para a 001**: `run-interaction-panel.tsx` é
      reescrito pela fase 1 (diálogo de reprovação estruturado), e o run já abortou quando a reprovação
      acontece. Tocar nele agora só criaria conflito de merge.
- [x] Estados: gerando, falha com retry (`ErrorState`), saída inválida com a saída crua colapsável.

### Testes da fase 2

- [x] Vitest (`training-runtime.test.ts`, 17 casos): dossiê (orçamento, prioridade, ausência de `toolLog`);
      parse nos três casos; `blameVerdict` não-agente; `applyLesson` criando/reusando coleção e vinculando
      ao agente; `resolveBlamedAgent`; procedência no fim do markdown.
- [ ] Manual: 5 reprovações reais de naturezas diferentes, avaliando a qualidade da lição.
      **Bloqueado pela fase 1** — sem captura não há reprovação para treinar.

## Fase 3 — Prompt versionado e refazer o passo ✅ implementada

### Backend

- [x] Feature `features/agentpromptversion/`: domínio + entidade `agent_prompt_versions` + repositório de 3
      camadas + DTOs + service + controller.
- [x] `AgentService.updateAgent` cria a versão com o texto **anterior** sempre que `systemPrompt` muda.
      `AgentService` injeta o **repositório** de versões, não o `AgentPromptVersionService` — este último
      depende do `AgentService` para reverter, e os dois juntos seriam referência circular de bean.
- [x] `UpdateAgentRequest` ganha `promptChangeReason?`, `sourceRunId?`, `sourceRejectionId?`.
- [x] `GET /squads/{squadId}/agents/{agentId}/prompt-versions`.
- [x] `POST /squads/{squadId}/agents/{agentId}/prompt-versions/{versionId}/revert` — restaura o texto e
      registra a reversão como versão nova (passa pelo próprio `updateAgent`).
- [x] `deleteAgent` remove as versões do agente.
- [ ] ~~Mensagens i18n~~ — **não aplicável**, mesma conferência da 001: só `auth`/`user` populam
      `messages_{pt,en}.properties`; as features de squad/agent usam a mensagem direto na exceção.
- [x] JUnit (`AgentPromptVersionServiceTest`, 6 casos): versão criada só quando o prompt muda; numeração
      sequencial; revert restaurando o texto exato e virando versão nova; isolamento por `userId`; cascata
      no delete. **BUILD SUCCESSFUL**.

### Web

- [x] `MAX_SYSTEM_PROMPT_CHARS` (12000) + `MAX_PROMPT_GROWTH_RATIO` (1.5); estourar bloqueia **só** o
      prompt, com mensagem explicando, e mantém a lição aplicável.
- [x] `applyPromptPatch` com `promptChangeReason` e referências de origem.
- [x] Diff do prompt no `training-sheet` via `components/diff-viewer`, calculado localmente com
      `createTwoFilesPatch` (o modelo devolve o texto completo, não um patch).
- [x] Histórico de versões no `agent-form-dialog` (aba Prompt), com motivo, run de origem, texto da versão e
      reverter.
- [x] "Refazer o passo" no `training-sheet` chamando `retryLastStep`.
- [ ] ~~gravando `retriedRunId` na reprovação de origem~~ — **adiado para depois da fase 1**: o id do run
      novo só existe depois que `ensureRunPersisted` resolve, e escrever na reprovação depende da
      persistência de `rejections`, que é da fase 1. O run refeito já aponta para o run de origem via
      `resumedFromRunId` (`seedRunFromHistory`).
- [x] Vitest: guarda de tamanho (teto absoluto, crescimento relativo, reescrita de tamanho semelhante).

## Fase 4 — Export de dataset (opcional, sem data)

- [ ] Exportar as reprovações treinadas como `JSONL` de pares (entrada, saída corrigida).
- [ ] Só reabrir a conversa de fine-tuning com volume real na mão.

## Fechamento

- [ ] Atualizar `apps/web/CLAUDE.md` e `apps/api/CLAUDE.md` — depois da fase 1, com o circuito completo.
- [x] Atualizar o status desta feature em [`.specs/README.md`](../README.md).
- [x] `npx tsc --noEmit -p tsconfig.app.json` + `npm run lint` (0 erros; 3 warnings pré-existentes de
      `useReactTable`) + `npm run test` em `apps/web`: 233 passam. As 2 falhas restantes
      (`asset-manifest`, `ldtk-round-trip`) são **pré-existentes e ambientais** — reproduzidas idênticas na
      árvore principal, sem relação com esta feature.
- [x] `gradlew.bat compileKotlin` e `gradlew.bat test --tests "com.apibot.features.agentpromptversion.*"`
      em terminal normal: BUILD SUCCESSFUL.
- [ ] `npm run verify` na raiz + `gradlew.bat build` completo — depois do merge com a 001.
- [ ] Mergear o worktree só depois de a 001 fechar. Conflitos esperados: `AgentService.kt`, `AgentDtos.kt`
      (as duas specs mexem lá) e `types/index.ts`.
