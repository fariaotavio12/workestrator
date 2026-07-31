# 002 — Treinamento do agente após reprovação · Tasks

A fase 1 é a mesma captura de justificativa da fase 1 da [001](../001-aprovacoes-externas-teams/tasks.md) —
fazer **uma vez**, nas duas specs, não duas.

> Fases 2 e 3 foram implementadas no worktree `feat/002-treinamento-pos-reprovacao` e **mergeadas em
> `feat/improve-squads`** depois que a 001 fechou (fast-forward, commits `bd90007` + `8d81a56`). A fase 1
> ficou com a 001 e já está entregue, então o circuito de treinamento está vivo de ponta a ponta.

## Fase 1 — Captura da reprovação — **entregue pela [001](../001-aprovacoes-externas-teams/tasks.md)** ✅

- [x] `types/index.ts`: `RunRejectionCategory`, `RunRejectionSeverity`, `RunRejection`,
      `RunRecord.rejections?`. As duas specs declararam `RunRejection`; no merge ficou a versão da 001
      (usa `ApprovalDecidedByRole` em vez do literal inline) acrescida de `RunRejectionTraining`.
- [x] `resolveCheckpoint(squadId, approved, rejection?)`: com `approved: false` exige justificativa não
      vazia, grava a reprovação no `RunRecord` e só então aborta.
- [x] `persistRunProgress` leva `rejections` no PUT.
      ✅ **confirmado:** o design dizia "`jsonb` passthrough — sem mudança no backend" e **estava errado** —
      `RunEntity` tem coluna explícita por campo. A 001 chegou à mesma conclusão e adicionou a coluna
      `rejections jsonb` + campo no domínio/DTO, como `files`.
- [x] Diálogo de reprovação em `run-interaction-panel.tsx`: justificativa, seletor do passo culpado,
      categoria e gravidade opcionais.
- [x] `run-detail-sheet`: seção de reprovações do run (`training/components/run-rejections-section.tsx`).
      Convive com a seção "Aprovações" da 001 (trilha de auditoria dos `ApprovalRequest`) — a justificativa
      aparece nas duas. **Vale unificar** numa próxima passada de UI.
- [x] Vitest: reprovação gravada; reprovação vazia barrada no runtime; snapshot inclui `rejections`.

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
- [ ] ~~Botão no painel de interação após reprovar~~ — **não aplicável**: reprovar aborta o run, então o
      painel de interação já saiu de cena quando o botão faria sentido. A entrada real é o `run-detail-sheet`,
      que a 001 deixou acessível pelo histórico do squad.
- [x] Estados: gerando, falha com retry (`ErrorState`), saída inválida com a saída crua colapsável.

### Testes da fase 2

- [x] Vitest (`training-runtime.test.ts`, 17 casos): dossiê (orçamento, prioridade, ausência de `toolLog`);
      parse nos três casos; `blameVerdict` não-agente; `applyLesson` criando/reusando coleção e vinculando
      ao agente; `resolveBlamedAgent`; procedência no fim do markdown.
- [ ] Manual: 5 reprovações reais de naturezas diferentes, avaliando a qualidade da lição.
      **Desbloqueado** pela fase 1 da 001 — é o próximo passo, e o único teste que diz se a feature vale.

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
- [ ] Gravar `retriedRunId` na reprovação de origem — **pendente, agora possível**. A persistência de
      `rejections` chegou com a 001, mas o id do run novo só existe depois que `ensureRunPersisted` resolve,
      e `retryLastStep` não devolve nada. Precisa expor o id persistido (ou fazer `retryLastStep` devolver o
      `executionId`) antes de escrever o vínculo. Hoje o run refeito já aponta para o run de origem via
      `resumedFromRunId` (`seedRunFromHistory`), só não para a reprovação específica.
- [x] Vitest: guarda de tamanho (teto absoluto, crescimento relativo, reescrita de tamanho semelhante).

## Fase 4 — Export de dataset (opcional, sem data)

- [ ] Exportar as reprovações treinadas como `JSONL` de pares (entrada, saída corrigida).
- [ ] Só reabrir a conversa de fine-tuning com volume real na mão.

## Fechamento

- [ ] Atualizar `apps/web/CLAUDE.md` e `apps/api/CLAUDE.md` com o circuito de treinamento completo.
- [x] Atualizar o status desta feature em [`.specs/README.md`](../README.md).
- [x] Mergeado em `feat/improve-squads` (fast-forward). Os conflitos previstos aconteceram e foram
      resolvidos: `AgentService.kt` e `types/index.ts`. `AgentDtos.kt` deu auto-merge.
- [x] Pós-merge, na árvore principal: `tsc` limpo; `gradlew.bat test` **BUILD SUCCESSFUL** (46/46,
      `contextLoads` incluído — o que confirma na prática que não há ciclo de bean entre `AgentService`,
      `AgentPromptVersionService` e `SquadApproverService`); Vitest 244 passando.
- [ ] Duas pendências herdadas, **nenhuma causada por esta feature**:
  - `asset-manifest.test.ts` falha por drift real (um PNG de prop fora do manifesto) e
    `ldtk-round-trip.test.ts` não carrega (depende de um caminho de instalação do LDtk).
  - `npm run lint` acusa 2 erros em `apps/web/dist-electron/main.cjs` — artefato de build, gitignorado mas
    **não ignorado pelo ESLint**. Sobre código-fonte o lint está limpo.
- [ ] `npm run verify` na raiz.
