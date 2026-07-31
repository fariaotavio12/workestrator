# 002 — Treinamento do agente após reprovação · Design

## Estado atual

**A reprovação.** `resolveCheckpoint(squadId, approved)` em
`apps/web/src/features/security/orchestrator-shared/runtime/orchestrator-runtime.ts` (linha ~1357): com
`approved: false` escreve `"Checkpoint rejeitado."` no log e chama `finishRun(squadId, "aborted")`. Não há
parâmetro de motivo, nem campo onde guardá-lo.

**O que já existe e resolve a maior parte do problema:**

| Peça | Onde | Uso aqui |
|---|---|---|
| RAG completo | `apps/api/.../features/knowledge/**` | coleções, upload, chunking, embeddings (OpenAI/Voyage), busca por similaridade |
| Ingestão por Tika | `knowledge/service/IngestionService.kt` | extrai texto de **qualquer** formato que o Tika leia — markdown incluso. Um `.md` sintetizado no cliente entra pelo endpoint multipart que já existe, **sem mudança no backend** |
| Recuperação no run | `runtime/knowledge-retrieval.ts` (`buildRetrievalBlock`) + `Agent.knowledgeCollectionIds` | a lição salva é injetada no prompt do agente nos runs seguintes, com orçamento de caracteres já controlado |
| Chamada de modelo fora de um run | `runtime/config-assistant-runtime.ts` sobre `callAgentStep` (`runtime/model-client.ts`) | precedente exato do "treinador": runtime em nível de módulo, prompt com saída JSON, sem depender de componente montado |
| `retryLastStep(squadId, run)` | `orchestrator-runtime.ts:1572` | descarta o último passo e re-executa a mesma cadeira — é o RF14 pronto |
| `RunRecord.steps` / `qaLog` | `RunEntity` (`jsonb`, passthrough "frontend-owned") | campo novo no `RunRecord` **não exige mudança de backend** |
| Visualizador de diff | `apps/web/src/components/diff-viewer/diff-viewer.tsx` | revisão da alteração de prompt |
| `AppSheet` | `apps/web/src/components/sheet` | painel lateral com header/scroll/footer para a tela de revisão |

Ou seja: a infraestrutura de aprendizado existe. O que falta é o **circuito** que liga a reprovação a ela.

## Decisões

| # | Decisão | Motivo | Alternativa descartada |
|---|---|---|---|
| D1 | RAG + refino de prompt; fine-tuning fora | ver a tabela de motivos na [spec](spec.md#decisão-rag--refino-de-prompt-não-fine-tuning) | fine-tuning agora |
| D2 | A proposta de treinamento **não é persistida** | todas as entradas (briefing, passos, saída, justificativa, prompt atual) já ficam no run — a proposta é regenerável a qualquer momento a partir do histórico | tabela `training_sessions` guardando proposta gerada, que envelhece junto com o prompt do agente e vira lixo |
| D3 | Lição vai para a base como `.md` sintetizado no cliente, pelo endpoint multipart existente | zero mudança no backend, reusa Tika + chunking + embeddings + status de ingestão | endpoint novo `POST /knowledge/{id}/documents/text`, que duplicaria o pipeline por conveniência de tipo |
| D4 | Um documento por lição | dá para apagar uma lição sem tocar nas outras, e `documentCount` continua significando algo | um documento acumulador reescrito a cada lição (reprocessa tudo, perde granularidade) |
| D5 | Coleção de lições referenciada por id em coluna nova do squad | achar a coleção por nome quebra no primeiro rename | busca por nome `Lições aprendidas — <squad>` |
| D6 | Versão de prompt criada **pelo backend** em toda alteração de `systemPrompt` | impossível burlar o versionamento; edição manual também fica registrada | versionar só quando a alteração vem do treinamento |
| D7 | O treinador roda no `modelRef` do **coordenador** do squad, com override opcional | é o modelo de raciocínio já escolhido para o squad; o modelo do agente culpado pode ser um CLI local barato, inadequado para diagnóstico | usar o modelo do próprio agente |
| D8 | O treinador nunca executa nada (`canExecute: false`, sem scripts) | é diagnóstico e redação; ferramenta ali só abre superfície de risco | reaproveitar a configuração do agente culpado |
| D9 | Treinamento é ação explícita do usuário, nunca automática | é uma chamada de modelo paga e uma alteração de comportamento; disparar sozinho ao reprovar transforma irritação em regra permanente | treinar automaticamente ao reprovar |
| D10 | A proposta **reescreve** a seção de regras aprendidas; não anexa | um prompt que só cresce fica caro, contraditório e inauditável | append de bullet a cada reprovação |

## Fluxo

```txt
checkpoint reprovado
   │ justificativa (obrigatória) + passo culpado + classificação
   ▼
RunRecord.rejections[]  ──────────────► histórico do run (visível mesmo sem treinar)
   │
   │ usuário clica "Treinar o agente"          (ação explícita — D9)
   ▼
training-runtime.ts
   monta o dossiê: briefing, passo culpado + passos que o alimentaram,
   saída reprovada, justificativa, classificação, systemPrompt atual
   │
   ▼ callAgentStep (modelo do coordenador, canExecute: false)
   │
   ▼ JSON: { diagnosis, blameVerdict, lesson, promptPatch, confidence }
   │
   ├─ blameVerdict != "agent"  ──► mostra o diagnóstico e para (RF8)
   │
   ▼ tela de revisão (AppSheet)
   ├─ lição editável (markdown)     ──► [Salvar na base]   ──► .md → POST /knowledge/{id}/documents
   │                                                          + vincula coleção ao agente (RF11)
   └─ diff do systemPrompt          ──► [Aplicar prompt]   ──► PUT agent (+ versão nova, D6)
                                                                │
                                                                ▼
                                                      [Refazer o passo] → retryLastStep
```

## Contrato do treinador

Saída **estritamente** JSON, no molde do que `orchestrator-decision.ts` e `operations/assistant.ts` já
fazem (com o mesmo cuidado: o parser aceita cerca de código em volta e tem fallback claro para saída
inválida, sem quebrar a tela).

```json
{
  "diagnosis": "string curta, o que aconteceu",
  "blameVerdict": "agent | briefing | upstream_step | tooling | unclear",
  "lesson": {
    "title": "string",
    "scenario": "quando isso se aplica",
    "mistake": "o que foi feito de errado",
    "rule": "o que fazer no lugar",
    "example": "exemplo curto do certo (opcional)"
  },
  "promptPatch": {
    "proposedSystemPrompt": "texto completo do prompt reescrito",
    "rationale": "por que essa mudança resolve",
    "changedSections": ["Regras aprendidas"]
  },
  "confidence": 0.0
}
```

Regras embutidas no prompt do treinador:

- `blameVerdict` diferente de `agent` ⇒ `promptPatch` **ausente**. Erro de briefing, de passo anterior ou de
  ferramenta não se corrige mudando o prompt de quem foi reprovado.
- `proposedSystemPrompt` é o **texto completo**, não um patch — evita aplicar diff mal-formado. A UI mostra o
  diff calculado localmente contra o prompt atual.
- A reescrita consolida a seção `## Regras aprendidas` (criada na primeira vez), sem duplicar regra
  existente e sem contradizer o resto do prompt. Regra que já existe em outras palavras deve ser reescrita,
  não somada.
- `lesson` é escrita com o vocabulário do problema, para ser encontrada por similaridade — não como ata
  ("no run de 12/03 o Redator errou").
- Nada de conteúdo de segredo, token, header ou caminho absoluto de máquina.

## Modelo de dados

**Captura — zero mudança no backend.** `RunRecord` (frontend-owned, `jsonb` passthrough) ganha:

```txt
rejections?: {
  id: string
  seatId: string
  agentId?: string
  blamedStepId?: string
  checkpointKind: "before" | "after"
  reason: string
  category?: "instruction" | "wrong_info" | "format" | "tone" | "missing_step" | "out_of_scope" | "other"
  severity?: "low" | "medium" | "high"
  decidedBy?: string
  decidedByRole?: "owner" | "approver"
  createdAt: string
  training?: {
    lessonDocumentId?: string
    promptVersionId?: string
    retriedRunId?: string
    skippedReason?: string
  }
}[]
```

**Versionamento de prompt — backend.** Feature nova
`apps/api/.../features/agentpromptversion/` (layout padrão), tabela `agent_prompt_versions`:

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `userId` | uuid | escopo `@GetUserId` |
| `squadId` / `agentId` | uuid | |
| `version` | int | sequencial por agente |
| `systemPrompt` | text | o texto **anterior** à alteração |
| `reason` | text nullable | motivo informado |
| `sourceRunId` | uuid nullable | run que originou |
| `sourceRejectionId` | text nullable | reprovação que originou |
| `createdAt` | timestamptz | |

Criada dentro de `AgentService.update` sempre que `systemPrompt` muda (D6). `AgentRequest` ganha
`promptChangeReason?`, `sourceRunId?`, `sourceRejectionId?` — opcionais, ignorados quando o prompt não muda.

Endpoints:

| Método | Rota | Uso |
|---|---|---|
| `GET` | `/squads/{squadId}/agents/{agentId}/prompt-versions` | histórico (RF13) |
| `POST` | `/squads/{squadId}/agents/{agentId}/prompt-versions/{versionId}/revert` | reverter (RF12) — restaura o texto e registra a reversão como versão nova |

**Coleção de lições.** Coluna nullable `lessonsCollectionId uuid` em `SquadEntity` + campo no domínio e nos
DTOs. Criada pelo `ddl-auto=update` sem migração manual.

## Cliente

**`runtime/training-runtime.ts`** (novo, no molde de `config-assistant-runtime.ts`):

- `buildTrainingDossier(run, rejection, squad)` — monta o texto de entrada com orçamento de caracteres por
  seção (mesma disciplina de `buildRunHistorySummary` e `buildRetrievalBlock`): a saída reprovada tem
  prioridade, os passos anteriores entram truncados, o `toolLog` **não** entra.
- `runTraining(...)` — `callAgentStep` com o modelo do coordenador, `canExecute: false`, `scripts: []`,
  `AbortController` próprio, e parse tolerante do JSON.
- `applyLesson(...)` — monta o markdown, cria a coleção do squad se ausente, sintetiza o `File`, sobe pelo
  endpoint multipart existente, e **vincula a coleção ao agente** se ele ainda não a consultava (RF11 — sem
  isso a lição nunca é recuperada).
- `applyPromptPatch(...)` — valida o teto, chama `PUT /squads/{id}/agents/{id}` com `promptChangeReason` e
  as referências de origem.
- Store própria (`use-training-store`) para o estado da proposta em revisão, não o store do runtime — a
  revisão pode durar minutos e sobreviver ao fechamento do diálogo do run.

**Guarda anti-inchaço.** `MAX_SYSTEM_PROMPT_CHARS` e um limite de crescimento por aplicação. Estourar
**bloqueia só o prompt**, com mensagem dizendo que é hora de consolidar ou mover conhecimento para a base — a
lição continua aplicável. O número certo depende do provider; começar largo e ajustar com uso.

**Formato do arquivo da lição** — `licao-<data>-<run curto>-<n>.md`:

```markdown
# «título»

## Quando se aplica
«scenario»

## O que deu errado
«mistake»

## Regra
«rule»

## Exemplo
«example»

---
Origem: run «id» · «data» · reprovado por «quem» · agente «nome»
```

A procedência fica **no fim**: em cima ela roubaria peso semântico do chunk e pioraria a recuperação.

**UI:**

| Tela | Mudança |
|---|---|
| diálogo de reprovação (`run-interaction-panel.tsx`) | justificativa obrigatória, seletor do passo culpado (default: o do checkpoint), categoria e gravidade opcionais |
| `training-sheet` (novo, em `features/security/training/components/`) | diagnóstico, lição editável, diff do prompt, ações independentes (RF10) e "refazer o passo" |
| `run-detail-sheet` | reprovações do run + o que foi feito com cada uma; permite treinar depois (D2 torna isso possível) |
| `agent-form-dialog` | histórico de versões do prompt com motivo, run de origem e reverter |
| `page-knowledge-detail` | nenhuma mudança — as lições aparecem como documentos normais |

## Integração com a 001

A 001 ficou sendo **notificação de saída via n8n + decisão sempre autenticada no Workestrator**, podendo
vir do dono do squad **ou de um aprovador delegado** (usuário cadastrado, sem acesso ao squad). Isso
simplifica esta feature em vez de complicar:

- **Toda reprovação passa pela mesma tela de decisão** (do dono ou do aprovador), com o mesmo diálogo
  estruturado — passo culpado, categoria e gravidade sempre disponíveis. Não existe caso degradado de
  "justificativa vinda de um cartão simples".
- A captura é a mesma coisa nas duas specs: `resolveCheckpoint(squadId, false, rejection)` →
  `RunRecord.rejections[]`, e `ApprovalRequest.feedback` no backend para a trilha de auditoria. Fazer **uma
  vez**, não duas.
- `RunRejection` ganha `decidedByRole: "owner" | "approver"` (espelha `ApprovalDecidedByRole` da 001). Não
  muda o que o treinador analisa, mas é um dado relevante para o diagnóstico: uma reprovação de um aprovador
  externo ao squad tende a ser mais confiável como sinal de "o agente realmente errou" do que uma do próprio
  dono ajustando às pressas — o prompt do treinador pode considerar isso, sem que seja uma regra rígida.
- A dependência real é só a justificativa obrigatória (fase 1 da 001). Sem pool de aprovadores, sem n8n, sem
  Teams, esta feature funciona inteira.

## Fases

**Fase 1 — Captura.** `resolveCheckpoint` com justificativa, `RunRecord.rejections[]`, diálogo de reprovação,
exibição no histórico. Entrega auditoria sozinha; é pré-requisito de tudo aqui e sai junto com a fase 1 da
001.

**Fase 2 — Treinador e lição.** `training-runtime.ts`, contrato JSON, `training-sheet`, gravação da lição na
base com vínculo automático ao agente, coluna `lessonsCollectionId`.

**Fase 3 — Prompt versionado e refazer.** `agent_prompt_versions`, versionamento dentro de
`AgentService.update`, histórico e reversão na UI, aplicação do patch, "refazer o passo" via `retryLastStep`
com o vínculo `retriedRunId`.

**Fase 4 — Export de dataset (opcional).** As reprovações registradas geram um `JSONL` de pares
(entrada, saída corrigida). Só faz sentido depois de meses de uso; é o único caminho honesto para reabrir a
conversa de fine-tuning, agora com dados na mão.

## Riscos

| Risco | Mitigação |
|---|---|
| **Prompt incha até ficar caro e contraditório** | D10 (reescrita, não append) + teto com bloqueio + histórico visível que expõe o crescimento |
| **Base de lições polui a recuperação** — 40 lições competindo com a documentação real do agente | um documento por lição (D4) para dar de apagar; coleção separada da base de domínio; se o ruído aparecer, o próximo passo é ranquear por recência, não misturar tudo |
| **Treinador vira máquina de desculpa** — `blameVerdict: "briefing"` sempre, nada nunca é do agente | conferir na avaliação manual da fase 2; o prompt exige evidência do passo/artefato para culpar briefing ou passo anterior |
| **Regra aprendida de um caso vira lei geral** e piora o comportamento no caso comum | `scenario` obrigatório na lição; revisão humana é a barreira real (RF9) |
| **Reprovação emocional vira regra permanente** | D9 (nunca automático) + revisão + reversão de um clique |
| **Custo do treinamento surpreende** | é chamada explícita, uma por reprovação, no modelo do coordenador; mostrar na UI que é uma chamada de modelo |
| **Segredo vazando na lição** | regra explícita no prompt + a lição passa por revisão humana antes de ser salva |
| **`ddl-auto=update` e `*_check` de enum** | as colunas novas aqui são `jsonb`/`uuid`/`text` nullable, sem enum de banco — o risco não se aplica; se algum enum for adicionado depois, valem as regras já registradas em `apps/web/CLAUDE.md` |

## Testes

**Vitest:**

- `resolveCheckpoint(squadId, false, feedback)` grava a reprovação no `RunRecord` e aborta;
- reprovar sem justificativa não passa (guard no runtime, não só na UI);
- `buildTrainingDossier` respeita o orçamento por seção e prioriza a saída reprovada; nunca inclui `toolLog`;
- parse do JSON do treinador: válido, com cerca de código, inválido (mensagem clara, nada aplicado);
- `blameVerdict != "agent"` ⇒ nenhuma proposta de prompt oferecida;
- `applyLesson` cria a coleção na primeira vez, reusa depois, e vincula ao agente quando ausente;
- guarda de tamanho bloqueia o prompt e **não** bloqueia a lição;
- `retryLastStep` após aplicar registra `retriedRunId` na reprovação de origem.

**JUnit:**

- `AgentService.update` alterando `systemPrompt` cria versão com o texto **anterior**; não alterando, não
  cria;
- `revert` restaura o texto e registra a reversão como versão nova;
- isolamento: versões de outro `userId` → 404;
- `lessonsCollectionId` persiste e volta no `SquadResponse`.

**Manual (não automatizável):** qualidade da lição e do patch em 5 reprovações reais de naturezas diferentes.
É o único teste que diz se a feature vale — os automatizados só garantem que o encanamento funciona.

## Arquivos a tocar

| Camada | Arquivo | Mudança |
|---|---|---|
| Web | `orchestrator-shared/types/index.ts` | `RunRejection`, `RunRecord.rejections`, `TrainingProposal`, `AgentPromptVersion`, `Squad.lessonsCollectionId` |
| Web | `orchestrator-shared/runtime/orchestrator-runtime.ts` | `resolveCheckpoint` com justificativa e gravação da reprovação |
| Web | `orchestrator-shared/runtime/training-runtime.ts` | novo — dossiê, chamada, parse, aplicação |
| Web | `orchestrator-shared/model/use-training-store.ts` | novo |
| Web | `features/security/training/**` | `training-sheet` e componentes de revisão |
| Web | `components/orchestrator/run-transcript/run-interaction-panel.tsx` | diálogo de reprovação estruturado |
| Web | `components/orchestrator/run-detail-sheet/**` | reprovações no histórico + treinar depois |
| Web | `features/security/squad-detail/components/agent-form-dialog/**` | histórico de versões do prompt |
| Web | `features/security/knowledge/api/service.ts` | função de upload chamável fora de hook (o runtime não é React) |
| Web | `features/security/squad-detail/api/**` | `promptChangeReason`/origem no payload do agente; `lessonsCollectionId` no squad |
| API | `features/agentpromptversion/**` | feature nova |
| API | `features/agent/service/AgentService.kt` | criar versão quando `systemPrompt` muda |
| API | `features/agent/dto/AgentDtos.kt` | campos de motivo/origem |
| API | `features/squad/**` | coluna e DTO de `lessonsCollectionId` |
| API | `messages_{pt,en}.properties` | mensagens novas |
| Docs | `apps/web/CLAUDE.md`, `apps/api/CLAUDE.md` | registrar o circuito de treinamento |
