# Plano — melhorias no preview "Arquivos gerados"

Três problemas observados no `PreviewModal` ("Arquivos gerados") durante um run do squad de carrossel,
com a causa raiz de cada um e o plano de correção. **Decisão:** executar **A1 + B + C** (A2 fica como
alternativa de isolamento, não escolhida agora).

## Diagnóstico

### 1. Arquivos da sessão anterior aparecem no run novo (bug real)
- `openWorkspaceFiles` chama `listWorkspaceFiles("", false)` — `changedOnly=false` lista **tudo em disco**.
  Ver `src/components/orchestrator/run-dialog/run-dialog.tsx:90`.
- O runner reusa **um workspace fixo** (`orchestrator-workspace/`) que **nunca é limpo entre runs**
  (`ensureWorkspace` só faz `mkdir` — `electron/runner/runner.ts`).
- Resultado: os `output/slides/slide-01..05.html` do run anterior ficam em disco e aparecem como se
  fossem do run atual.

### 2. Título colado na lista (sem espaçamento)
- `src/components/preview/preview-modal.tsx:32` — o `DialogHeader` não tem espaço antes do corpo; o
  título ("Arquivos gerados") encosta direto na `FileList`.

### 3. Sem scroll na lista de arquivos
- `src/components/preview/file-list.tsx:33` já tem `overflow-auto`, mas sem `min-h-0` na lista e no
  wrapper (`preview-modal.tsx`) a coluna cresce em vez de rolar quando há muitos arquivos.

## Plano de correção

### A. Arquivos stale — A1 (escolhida): limpar no início de cada run
- Novo endpoint no runner: `POST /api/reset-workspace` que apaga o conteúdo de
  `orchestrator-workspace/output` (recria a pasta vazia; preserva `.git`/`scripts`).
  Registrar em `electron/runner/server.ts` e no middleware `vite dev` (`vite.config.ts`), como os
  outros endpoints (`/api/run-step`, `/api/list-files`, ...).
- Adicionar um helper no `model-client.ts` (ex.: `resetWorkspace()`) e chamá-lo no `startRun`
  (`src/features/security/orchestrator-shared/runtime/orchestrator-runtime.ts`) antes do 1º agente.
- Cuidado: só limpar no **início** de um run novo — nunca em `continueRun`/`resumeRun`/`retryLastStep`
  (esses reaproveitam arquivos do run em andamento).

### A2. (alternativa, NÃO escolhida) isolamento por run
- Cada run escreve em `orchestrator-workspace/runs/<runId>/`; o preview lê só essa pasta
  (`registerPreviewRoot(dir)` + `listWorkspaceFiles(dir)`). Mais robusto (histórico por run), porém
  mexe em runner + runtime + preview. Guardar para depois se A1 não bastar.

### B. Espaçamento do título — `preview-modal.tsx`
- Separar o header do corpo (gap / `pb` + borda sutil abaixo do `DialogHeader`).
- Mostrar contagem acima da lista (ex.: "5 arquivos") como rótulo pequeno (`Typography variant="caption"`
  ou `ui-header`).

### C. Scroll da lista — `file-list.tsx` + `preview-modal.tsx`
- Garantir `min-h-0` na coluna da esquerda (wrapper da `FileList`) e na própria lista para o
  `overflow-auto` valer; a lista rola e o `FilePreview` continua fixo à direita.

### D. (bônus) marcar "gerados neste run"
- O run já produz um `diff` (`captureGitDiff`). Marcar com o ponto `changed` (a `FileList` já suporta
  `changed`) os arquivos criados/alterados agora — reforça A1 e ajuda mesmo se sobrar algo antigo.

## Arquivos afetados (A1 + B + C)
- `electron/runner/runner.ts` — handler de reset do workspace.
- `electron/runner/server.ts` + `vite.config.ts` — rota `/api/reset-workspace`.
- `src/features/security/orchestrator-shared/runtime/model-client.ts` — helper `resetWorkspace`.
- `src/features/security/orchestrator-shared/runtime/orchestrator-runtime.ts` — chamar no `startRun`.
- `src/components/preview/preview-modal.tsx` — espaçamento + contagem + `min-h-0`.
- `src/components/preview/file-list.tsx` — `min-h-0` para scroll.

## Verificação (A/B/C/D)
- `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit -p tsconfig.node.json`, `eslint` nos arquivos.
- Rebuildar o main (`npm run electron:build-main`) e reabrir o app; rodar o squad e confirmar:
  1. o preview mostra só os arquivos do run atual (sem os slides antigos);
  2. título com respiro em relação à lista;
  3. lista rola quando há muitos arquivos.

---

# Furo de contexto entre agentes (descoberto no teste do carrossel)

## Sintoma
No run do squad de carrossel, o **Reviewer pausou pedindo o roteiro/legenda ao usuário** ("preciso do
conteúdo textual..."). Não é bug de budget/render — os 8 HTMLs e 8 JPGs foram gerados corretamente.

## Causa raiz — assimetria proposital
- **Coordenador** recebe um histórico do run (`buildCoordinatorHistory`), mas **capado em 4000 chars**
  (`COORDINATOR_HISTORY_CHAR_BUDGET`), do mais recente pro mais antigo. Ele usa isso **só pra rotear**
  (`{"next":"<seatId>"}`) — NÃO repassa contexto pro agente escolhido.
- **Agente de trabalho** recebe **só a saída do passo anterior**
  (`previousOutput = run.steps.at(-1).artifact.content`) — `orchestrator-runtime.ts:466`. Nada acumulado.
- Motivo da limitação (`orchestrator-runtime.ts:317-326`): o prompt vai como **argumento de linha de
  comando** pro CLI; no Windows o `cmd.exe` (shim `.cmd` do npm) tem limite de ~8191 chars. Mandar
  histórico inteiro pra cada agente estouraria em runs longos / artifacts grandes (HTML de slides).
- Efeito: o Reviewer rodou depois do Slide Author, então seu "passo anterior" era a **lista de arquivos
  HTML** (não o roteiro do Copywriter, não as imagens). E como `canExecute:false`, não pode ler os
  arquivos do disco → pergunta ao usuário.

## Etapas de correção (E/F/G/H — do mais barato ao mais estrutural)

### E. Reviewer com `canExecute:true` (imediato, via MCP — sem código)
- `update_agent` no Reviewer (`60535c24-937e-4004-a0df-89b1f073b0b0`): `canExecute:true`.
- Ajustar o prompt: revisar lendo `output/slides/*.html` e `output/images/*.jpg` diretamente
  (nº de JPGs == nº de slides, texto não cortado nas bordas de 1080×1440), **sem pedir conteúdo ao
  usuário**. Os arquivos são a fonte da verdade.
- Tira o Reviewer da dependência de contexto no prompt. Não resolve o furo geral, mas destrava o caso.

### F. Seleção de contexto pelo coordenador — `context_steps` (RECOMENDADO, genérico, resolve a raiz)
Ideia: o coordenador **não reescreve conteúdo** (lossy, erra recorte, esbarra no teto de chars dele).
Ele **seleciona por referência** quais passos anteriores o próximo agente precisa, e o **runtime monta**
o payload a partir dos artifacts salvos (fidelidade total). É **genérico para todos os squads** porque
vive no bloco que o runtime injeta em todo coordenador — **zero config por squad**.

- **Onde:** `buildCoordinatorPrompt` (`orchestrator-runtime.ts:382-389`) já injeta as "REGRAS DE RESPOSTA"
  em TODO squad, e já lista as cadeiras **com o papel de cada agente** + o **histórico numerado**. É o
  ponto único a estender — não mexe no `orchSystemPrompt` de cada squad.
- **Regra nova a injetar:** além de `next`, o coordenador retorna `context_steps` = os números dos passos
  cujo output o agente escolhido precisa, julgados pelo **papel** do agente.
  Formato: `{"next":"<seatId>","context_steps":[2,4],"reason":"curto"}`.
- **Histórico por cabeçalho:** garantir que o histórico do coordenador liste TODO passo como
  `Passo N — <AgentName> (<role>): <preview curto>` (cabeçalhos são pequenos e cabem no orçamento),
  para ele conseguir referenciar qualquer passo mesmo sem ver o conteúdo inteiro.
- **Montagem no runtime:** em `runSeat`/`buildAgentPrompt`, em vez do `previousOutput` cego, montar o
  contexto a partir dos artifacts **completos** dos `context_steps` citados. Fallback pro `previousOutput`
  quando o coordenador não citar nada.
- **Parser:** estender o parser da resposta do coordenador (`agent-turn.ts` / onde `next`/`reason` são lidos)
  para extrair `context_steps` (array de inteiros; ignorar índices inválidos).
- **Dispensa o "input contract" por agente** — o coordenador decide sozinho pelo papel que já vê. (Deixar
  um `hint` opcional por agente só se algum squad precisar afinar.)
- **Ressalvas:** (a) é julgamento do LLM — pode errar o recorte; mitigar com regra explícita + fallback.
  (b) o payload MONTADO (ex.: vários HTMLs de slide) pode estourar o limite de linha de comando — por isso
  **F anda junto com H (stdin)** para payloads grandes.

### H. Passar o prompt via stdin em vez de argumento (fix estrutural)
- Hoje o prompt vai como arg de linha de comando (limite ~8191 do `cmd.exe`). Passar via **stdin** ao
  CLI elimina o teto e permite histórico bem maior sem truncar — habilita F/G com folga.
- Mexe no `buildExecutorPlan`/spawn em `electron/runner/runner.ts` (o comentário em runner.ts nota que
  hoje o stdin é ignorado de propósito; reavaliar).

> Nota: a etapa G ("contexto acumulado por orçamento de chars") foi **absorvida pela F** — a seleção por
> `context_steps` é genérica e mais precisa. Mantida só como fallback mental caso F se mostre insuficiente.

## Arquivos afetados (E/F/H)
- E: nenhum (MCP `update_agent`), só config do squad.
- F: `orchestrator-runtime.ts` (`buildCoordinatorPrompt` = regra `context_steps` + histórico por cabeçalho;
  `runSeat`/`buildAgentPrompt` = montagem do contexto pelos passos citados), `agent-turn.ts` (parser
  extrai `context_steps`). **Genérico — não mexe no `orchSystemPrompt` de cada squad.**
- H: `electron/runner/runner.ts` (spawn com stdin).

## Verificação (E/F/H)
- Rodar o squad de carrossel de ponta a ponta e confirmar que o Reviewer **não pergunta** o conteúdo:
  faz o QC sozinho a partir dos artifacts citados pelo coordenador.
- `tsc` (app + node) + `eslint` + `npm run test` (cobrir o parser de `context_steps` e a montagem no
  `buildAgentPrompt`).

---

# Visibilidade ao vivo do run (espelhar o que o assistente já tem)

## Sintoma
Durante um run, os agentes ficam rodando e o usuário **não vê o que está acontecendo** — só aparece o
texto final quando cada passo termina. No **assistente de config** dá pra acompanhar ao vivo (pensamento,
atividade de ferramenta, terminal), e isso ajuda muito. Queremos a mesma visibilidade no run.

## Causa raiz — o run captura muito menos que o assistente
- **Assistente** passa o objeto `handlers` completo ao `callAgentStep`
  (`config-assistant-runtime.ts:99-104`): `onThinking` → `addActivity`, `onActivity` → `addActivity`,
  `onTerminal` → `appendTerminal`. Renderiza via `assistant-thread.tsx` + `components/terminal` +
  `components/thinking-block`.
- **Run** (`orchestrator-runtime.ts` `runSeat`) chama `callAgentStep` só com o 3º argumento posicional
  `onChunk` (→ `streamingText`). **Não passa `handlers`** → sem pensamento, sem atividade de ferramenta,
  sem terminal.
- **Runner** hoje só emite `chunk` (stdout cru) + `done`/`error`; a Claude CLI roda com
  `--output-format text`. Ver `runner.ts:578`: parsear `--output-format stream-json` pra capturar
  `tool_use`/`tool_result`/`thinking` está anotado como "mudança maior" ainda **não feita**. Sem isso,
  mesmo passando `handlers`, os eventos de ferramenta/pensamento não chegam.

## Etapas (I/J/K)

### I. Runner emite eventos estruturados (`stream-json`)
- Trocar a Claude CLI para `--output-format stream-json --verbose` e parsear o stream para emitir
  `writeSseEvent(res, "tool_use"|"tool_result"|"thinking"|"chunk", ...)` — `electron/runner/runner.ts`.
- Reaproveitar o parser que já existe para o caminho OpenAI-compat (linha ~957 já emite `chunk` a partir
  de deltas). Manter compat: se o parse falhar, cair no texto cru atual.
- É a "mudança maior" citada em `runner.ts:578`. Sem I, J/K só mostram o streaming de texto.

### J. Run consome os handlers + store por agente
- Em `runSeat` (`orchestrator-runtime.ts`), passar o 4º argumento `handlers` ao `callAgentStep` (como o
  assistente): `onThinking`/`onActivity`/`onTerminal`.
- Guardar atividade **por agente/seat** no `use-orchestrator-runtime-store` (espelhar
  `use-config-assistant-store`: lista de atividade + buffer de terminal), limpando ao trocar de passo.

### K. UI do run mostra a atividade ao vivo
- No `RunTranscript`/`agent-turn` (ou um painel no `run-dialog`), renderizar por agente ativo:
  qual ferramenta está rodando (label + detalhe), saída de terminal e streaming — **reusar**
  `components/terminal`, `components/thinking-block` e o padrão de `assistant-thread.tsx`.
- Ganhos rápidos independentes de I (dá pra fazer já): mostrar o `streamingText` ao vivo do agente atual,
  um indicador de "agente X trabalhando" + tempo decorrido, e o passo atual (ex.: "passo 6/40").

## Arquivos afetados (I/J/K)
- I: `electron/runner/runner.ts` (stream-json + emissão de eventos).
- J: `orchestrator-shared/runtime/orchestrator-runtime.ts` (`runSeat` passa handlers),
  `orchestrator-shared/model/use-orchestrator-runtime-store.ts` (estado de atividade por agente).
- K: `components/orchestrator/run-transcript/*`, `components/orchestrator/run-dialog/run-dialog.tsx`
  (reuso de `components/terminal`, `components/thinking-block`).

## Verificação (I/J/K)
- Rodar o squad e ver, ao vivo: o agente ativo, o streaming do texto, as chamadas de ferramenta
  (ex.: `browser_take_screenshot`) e a saída de terminal — sem esperar o passo terminar.
- `tsc` (app + node) + `eslint`. Testar o parser de `stream-json` do runner com um fixture de saída da CLI.
