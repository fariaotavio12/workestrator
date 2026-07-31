# 001 — Notificação externa de checkpoint + aprovador delegado · Design

## ⚠️ Correção em relação à revisão anterior deste documento

A versão anterior deste design assumia que a decisão de um checkpoint **sempre** acontece no mesmo cliente
que está rodando o run (o dono, no app aberto) — por isso concluí que não havia necessidade de poll:
"a decisão acontece no mesmo cliente que está rodando o run — não existe nada para ficar observando".

Isso deixou de valer. Com um **aprovador delegado**, a decisão pode acontecer numa sessão completamente
separada — o navegador do aprovador, autenticado com a própria conta, sem nenhuma relação de processo com o
cliente do dono que está rodando o squad. O cliente do dono **precisa** descobrir essa decisão de algum jeito
— e a única forma sem infraestrutura de push é voltar a fazer **poll** enquanto o checkpoint está pendente,
qualquer que seja o canal ou se há delegado configurado ou não (mais simples e mais robusto que fazer poll
condicional: também cobre o dono decidindo de um segundo dispositivo).

O restante da decisão anterior continua de pé: sem Azure, sem bot, sem rota pública para terceiro, sem HMAC
de entrada — porque quem decide continua sendo sempre uma conta autenticada do Workestrator, só que agora
pode não ser o dono.

## Estado atual

**Onde o checkpoint nasce.** `apps/web/src/features/security/orchestrator-shared/runtime/orchestrator-runtime.ts`
tem dois pontos de pausa (linha ~1156 `requiresCheckpoint`, e `requiresCheckpointAfter`), cada um entrando em
`status: "checkpoint"` com `pendingCheckpointKind`. `resolveCheckpoint(squadId, approved)` (linha ~1357) é
chamada direto dos handlers de UI — hoje só o dono, só no mesmo processo, sem motivo registrado.

**Squad é hoje estritamente 1:1 com o dono.** `SquadEntity.userId`, `RunEntity.userId`, e toda query do
projeto são escopadas por `@GetUserId` sem exceção. **Não existe nenhum modelo de colaboração** — a feature
mais próxima, `squadshare` (`apps/api/.../features/squadshare`), **clona** o squad para uma conta nova
(`acceptShare` cria um `Squad` novo com `userId` do aceitante) e deliberadamente **remove** credenciais,
provider e bases de conhecimento no clone. Ela resolve "compartilhar um squad como ponto de partida", não
"outra pessoa decide meu run" — são problemas diferentes, e nada dela é reaproveitável aqui além do padrão de
convite/token que ela usa (`SecureRandom` + Base64, útil só como referência de estilo).

**O que já existe e será reaproveitado:**

| Peça | Onde | Uso aqui |
|---|---|---|
| Cofre de segredos cifrado | `apps/api/.../features/secret`, `SecretCipher.kt` | segredo de autenticação do webhook |
| Execução assíncrona | `apps/api/.../shared/config/AsyncConfig.kt` (`@Async`, já usado por `IngestionService`) | disparo do aviso fora do caminho crítico |
| `UserRepository.findByEmail` | `apps/api/.../features/user/repository/UserRepository.kt:12` | resolve o convite de aprovador (RF1) |
| Guarda de rota genérica | `apps/web/src/app/routing/middleware.tsx` (`Middleware`) | exige login sem exigir dono do squad — é exatamente o que a tela de decisão precisa |
| Persistência incremental do run | `persistRunProgress` → `PUT /squads/{id}/runs/{id}` | snapshot do pedido pendente |
| Catálogo de conectores | `connectors-catalog.ts` + `page-secrets.tsx` | onde a conexão de notificação é cadastrada |

## Decisões

| # | Decisão | Motivo | Alternativa descartada |
|---|---|---|---|
| D1 | n8n só **envia**; toda decisão passa por autenticação do Workestrator | mantém Azure, bot e rota pública fora do escopo | bot do Teams com clique inline — exige Azure Bot |
| D2 | Aprovador é **conta existente** do Workestrator, nunca anônimo | é a escolha feita: "outro usuário cadastrado", não "sem conta" | página pública com token, decisão sem login — outra arquitetura inteira, reaberta se o cenário anônimo aparecer de verdade |
| D3 | **Pool de aprovadores por squad** + **atribuição por agente** (subconjunto do pool) | convidar uma vez, atribuir várias vezes; agentes diferentes podem ter aprovadores diferentes sem reconvite | aprovador direto por agente sem pool — obrigaria reconvidar a mesma pessoa em cada agente |
| D4 | Convite só por e-mail de conta **já existente**; sem fluxo para quem não tem conta | consistente com D2; erro do tipo "crie uma conta primeiro" é aceitável porque o aprovador é sempre alguém identificável de antemão | convite que cria a conta na hora |
| D5 | Tela de decisão **dedicada** (`/dashboard/aprovacoes/:id`), fora da árvore de rotas do squad | o aprovador não deve alcançar nada do squad além do que a aprovação carrega; uma rota nova com guarda de autorização própria é mais simples de auditar que remendar exceções nas rotas do squad | reaproveitar `page-squad-detail`/`run-dialog` com um branch de permissão — haveria dezenas de pontos onde vazar dados do squad por descuido |
| D6 | **A mesma tela de decisão** atende dono e aprovador | um único `deepLink` no aviso, uma única checagem de autorização (`owner OR approver atribuído`), sem duplicar UI por perfil | link diferente para dono (abre o squad) e para aprovador (abre a tela dedicada) — mais estado para manter sincronizado, e o dono ganha a mesma tela de qualquer forma quando abre pelo aviso |
| D7 | **Poll obrigatório** (`approval-watcher`) enquanto há `pendingApprovalId`, incondicional | ver a correção no topo do documento — decisão pode vir de sessão alheia ao cliente que roda o run | poll só quando há aprovador delegado configurado — mais um caminho condicional para manter certo, sem ganho real (o custo do poll é irrisório) |
| D8 | **A política de autorização inteira** (`approverUserIds` + `ownerCanDecide`) é **snapshotada** no pedido, no momento da criação | mesmo padrão já usado em `RunRecord.authBindingsSnapshot`: quem podia decidir quando o checkpoint abriu continua podendo decidir aquele pedido específico, mesmo que o dono mude a configuração depois. Snapshotar só a lista e resolver `ownerCanDecide` ao vivo daria um pedido com metade da regra congelada | resolver a política em tempo real a cada decisão — o pedido mudaria de regra no meio do caminho |
| D9 | Autorização por **403 Forbidden**, não 404, para usuário autenticado sem permissão | o `approvalId` só circula por um canal privado (aviso/lista própria); dizer "existe mas você não pode" é mais claro que fingir que não existe, e seguro o bastante nesse caso | 404 uniforme |
| D10 | Primeira decisão vence, com 409 e o corpo da decisão original na segunda tentativa | evita corrida entre dono e aprovador, ou entre dois aprovadores do mesmo agente | quórum, ou "último vence" |
| D14 | Disparo do aviso isolado num bean próprio (`ApprovalNotificationDispatcher`), só ele com `@Async` | `@Async` do Spring só é interceptado em chamada **entre beans** — dentro da mesma classe (`ApprovalService` chamando a si mesma) o proxy não intercepta e o método roda síncrono, mesmo anotado. `WebhookNotifier` não podia ser o `@Async`: ele também é usado **síncrono** por `NotificationChannelService.test` (o botão de teste devolve o resultado na hora — RF4). Sem essa separação, `POST /approvals` bloquearia até ~8s (timeout do webhook) dentro da própria requisição do checkpoint — exatamente o NFR "nunca bloqueia o run" | `@Async` direto em `ApprovalService.create`: silenciosamente ignorado (auto-invocação); `@Async` em `WebhookNotifier.send`: quebra o retorno síncrono que o teste de conexão precisa |
| D11 | **`ownerCanDecide` por agente** (default `true`) permite o dono se retirar da decisão | segregação de função é o caso onde aprovação externa mais importa: quem monta o squad não aprova o próprio trabalho. Sem isso, o dono só consegue *adicionar* quem decide, nunca *se remover* | só permitir adicionar aprovadores, mantendo o dono sempre apto — inviabiliza compliance |
| D12 | **Retirar-se remove o poder de aprovar, nunca o de abortar** | é o antídoto do deadlock: aprovador indisponível não prende o run para sempre. E é coerente conceitualmente — abortar a própria execução é direito de dono; aprovar o conteúdo dela é a função delegada | dono perde tudo (run trava sem escapatória) ou dono mantém aprovação disfarçada (a segregação seria fake) |
| D13 | **Política insatisfazível é rejeitada na escrita**, nos dois caminhos (salvar agente e remover do pool) | validar só ao salvar o agente deixaria a porta dos fundos aberta: remover o último aprovador do pool produziria um agente que ninguém pode aprovar, e o erro só apareceria no meio de um run | validar só na leitura/decisão — o problema apareceria com o run já pausado, no pior momento possível |

## Modelo de dados

Nova feature `apps/api/src/main/kotlin/com/apibot/features/approval/`, layout padrão do projeto (controller
/ service / repository de 3 camadas / dto / model domínio + entidade / domain.exception).

`notification_channels`:

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid | dono, escopo `@GetUserId` |
| `label` | text | exibição ("Teams — Bruno") |
| `kind` | enum `WEBHOOK` | |
| `url` | text | webhook do n8n — **nunca** serializado em resposta |
| `authSecretId` | uuid nullable | `Secret` com o valor do header de autenticação |
| `authHeaderName` | text nullable | |
| `status` | enum `ACTIVE \| ERROR \| DISABLED` | |
| `lastTestedAt` / `lastError` | timestamptz / text nullable | |

`squad_approvers` — o pool (RF1):

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `squadId` | uuid | |
| `ownerUserId` | uuid | dono do squad — quem pode gerenciar este pool |
| `approverUserId` | uuid | conta convidada, resolvida por `UserRepository.findByEmail` |
| `invitedAt` | timestamptz | |
| constraint | `unique(squadId, approverUserId)` | convite duplicado é no-op, não erro |

`approval_requests`:

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `ownerUserId` | uuid | dono do squad/run |
| `squadId` / `runId` | uuid | |
| `seatId` | text | cadeira pendente |
| `agentId` | uuid nullable | agente que vai agir (ou agiu) |
| `checkpointKind` | enum `BEFORE \| AFTER` | |
| `status` | enum `PENDING \| APPROVED \| REJECTED \| CANCELED` | |
| `title` / `summary` | text | o que foi (ou seria) enviado no aviso |
| `channelId` | uuid nullable | conexão de notificação usada; nulo = nenhum aviso |
| `notifiedAt` / `notifyError` | timestamptz / text nullable | |
| `approverUserIds` | jsonb | **snapshot** (D8) de quem podia decidir, além do dono |
| `ownerCanDecide` | boolean | **snapshot** (D8) — se o dono estava apto a decidir quando o checkpoint abriu |
| `decidedByUserId` | uuid nullable | quem decidiu de fato |
| `decidedByRole` | enum `OWNER \| APPROVER` nullable | para a trilha de auditoria (RF18) |
| `decidedAt` | timestamptz nullable | |
| `feedback` | text nullable | justificativa da reprovação |
| `createdAt` / `updatedAt` | timestamptz | |

> ⚠️ **Gotcha já registrado no repo:** enum `@Enumerated(STRING)` cria um `*_check` no Postgres que o
> `ddl-auto=update` **não** atualiza quando um valor novo é adicionado (aconteceu com `scripts_kind_check` e
> `providers_kind_check`). Os enums acima já nascem com todos os valores do v1 — se crescerem depois, é
> drop/recreate em `schema.sql`.

Duas colunas novas em `agents` — nullable/`default`, criadas pelo `ddl-auto=update` sem migração manual:

```txt
notifyPolicy    jsonb default 'null'   { enabled: boolean, channelId: string }
approvalPolicy  jsonb default 'null'   { approverUserIds: string[], ownerCanDecide: boolean }
```

Ausentes ⇒ sem aviso e só o dono decide. `approvalPolicy` ausente é equivalente a
`{ approverUserIds: [], ownerCanDecide: true }` — nenhum agente existente muda de comportamento. São **eixos
independentes** de propósito: notificar (avisar alguém) e autorizar (quem pode decidir) não precisam andar
juntos — dá para autorizar um aprovador sem gerar aviso nenhum (ele confere pela lista "atribuídas a mim"),
e dá para avisar um canal sem que ninguém ali tenha autorização de decidir (aviso informativo).

### Invariante da política (D13)

**`ownerCanDecide == false` exige `approverUserIds` não vazio.** Validado em **dois** caminhos de escrita,
porque há duas formas de violá-la:

1. `PUT /squads/{squadId}/agents/{agentId}` — salvar a política do agente. Valida também que cada id em
   `approverUserIds` pertence ao pool do squad.
2. `DELETE /squads/{squadId}/approvers/{approverUserId}` — remover do pool. Antes de remover, verificar se
   sobra algum aprovador em **cada** agente que tenha `ownerCanDecide == false`. Se algum ficaria sem
   ninguém, **bloquear** com mensagem nomeando os agentes afetados.

Bloquear, e não corrigir sozinho: flipar `ownerCanDecide` para `true` em silêncio desfaria um controle de
compliance que o dono configurou de propósito — o dono precisa decidir explicitamente o que quer.

Pedidos **já pendentes** não são afetados por nenhuma das duas operações (D8) — a política deles está
congelada no snapshot.

## Endpoints

Todos exigem login (`@GetUserId`). **Nenhuma rota pública.**

| Método | Rota | Quem pode | Uso |
|---|---|---|---|
| `POST` | `/approvals` | interno (chamado pelo runtime do dono) | registra o pedido e dispara o aviso |
| `GET` | `/approvals/{id}` | dono **ou** aprovador atribuído (403 para os demais) | ler o pedido |
| `POST` | `/approvals/{id}/decide` | quem o snapshot autoriza (ver abaixo) | `{ approved, feedback? }` |
| `POST` | `/approvals/{id}/cancel` | dono **sempre**, mesmo sem poder decidir (D12) | run abortado/parado |
| `POST` | `/approvals/{id}/renotify` | dono | reenviar aviso |
| `GET` | `/approvals?runId=` | dono | trilha para o histórico do run |
| `GET` | `/approvals/assigned-to-me?status=pending` | qualquer usuário autenticado (retorna as suas) | RF16 |
| `GET`/`POST`/`PUT`/`DELETE` | `/notification-channels` | dono | conexão n8n. `url` nunca sai na resposta |
| `POST` | `/notification-channels/{id}/test` | dono | RF6 |
| `GET`/`POST`/`DELETE` | `/squads/{squadId}/approvers` | dono | pool (RF1); `POST` recebe `{ email }` |
| `PUT` | `/squads/{squadId}/agents/{agentId}` (já existe) | dono | `approvalPolicy` no corpo (RF2/RF3), validada pela invariante |

Erros pelas exceções compartilhadas: inexistente → `ResourceNotFoundException` (404); autenticado sem
permissão sobre o pedido → `ForbiddenException` (403, D9); já decidido → `ConflictException` (409);
reprovação sem justificativa → `BusinessRuleViolationException` (422); política insatisfazível ou id fora do
pool → `BusinessRuleViolationException` (422, D13); e-mail sem conta no convite →
`ResourceNotFoundException` com mensagem específica ("nenhuma conta encontrada com esse e-mail").

### A regra de autorização, num só lugar

`ApprovalService` resolve tudo por uma função única, sempre contra o **snapshot** do pedido (D8), nunca
contra a configuração ao vivo:

```txt
canDecide(requesterId, request) =
     requesterId in request.approverUserIds
  || (requesterId == request.ownerUserId && request.ownerCanDecide)

canCancel(requesterId, request) =
     requesterId == request.ownerUserId
```

Consequências que a UI precisa refletir: o dono de um agente com `ownerCanDecide == false` recebe **403 no
`decide`** e a tela mostra "você se retirou da decisão deste agente" — não um erro genérico de permissão, que
faria ele achar que é bug. E o botão de abortar continua disponível para ele (D12).

## Contrato do payload (para o n8n)

> O workflow que consome este payload está pronto em [`n8n-workflow.md`](n8n-workflow.md) — importável, com
> só as duas credenciais e o id do chat a corrigir.

`POST {channel.url}`, `Content-Type: application/json`, header de autenticação opcional. Timeout de 3s para
conectar e 5s no total, **uma tentativa** — falhou, registra `notifyError`.

```json
{
  "version": 1,
  "event": "checkpoint.opened",
  "approvalId": "uuid",
  "squad": { "id": "uuid" },
  "run": { "id": "uuid" },
  "agent": { "id": "uuid" },
  "checkpointKind": "before",
  "title": "Aprovação necessária antes de acionar Publicador",
  "summary": "texto curto, já truncado pela API",
  "decisionUrl": "https://app.workestrator.../dashboard/aprovacoes/{approvalId}",
  "approvers": [
    { "email": "ana@empresa.com", "displayName": "Ana Souza" }
  ],
  "createdAt": "2026-07-30T14:32:10Z"
}
```

- `squad`/`run`/`agent` carregam só o `id`, para correlação — quem compõe o texto legível é o **runtime no
  navegador**, ao montar `title`/`summary` antes de chamar `POST /approvals` (ele já tem nome de squad/agente
  em memória, rodando a orquestração). O backend não busca nome de ninguém só para reconstruir o que o
  cliente já compôs — um `SquadRepository`/lookup de agente aqui seria dado buscado para nunca ser usado.
- `decisionUrl` é a **mesma** tela para dono ou aprovador (D6) — o link não carrega identidade nem token; a
  autorização acontece no login normal do Workestrator.
- `approvers` é opcional e aditivo (não pede incremento de `version`): lista os aprovadores atribuídos
  àquele agente, resolvidos do snapshot (`ApprovalService.resolveApprovers`, via `UserRepository`), para o
  fluxo do n8n poder rotear dinamicamente por e-mail em vez de ter uma pessoa fixa configurada nele. O fluxo
  pode ignorar o campo e continuar mandando para um contato fixo — nenhuma mudança é exigida do lado dele.
- `summary` — cortado no servidor. **Nunca** contém `toolLog`, valor de segredo ou artefato completo.
- Resposta esperada: qualquer `2xx`, corpo ignorado.

O `test` (RF6) envia o mesmo payload com `event: "checkpoint.opened"`, `approvalId` nulo e dados de exemplo.

## Cliente

**Runtime** (`orchestrator-runtime.ts`):

- `enterCheckpoint({ seatId, agent, kind })` (função única, hoje duplicada nos dois pontos de pausa):
  `POST /approvals` **sem `await` no caminho do run** (`void` + `catch` que só registra) — o checkpoint
  aparece na UI na mesma hora, com ou sem aviso;
- guarda `pendingApprovalId` no runtime e no `runtimeSnapshot`;
- **inicia o `approval-watcher`** (D7) assim que `pendingApprovalId` existe — poll de 10s em
  `GET /approvals/{id}`, `AbortController` próprio, para no primeiro estado terminal;
- watcher detectando `APPROVED`/`REJECTED` chama a mesma lógica de `resolveCheckpoint` internamente — o
  dono decidindo localmente (pela UI já existente) e o watcher detectando uma decisão externa convergem no
  mesmo caminho de continuar/abortar o run;
- `resolveCheckpoint(squadId, approved, rejection?)`: grava a reprovação em `RunRecord.rejections[]` (formato
  definido pela [002](../002-treinamento-pos-reprovacao/design.md#modelo-de-dados) — fazer **uma vez**) e
  chama `POST /approvals/{id}/decide`;
- `stopRun`/`finishRun` chamam `cancel`; `resumeRun` com `pendingApprovalId` no snapshot reusa o pedido
  (busca o estado atual antes de decidir o que fazer — `approved`/`rejected` aplicam na hora, `pending`
  reinicia o watcher).

**Tela de decisão** (D5/D6) — feature nova `features/security/approvals/`:

- rota `Rotas.protegidas.orchestrator.approvalDecide = "/dashboard/aprovacoes/:approvalId"`, registrada sob
  o `<Middleware />` **genérico** (`apps/web/src/app/routing/index.tsx`), não sob nenhuma guarda de squad —
  é exatamente por isso que esse componente existe (exige login, não exige ser dono);
- `page-approval-decide.tsx`: `GET /approvals/{id}`; 403 → mensagem clara, **distinguindo os dois casos**
  ("você não tem permissão sobre esta aprovação" vs. "você se retirou da decisão deste agente" quando o
  requester é o dono com `ownerCanDecide == false`); estado terminal → mostra o resultado e quem decidiu;
  `PENDING` → resumo + Aprovar (1 clique) / Reprovar (`FieldWrapper` com justificativa obrigatória) →
  `POST /approvals/{id}/decide`. Para o dono sem poder de decisão, mostrar o botão de **abortar o run** (D12)
  em vez dos controles de aprovação;
- depois de decidir, mostra confirmação — **não** tenta acessar nada do squad;
- `page-approvals-assigned.tsx` (RF16): lista as aprovações de `GET /approvals/assigned-to-me`, com link para
  a mesma tela de decisão. É o fallback de quem não recebeu (ou perdeu) o aviso do Teams.

**Gerenciamento do pool e da política (visão do dono):**

- seção "Aprovadores" no squad (novo `squad-approvers-dialog` ou aba em `squad-detail`): convite por e-mail
  (`POST /squads/{id}/approvers`), lista, remover;
- `agent-form-dialog`: seletor multi-select **restrito ao pool do squad** para `approvalPolicy.approverUserIds`
  + toggle **"eu também posso decidir"** (`ownerCanDecide`, ligado por default), ao lado do toggle/conexão de
  `notifyPolicy`. O toggle fica **desabilitado enquanto não houver aprovador atribuído**, com o motivo à
  mostra — a invariante do D13 aparece como impossibilidade na UI, não como erro depois de salvar.

**Tipos** (`orchestrator-shared/types/index.ts`): `NotificationChannel`, `ApprovalRequest`, `ApprovalStatus`,
`ApprovalDecidedByRole`, `AgentNotifyPolicy`, `AgentApprovalPolicy`, `SquadApprover`; `Agent.notifyPolicy?`,
`Agent.approvalPolicy?`; `Runtime.pendingApprovalId: string | null`; `RuntimeSnapshot.pendingApprovalId`.

**UI existente que muda:**

| Tela | Mudança |
|---|---|
| `run-interaction-panel.tsx` | status do aviso; se houver aprovadores atribuídos, mostra quem pode decidir além do dono |
| diálogo de reprovação | justificativa obrigatória, igual em qualquer lugar que decida |
| `connectors-catalog.ts`, `page-secrets.tsx` | card "Notificações (n8n)" |
| `run-detail-sheet` | trilha de aprovações, incluindo quem decidiu e se era dono ou aprovador |

## Segurança

- Nenhuma rota pública nesta feature — toda entrada exige sessão autenticada do Workestrator.
- Autorização de `decide`/`get` **sempre** contra o snapshot (`approverUserIds` do pedido), nunca contra o
  pool ao vivo — remover alguém do pool não revoga silenciosamente uma decisão em andamento sobre um pedido
  já aberto para ele.
- Aprovador não tem *nenhuma* rota alternativa para o squad: a tela de decisão não faz nenhuma chamada além
  de `GET /approvals/{id}` e `POST /approvals/{id}/decide` — não há como "pivotar" dali para o squad porque
  o componente simplesmente não conhece outra API.
- `summary` truncado no servidor, sem `toolLog`, sem segredo, sem artefato completo — é literalmente tudo que
  o aprovador enxerga do run.
- URL do webhook e segredo do n8n nunca saem do backend nem aparecem em resposta de API.
- Convite de aprovador exige e-mail de conta existente (D4) — sem isso, criar-conta-por-convite abriria
  outra superfície (enumeração de e-mail, criação não solicitada de usuário) fora do escopo desta feature.

## Fases

**Fase 1 — tudo que está desenhado aqui.** Pool de aprovadores, atribuição por agente, conexão de
notificação, registro do pedido, aviso, tela de decisão dedicada, lista "atribuídas a mim", poll no cliente
do dono, justificativa obrigatória, trilha no histórico.

**Fase 2 — aprovador sem conta (se o cenário aparecer de verdade).** Só se, no futuro, for necessário
alguém decidir **sem** ter conta no Workestrator. Reabre token público de uso único, expiração e,
opcionalmente, login Microsoft/OIDC para identidade verificada — o preço que evitamos pagar agora ao escolher
"conta existente" em vez de "anônimo".

**Fase 3 — outros eventos e canais.** `question.asked` (agente perguntou, run em `awaiting_input`),
`run.completed`, `run.aborted` no mesmo contrato; outros canais de saída (WhatsApp, e-mail) sem mudança
nenhuma aqui, porque quem escolhe o canal é o fluxo externo.

## Riscos

| Risco | Mitigação |
|---|---|
| Poll de 10s por checkpoint pendente, agora incondicional | custo por pedido é irrisório; watcher para no primeiro estado terminal; `AbortController` evita acúmulo |
| Dono esquece de atribuir aprovador e ninguém mais decide | é o default atual (só dono decide) — comportamento conhecido, não uma regressão |
| **Run preso com `ownerCanDecide: false` e aprovador indisponível** (férias, saiu da empresa, conta desativada) | D12: o dono sempre pode abortar. Além disso, a invariante do D13 garante que existe ao menos um aprovador atribuído — mas *existir* não é *estar disponível*, então abortar é a única garantia real. Escalonamento automático é non-goal explícito |
| Dono se retira da decisão e depois estranha o 403 | mensagem específica na tela ("você se retirou da decisão deste agente"), não erro genérico de permissão |
| Convite de aprovador vira canal de descoberta de e-mails cadastrados | resposta de erro genérica o bastante ("conta não encontrada"), sem detalhar mais — ⚠️ revisar se isso é suficiente contra enumeração antes de expor a UI publicamente |
| Aprovador removido do pool depois do convite, mas ainda aparece em pedidos antigos | D8 é intencional (snapshot); a UI do dono deixa claro que é histórico, não permissão atual |
| Fluxo do n8n quebra em silêncio | error workflow no lado do n8n (fora daqui) + `notifyError` visível na UI |
| `ddl-auto=update` não atualiza `*_check` de enum | enums já nascem completos no v1 |
| Build Kotlin não verificável em ambiente sandbox (loopback do daemon Gradle) | rodar `gradlew.bat compileKotlin` em terminal normal antes de confiar |

## Testes

**Backend (JUnit 5 + Mockito):**

- `squad_approvers`: convite por e-mail existente cria vínculo; e-mail inexistente → 404 claro; convite
  duplicado é no-op; só o dono gerencia o pool (outro usuário tentando → 403).
- **Invariante da política (D13):** salvar `ownerCanDecide: false` com `approverUserIds` vazio → 422; salvar
  id que não está no pool → 422; remover do pool o último aprovador de um agente com `ownerCanDecide: false`
  → 422 nomeando o agente; remover quando ainda sobra outro aprovador → sucesso; remover aprovador de agente
  com `ownerCanDecide: true` → sucesso.
- `create`: registra o pedido com `approverUserIds` **e** `ownerCanDecide` snapshotados a partir da política
  do agente; dispara o aviso quando `notifyPolicy.enabled`; falha no envio grava `notifyError` sem falhar a
  requisição.
- `decide`/`get`: aprovador do snapshot decide; dono com `ownerCanDecide: true` decide; **dono com
  `ownerCanDecide: false` → 403**; usuário autenticado fora de tudo → 403; primeira decisão grava, segunda →
  409 com o corpo original; `approved: false` sem justificativa → 422.
- `cancel`: **dono com `ownerCanDecide: false` consegue cancelar** (D12); aprovador tentando cancelar → 403.
- **Imutabilidade da política do pedido (D8):** criar o pedido, alterar a política do agente (inclusive
  `ownerCanDecide`), e conferir que a autorização daquele pedido pendente **não** mudou; o próximo pedido já
  nasce com a política nova.
- Isolamento: pedido de outro dono/squad → 404 para quem não é dono nem aprovador.
- `assigned-to-me`: retorna só os pedidos onde o usuário está no snapshot, filtráveis por status.

**Cliente (Vitest, ao lado de `orchestrator-runtime.test.ts`):**

- `enterCheckpoint` não bloqueia a transição para `checkpoint` mesmo com `POST /approvals` pendente;
- watcher detectando decisão externa aplica o mesmo caminho de `resolveCheckpoint`;
- `resolveCheckpoint(false, rejection)` registra decisão e justificativa;
- `resumeRun` com `pendingApprovalId` reusa o pedido, sem duplicar;
- `stopRun` cancela o pedido pendente.

**Manual:** critérios 1 a 7 e 12 da [spec](spec.md) — fluxo completo dono + aprovador, incluindo o fluxo do
n8n real.

## Arquivos a tocar

| Camada | Arquivo | Mudança |
|---|---|---|
| API | `apps/api/.../features/approval/**` | feature nova (controller, service, repos, dtos, model, exceptions) |
| API | `apps/api/.../features/approval/model/SquadApprover.kt` + repositório | pool de aprovadores |
| API | `apps/api/.../features/approval/service/integration/WebhookNotifier.kt` | cliente HTTP do webhook n8n — **síncrono** (reusado por `NotificationChannelService.test`); `RestClient` dedicado com timeout, não o de `oauth/config` |
| API | `apps/api/.../features/approval/service/integration/ApprovalNotificationDispatcher.kt` | **único** ponto `@Async` (D14) — chamado de `ApprovalService`, nunca invocado dentro da própria classe |
| API | `apps/api/.../features/approval/config/ApprovalProperties.kt` | timeouts, limite do `summary`, base do `decisionUrl` — refletido em `application.properties` (`app.approval.*`) e `.env.example` |
| API | `apps/api/.../features/agent/**` | colunas + DTO de `notifyPolicy` e `approvalPolicy`; validação da invariante D13 em `AgentService` |
| Web | `features/security/orchestrator-shared/types/index.ts` | tipos de notificação/aprovação/pool |
| Web | `features/security/orchestrator-shared/runtime/orchestrator-runtime.ts` | `enterCheckpoint`, `resolveCheckpoint` com justificativa, `approval-watcher` |
| Web | `features/security/orchestrator-shared/runtime/approval-watcher.ts` | novo — poll incondicional (D7) |
| Web | `features/security/approvals/api/**` | novo (service/keys/types) |
| Web | `features/security/approvals/page-approval-decide.tsx` | novo — tela dedicada (D5) |
| Web | `features/security/approvals/page-approvals-assigned.tsx` | novo — "atribuídas a mim" (RF16) |
| Web | `app/routing/variables.ts`, `app/routing/index.tsx` | rota nova sob `<Middleware />` genérico |
| Web | `components/orchestrator/run-transcript/run-interaction-panel.tsx` | status do aviso + quem pode decidir |
| Web | `features/security/squad-detail/components/agent-form-dialog/**` | `approvalPolicy` (multi-select restrito ao pool) |
| Web | `features/security/squad-detail/**` (novo `squad-approvers-dialog`) | gestão do pool |
| Web | `features/security/secrets/connectors-catalog.ts`, `page-secrets.tsx` | conexão de notificação |
| Web | `components/orchestrator/run-detail-sheet/**` | trilha de aprovações |
| Docs | `apps/web/CLAUDE.md`, `apps/api/CLAUDE.md` | registrar o comportamento novo |

Fora deste repositório: o fluxo do n8n — JSON pronto em [`n8n-workflow.md`](n8n-workflow.md), consumindo
[o contrato do payload](#contrato-do-payload-para-o-n8n).
