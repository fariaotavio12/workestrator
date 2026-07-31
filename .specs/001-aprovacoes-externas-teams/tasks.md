# 001 — Notificação externa de checkpoint + aprovador delegado · Tasks

Tudo é feito neste repositório, exceto o fluxo do n8n. A fase 1 é o v1 completo e testável sem o n8n
existir (basta deixar a política de notificação desligada).

## Fase 1

### Backend — pool de aprovadores ✅ implementado nesta sessão

- [x] Entidade + tabela `squad_approvers` (`squadId`, `ownerUserId`, `approverUserId`, `invitedAt`,
      `unique(squadId, approverUserId)`).
- [x] `SquadApproverService`: `invite` (resolve por `UserRepository.findByEmail`, 404 claro se não achar;
      duplicado é no-op), `list`, `remove` — sempre checando `ownerUserId == requesterId` via
      `squadService.getSquadForUser`.
- [x] `SquadApproverController`: `GET`/`POST`/`DELETE /squads/{squadId}/approvers`.
- [x] Coluna `approvalPolicy jsonb` (nullable, sem default — coluna nova não precisa) em `AgentEntity`
      (`{ approverUserIds: string[], ownerCanDecide: boolean }`) + DTO + mapeamentos. Ausente ≡
      `{ [], ownerCanDecide: true }`.
- [x] **Invariante da política (D13), validada nos dois caminhos de escrita:**
  - [x] ao salvar o agente (`AgentService.validateApprovalPolicy`): `ownerCanDecide: false` exige
        `approverUserIds` não vazio → 422; todo id precisa pertencer ao pool do squad → 422.
  - [x] ao remover do pool (`SquadApproverService.remove`): bloquear (422, nomeando os agentes) se sobraria
        algum agente com `ownerCanDecide: false` e nenhum aprovador. Bloqueia, não corrige sozinho.

### Backend — conexão de notificação ✅ implementado nesta sessão

- [x] Entidade + tabela `notification_channels` (`label`, `kind`, `url`, `authSecretId`, `authHeaderName`,
      `status`, `lastTestedAt`, `lastError`).
- [x] `NotificationChannelResponse` **sem a `url`** — só `hasUrl` + `urlHost`.
- [x] Segredo de autenticação no cofre existente (`Secret`, `authType: "raw"`, resolvido via
      `SecretService.resolveValue` dentro de `WebhookNotifier`).
- [x] `NotificationChannelController`: CRUD + `POST /{id}/test`.
- [x] Coluna `notifyPolicy jsonb` (nullable) em `AgentEntity` (`{ enabled, channelId }`) + DTO + mapeamentos.

### Backend — pedido, envio e decisão ✅ implementado nesta sessão

- [x] `model/ApprovalRequest.kt` + `ApprovalRequestEntity.kt` + mapeamentos.
- [x] Enums `ApprovalStatus` (`PENDING`/`APPROVED`/`REJECTED`/`CANCELED`), `CheckpointKind`,
      `ApprovalDecidedByRole` (`OWNER`/`APPROVER`).
- [x] Repositório de 3 camadas + `dto/ApprovalDtos.kt` (`@Schema` em inglês). `assigned-to-me` usa
      `@Query` nativa com `jsonb @>` sobre `approver_user_ids` (Spring Data não faz containment JSON
      via query derivada).
- [x] `WebhookNotifier.kt`: `POST` no `channel.url`, header de autenticação quando houver (via
      `SecretService`), `RestClient` **dedicado** com timeout de 3s/5s (não o `RestClient` compartilhado de
      `oauth/config` — aquele não tem timeout), **uma tentativa**.
  - ⚠️ **Desvio do texto original:** `@Async` não fica em `WebhookNotifier` — fica em
    `service/integration/ApprovalNotificationDispatcher.kt`, um bean **separado**. `@Async` só é
    interceptado pelo proxy do Spring em chamada **entre beans**; `WebhookNotifier` também é usado
    **síncrono** por `NotificationChannelService.test` (o botão de teste precisa do resultado na hora).
    Colocar `@Async` nele quebraria o teste; colocar em `ApprovalService` (auto-invocação) seria ignorado
    em silêncio pelo Spring. `ApprovalNotificationDispatcher.dispatch` é o único método `@Async`.
- [x] `ApprovalService.create`: registra o pedido, **snapshota `approverUserIds` E `ownerCanDecide`** a
      partir de `agent.approvalPolicy` (D8), monta o `summary` truncado, dispara
      `ApprovalNotificationDispatcher` se `notifyPolicy.enabled` (assíncrono de verdade — ver acima).
- [x] `ApprovalRequest.canDecide(requesterId)`/`canCancel(requesterId)`: **método único no domínio** (não
      função solta no service — mais alinhado à convenção "invariante de negócio mora no domínio") —
      `approverUserIds.contains(requesterId) || (requesterId == ownerUserId && ownerCanDecide)`. Sempre
      contra o snapshot, nunca a configuração ao vivo.
- [x] `ApprovalService.decide`/`get` usam `canDecide` → 403 para quem não passa (mensagem distinta para o
      dono que se retirou); primeira decisão grava (`decidedByUserId`, `decidedByRole`), segunda →
      `DecideOutcome.AlreadyDecided` (controller traduz para 409 **com o corpo original**, não erro
      genérico — ver nota abaixo); `approved: false` sem `feedback` → 422.
- [x] `ApprovalService.cancel`: só `requesterId == ownerUserId` — **funciona mesmo com `ownerCanDecide: false`**
      (D12).
- [x] `ApprovalService.renotify`: reenvio assíncrono via o mesmo dispatcher, owner-only.
- [x] `ApprovalService.assignedToMe(userId, status?)`: pedidos onde `userId` está no snapshot.
- [x] `ApprovalController`: `POST /approvals`, `GET /approvals/{id}`, `POST /approvals/{id}/decide`,
      `POST /approvals/{id}/cancel`, `POST /approvals/{id}/renotify`, `GET /approvals?runId=`,
      `GET /approvals/assigned-to-me`.
  - Nota de implementação: `POST /decide` **não lança exceção** no caso "já decidido" — `ApprovalService`
    devolve um `DecideOutcome` (`Applied`/`AlreadyDecided`), e o controller mapeia `AlreadyDecided` para
    `ResponseEntity.status(409).body(...)` com o `ApprovalResponse` de verdade. É a única forma de cumprir
    "409 com o corpo da decisão original" — o `ApiExceptionHandler` genérico só devolve `ApiErrorResponse`
    (sem campo para dado estruturado arbitrário).
- [x] `domain/exception/ApprovalExceptions.kt` — 7 exceções (canal, pool, invariante de política, pedido,
      autorização, reprovação sem justificativa), todas mapeadas nos tipos canônicos já existentes
      (`ResourceNotFoundException`/`ForbiddenException`/`BusinessRuleViolationException`); nenhum tipo novo
      precisou de registro no `ApiExceptionHandler`.
- [ ] ~~Mensagens em `messages_pt.properties` / `messages_en.properties`~~ — **não aplicável**: conferido
      que `secret`/`agent`/`squad`/`run`/`knowledge` (as features mais próximas desta em forma) **não**
      populam essas chaves; só `auth`/`user` fazem i18n de mensagem. Seguido o padrão real, não o
      aspiracional do `CLAUDE.md`.
- [x] `ApprovalProperties`: timeouts (3s/5s), limite do `summary` (500), base do `decisionUrl` — também
      adicionado em `application.properties` (`app.approval.*`) e `.env.example`
      (`APP_APPROVAL_DECISION_BASE_URL`), mesmo padrão de `app.auth.password-reset-base-url`.
- [ ] `gradlew.bat compileKotlin` **em terminal normal** (o daemon não sobe em sandbox) — **pendente, exige
      ambiente fora do sandbox**. Revisão manual completa feita (imports, tipos, ciclo de beans, balanço de
      chaves) na ausência de compilador; ver nota de verificação no fechamento desta sessão.

### Web — contratos e runtime ✅ implementado nesta sessão

- [x] `types/index.ts`: `NotificationChannel`, `ApprovalRequest`, `ApprovalStatus`, `ApprovalDecidedByRole`,
      `AgentNotifyPolicy`, `AgentApprovalPolicy`, `SquadApprover`; `Agent.notifyPolicy?`,
      `Agent.approvalPolicy?`; `Runtime.pendingApprovalId`; `RuntimeSnapshot.pendingApprovalId`.
- [x] `features/security/approvals/api/{types,keys,service,index}.ts` — funções exportadas fora de hook,
      no molde de `executions/api/service.ts`.
- [x] `orchestrator-runtime.ts`: extrair a entrada em checkpoint (`requiresCheckpoint` +
      `requiresCheckpointAfter`) para `enterCheckpoint(squadId, seatId, agent, kind, title, notifyBody, summary)`.
- [x] `enterCheckpoint` chama `POST /approvals` **sem `await`** no caminho do run.
- [x] Guardar `pendingApprovalId` no runtime e no `runtimeSnapshot`.
- [x] `runtime/approval-watcher.ts`: poll de 10s **incondicional** enquanto há `pendingApprovalId` (D7),
      `AbortController` por pedido, para no primeiro estado terminal, aplica a decisão pelo mesmo caminho de
      `resolveCheckpoint` (via `settleCheckpoint`).
- [x] `resolveCheckpoint(squadId, approved, rejection?)`: grava `RunRecord.rejections[]` (formato da
      [002](../002-treinamento-pos-reprovacao/tasks.md) — feito **uma vez**, `recordRejection`) e chama
      `POST /approvals/{id}/decide`.
- [x] `stopRun`/`finishRun` chamam `cancel`; `continueRun` com `pendingApprovalId` reusa o pedido (`GET
      /approvals/{id}`) e reinicia o watcher se ainda `pending`, ou aplica a decisão se já resolvida enquanto
      o app estava fechado.

### Web — tela de decisão e lista própria ✅ implementado nesta sessão

- [x] `app/routing/variables.ts`: `Rotas.protegidas.orchestrator.approvalDecide = "/dashboard/aprovacoes/:approvalId"`
      e `approvals = "/dashboard/aprovacoes"` para a lista própria.
- [x] `app/routing/index.tsx`: registradas as duas rotas sob `<Middleware /><LayoutDashboard>` genérico (não
      sob nenhuma guarda de squad).
- [x] `features/security/approvals/page-approval-decide.tsx`: `GET /approvals/{id}`; 403 → mensagem clara,
      **distinguindo** "sem permissão" de "você se retirou da decisão deste agente" (dono com
      `ownerCanDecide: false`, via `canDecide`/`canCancel` computados pelo backend); estado terminal →
      resultado e quem decidiu; `PENDING` → resumo + Aprovar (1 clique) / Reprovar (`FieldWrapper`,
      justificativa obrigatória) → `POST /approvals/{id}/decide`, com tratamento de 409 via
      `extractApprovalFromConflict`. Para o dono sem poder de decisão, botão de **abortar o run** (`cancel`)
      em vez dos controles de aprovação.
- [x] `features/security/approvals/page-approvals-assigned.tsx`: lista de `GET /approvals/assigned-to-me`,
      link para a tela de decisão.

### Web — gestão do pool e da política (visão do dono) ✅ implementado nesta sessão

- [x] `squad-approvers-dialog.tsx` (convite por e-mail, lista, remover) — nova aba acessível pelo botão
      "Aprovadores" em `squad-detail-header.tsx`. Remoção que violaria a invariante (D13) mostra erro do
      backend nomeando os agentes afetados.
- [x] `agent-form-dialog`/`agent-profile-tab.tsx`: `MultiCombobox` **restrito ao pool do squad** para
      `approvalPolicy.approverUserIds` + toggle **"eu também posso decidir"** (`ownerCanDecide`),
      **desabilitado enquanto não houver aprovador atribuído** — a invariante aparece como impossibilidade
      na UI, com o motivo à mostra, não como erro depois de salvar.
- [x] Seção "Notificações (n8n)" em `page-secrets.tsx` (CRUD de `notification-channels`: URL, header e
      segredo opcionais, teste, status, último erro). Não usou `connectors-catalog.ts` — é uma seção própria,
      não um preset de conector OAuth.
- [x] `run-interaction-panel.tsx`: status do aviso (`notifyError`/`notifiedAt` via `useApprovalQuery`) + "você
      se retirou da decisão" quando `!ownerCanDecide`.
- [x] `run-detail-sheet`: seção "Aprovações" via `useApprovalsByRunQuery(run.id)` (quem decidiu, dono ou
      aprovador). Não construída a UI de rejeições/treinamento aqui de propósito — fica a cargo da spec 002.

### Testes da fase 1

- [x] JUnit: `ApprovalServiceTest` (snapshot da política em `create`; primeira decisão aplica e devolve
      `Applied`; segunda devolve `AlreadyDecided` com a decisão original; reprovar sem justificativa lança
      `RejectionRequiresFeedbackException`; dono com `ownerCanDecide: false` não decide mas vê e cancela;
      aprovador do snapshot decide e vê mas não cancela; estranho ao pedido não vê/decide/cancela),
      `AgentServiceTest` (D13 nos dois caminhos de `AgentService`: `ownerCanDecide: false` sem aprovador
      rejeita, id fora do pool rejeita, política válida salva, `updateAgent` revalida mesmo só mudando outro
      campo), `SquadApproverServiceTest` (convite por e-mail existente/inexistente/duplicado; `list` resolve
      nome/e-mail; `remove` bloqueado quando seria o único aprovador restante de um agente
      `ownerCanDecide: false`; `remove` liberado no caso contrário). Compilação com `gradlew.bat` não
      verificável neste ambiente sandboxado (ver nota na seção Backend acima) — revisão manual completa dos
      três arquivos feita linha a linha contra as assinaturas reais de `ApprovalService`/`AgentService`/
      `SquadApproverService`/`SquadService`/`ScriptService` e dos repositórios-porta envolvidos.
- [x] Vitest: `enterCheckpoint` não bloqueante (`orchestrator-runtime.test.ts`); watcher aplicando decisão
      externa isolado em `approval-watcher.test.ts` (poll, erro de rede não dispara `onSettled`, id duplicado
      não duplica watcher, `stopApprovalWatch` cancela antes do tick); `resolveCheckpoint` bloqueando reprovar
      sem justificativa e gravando decisão+justificativa quando há; `continueRun` restaurando
      `pendingApprovalId` do snapshot sem recriar o pedido; `stopRun` cancelando o pedido pendente no backend.
      216→22 testes novos, todos verdes (`cd apps/web && npx vitest run`).

## Fluxo do n8n (FORA deste repositório)

JSON pronto para importar em [`n8n-workflow.md`](n8n-workflow.md) — três nós (Webhook com Header Auth →
Code que monta a mensagem → HTTP Request no Graph). **Só as credenciais e o chatId precisam ser corrigidos.**

- [ ] Importar o JSON (n8n → Workflows → Import from clipboard).
- [ ] Criar a credencial **Header Auth** e selecioná-la no nó `Aviso do Workestrator`.
- [ ] Criar a credencial **Microsoft Teams OAuth2 API** e selecioná-la no nó `Enviar no Teams`.
- [ ] Substituir `SUBSTITUIR_CHAT_ID` na URL do nó `Enviar no Teams` (ver "Como descobrir o chatId" no anexo).
- [ ] Ativar o workflow e copiar a *Production URL* do webhook.
- [ ] Cadastrar a conexão de notificação no Workestrator com essa URL + nome do header + segredo (os mesmos da
      credencial Header Auth).
- [ ] Clicar em **Testar** na conexão e confirmar a mensagem chegando no Teams.
- [ ] ⚠️ Se o Graph responder **403** no envio, a credencial Teams OAuth2 não tem escopo de envio de chat
      (`ChatMessage.Send`) — trocar por *Entra Service Principal* ou OAuth2 genérica com o escopo. Não muda a
      estrutura do workflow.
- [ ] Configurar **Error workflow** em Workflow → Settings (não é pré-configurável no JSON).
- [ ] Exportar o fluxo de volta e versionar junto do projeto sempre que mudar.

## Fase 2 — Aprovador sem conta (só se o cenário aparecer)

- [ ] Token opaco de uso único, prazo curto, ligado ao `approvalId`.
- [ ] Rota pública `/aprovacoes-publicas/{token}` (fora do `<Middleware />`).
- [ ] `EXPIRED` no enum (**drop/recreate do `*_check` em `schema.sql`**) + job de expiração.
- [ ] Login Microsoft opcional (OIDC via app registration no Entra) para identidade verificada.

## Fase 3 — Outros eventos e canais

- [ ] `question.asked`, `run.completed`, `run.aborted` — mesmo contrato, só novo `event`.
- [ ] Outros canais de saída sem mudança aqui.

## Fechamento

- [x] Atualizar `apps/web/CLAUDE.md` e `apps/api/CLAUDE.md`.
- [x] Atualizar o status desta feature em [`.specs/README.md`](../README.md).
- [ ] `npm run verify` na raiz + `gradlew.bat build` em `apps/api` (terminal normal) — **pendente, exige
      ambiente fora do sandbox**. Feito nesta sessão, dentro do sandbox: `cd apps/web && npx tsc --noEmit -p
      tsconfig.app.json` (limpo), `npx eslint` nos arquivos tocados (limpo), `npx vitest run` (228 testes, 227
      passando, 1 suite com erro de setup — as duas falhas são pré-existentes e não relacionadas, confirmado
      via `git status` sem mudança dessa sessão nesses arquivos). Backend: revisão manual
      completa dos 3 arquivos de teste novos (nenhum erro de import/assinatura encontrado), compilação real
      não verificável (`gradlew.bat compileTestKotlin` falha com `Unable to establish loopback connection`,
      limitação documentada do ambiente).
- [x] Espelhar `.specs/` no vault do Obsidian (`Workestrator/Specs/`).
