# Plano — visibilidade ao vivo do run (UX/UI completa)

Reforma da experiência de **acompanhar um run acontecendo**: hoje é cru (card de atividade solto, buraco
de percepção, ferramenta ilegível, sem noção de progresso). Alvo: um painel que mostra o fluxo inteiro
rodando, **genérico pra qualquer squad e qualquer tipo de arquivo/tarefa**, bonito e legível.

Referência visual: os dois mockups aprovados nesta sessão (card de agente com timeline de ações;
AppSheet alargado com **mapa de atividades à esquerda** + stream detalhado à direita).

## Princípios (a premissa)
1. **Genérico por design** — nada de rótulo específico de carrossel. O mapa é montado dos agentes reais
   do squad; os rótulos de ação vêm do **tipo de tool** (escreveu/leu arquivo, rodou comando, chamou
   ferramenta MCP). Serve pra código, planilha, imagem, o que for.
2. **Identidade visual real** — no mapa e nos cards, usar o **avatar pixel-art de cada agente**
   (`AgentAvatar` via `character` + `accentColor`) e o **nome/papel** reais. Poses por estado:
   `talk` (trabalhando), `blink` (ocioso/próximo), `wave` (concluído).
3. **Feedback imediato** — nunca tela em branco: assim que um passo começa, mostrar "iniciando…"; o
   intervalo do coordenador vira "decidindo…"; boot de ferramenta vira "preparando ferramenta…".
4. **Foco que se move** — o destaque acompanha o fluxo: coordenador pensa → destaca o Coordenador;
   repassa → destaca o agente; agente termina → volta pro Coordenador.
5. **Design nativo** — tokens semânticos (`var(--primary)`, `bg-muted`…), `Typography`, sentence case
   PT-BR, acessível. Reuso de `AgentAvatar`, `ThinkingBlock`, `Terminal`, `Markdown`, `DiffViewer`.

---

## Fase 1 — Dados / premissa (runner + store + types)

### 1.1 Status por ferramenta (parear tool_use ↔ tool_result)
- `electron/runner/runner.ts` (parser stream-json, já existe da etapa I): emitir `tool_use` com **id**
  (`toolu_…`) e `tool_result`/`task_notification` referenciando o mesmo id (`tool_use_id`). Assim a UI
  pareia início e fim e mostra status **rodando → concluído/erro** por ferramenta.
- Eventos SSE: `tool_use { id, name, input }`, `tool_result { id, ok, detail }`. Manter compat com o
  modo texto (codex/gpt) — sem stream-json, nada disso é emitido (fallback atual).

### 1.2 Item de atividade estruturado (store)
- `use-orchestrator-runtime-store.ts` + `types/index.ts`: `LiveActivityItem` vira
  `{ id, kind: "thinking" | "tool" | "output", toolName?, label, detail?, status: "running" | "done" | "error" }`.
- `orchestrator-runtime.ts`: os handlers (`onActivity`) atualizam o item existente pelo `id` (running→done)
  em vez de só empilhar. Mantém `liveTerminal` acumulado.

### 1.3 Sinal "coordenador decidindo"
- `types` + store: `Runtime.coordinatorThinking: boolean` (ou um `activePhase: "coordinator" | "agent" | null`).
- `advanceOrchestrated` (orchestrator-runtime): liga antes de chamar o coordenador, desliga ao acionar o
  agente. É o que preenche o buraco de percepção entre passos e move o foco no mapa.

### 1.4 Metadados do passo (progresso + tempo)
- Já temos `currentStep` e `startedAt`. Adicionar `stepStartedAt` (início do passo atual) pro cronômetro
  por agente. Progresso "passo N/maxSteps" lê `currentStep` + `orchestrator.maxSteps`.

### 1.5 Rótulo genérico por tool (client, `run-transcript`/util)
Mapa `toolName → (input) => label` (PT-BR, sentence case), independente de domínio:

| Tool | Rótulo |
|---|---|
| `Write` / `Edit` | Escreveu `<path>` |
| `Read` | Leu `<path>` |
| `Bash` | Rodou: `<command>` (truncado) |
| `Glob` / `Grep` | Buscou `<pattern>` |
| `mcp__*` (qualquer MCP) | `<nome amigável da tool>` + resumo curto do input |
| desconhecida | nome da tool + input compacto |

Ícone por família: arquivo (`FileText`), terminal (`Terminal`/`SquareTerminal`), busca (`Search`),
navegador/captura (`Globe`/`Camera`), MCP (`Plug`), fallback (`Wrench`).

---

## Fase 2 — Mapa de atividades (coluna esquerda)

Novo componente `src/components/orchestrator/run-activity-map/run-activity-map.tsx`.

- **Entrada**: `squad` + `runtime`. Monta a lista de nós a partir de `squad.seats` (agentes sentados) +
  um nó do **Coordenador**.
- **Cada nó**: `AgentAvatar` (character + accentColor) pequeno (~28–32px) + nome + papel curto + **status**:
  - ✓ concluído — passos já no histórico (`perAgentStatus[seat] === "done"`), pose `wave`, apagado.
  - ● trabalhando — `perAgentStatus[seat] === "working"`, destaque com `accentColor`, pose `talk`,
    micro-status ("escrevendo…", "rodando ferramenta…").
  - ○ próximo/ocioso — pose `blink`, apagado.
- **Coordenador**: nó com ícone `Compass`; destacado quando `coordinatorThinking` ("decidindo…").
- **Conectores** verticais entre nós (linha) mostrando a ordem; o trecho já percorrido em `accentColor`.
- **Cabeçalho** do painel: "Mapa do run · passo N/maxSteps".
- Ao clicar num nó concluído → rola o stream até aquele passo (nice-to-have).

## Fase 3 — AppSheet alargado + layout de 2 colunas

- `run-dialog.tsx`: `contentClassName` condicional — `status === "idle"` → `sm:max-w-2xl` (form de
  briefing); rodando/terminado → **`sm:max-w-[70rem]`** (ou `lg:max-w-[72rem]`).
- Corpo quando não-idle: `grid grid-cols-[210px_1fr] gap-4` → `<RunActivityMap />` + a coluna do stream
  (RunStatusBar + botão "ver arquivos" + `RunTranscript` no `ScrollArea` + `RunInteractionPanel`).
- **Responsivo**: abaixo de ~900px o mapa colapsa pro topo como uma faixa horizontal scrollável (ou some
  atrás de um toggle) — o `AppSheet` é `w-3/4`/`max-w` limitado; garantir que não quebre no mobile.

## Fase 4 — Stream / timeline (coluna direita)

- `run-transcript.tsx` + `agent-turn.tsx`: a atividade ao vivo passa a viver **dentro do card do agente
  ativo** (não mais um card tracejado solto). Estrutura do card:
  - header: avatar + nome + papel + **pill de status** (Pensando / Escrevendo / Rodando ferramenta /
    Concluído) + tempo decorrido.
  - **timeline de ações**: `thinking` (recolhível, `ThinkingBlock`), cada `tool` como linha com ícone +
    rótulo genérico + status (spinner→✓/✗); expandir mostra input/args e `Terminal`.
  - texto da resposta em streaming no rodapé, com cursor pulsante.
- **Chip do coordenador** entre os cards: `Compass` + "acionou X" + raciocínio recolhível; estado
  "decidindo…" com shimmer quando `coordinatorThinking`.
- Passos concluídos **colapsam** (avatar + ✓ + resumo), expansíveis.
- Estado inicial de passo: "iniciando…"/"preparando ferramenta…" (mata o delay), espelhando o
  "Preparando a primeira resposta…" do `AssistantThread`.

## Fase 5 — Polimento
- Cronômetro ao vivo por passo e total (reusar o padrão do `RunStatusBar`).
- Ícones/labels revisados; truncamento seguro de paths/comandos longos; copy PT-BR sentence case.
- Dark mode conferido (tokens); acessibilidade (aria em ícones, foco, `sr-only` de resumo).
- Auto-scroll do stream sem "pular" quando o usuário rolou pra cima (respeitar scroll manual).

---

## Arquivos afetados
- `electron/runner/runner.ts` — tool_use/tool_result com id + status (Fase 1.1).
- `src/features/security/orchestrator-shared/types/index.ts` — `LiveActivityItem` estruturado,
  `coordinatorThinking`, `stepStartedAt`.
- `src/features/security/orchestrator-shared/model/use-orchestrator-runtime-store.ts` — init dos campos.
- `src/features/security/orchestrator-shared/runtime/orchestrator-runtime.ts` — flag do coordenador,
  update de item por id, `stepStartedAt`.
- `src/features/security/orchestrator-shared/runtime/model-client.ts` — tipos dos eventos (id/status).
- `src/components/orchestrator/run-activity-map/run-activity-map.tsx` — **novo** (mapa).
- `src/components/orchestrator/run-dialog/run-dialog.tsx` — largura condicional + grid 2 colunas.
- `src/components/orchestrator/run-transcript/run-transcript.tsx` + `agent-turn.tsx` — timeline no card,
  chip do coordenador, estados de início.
- (opcional) util de rótulo genérico de tool em `run-transcript/` ou `lib`.

## Verificação
- `npx tsc --noEmit -p tsconfig.app.json` + `-p tsconfig.node.json`, `eslint`, `npm run test`.
- Rebuild do main (`npm run electron:build-main`) + reabrir o app.
- Rodar um squad e conferir: mapa reflete o fluxo (coordenador→agente→coordenador), avatares/nomes
  reais, ferramentas com status ao vivo, rótulos genéricos corretos (testar com um agente que **escreve
  arquivo qualquer** e outro que **roda comando/tool MCP**), sem tela em branco entre passos.
- Responsivo (janela estreita) e dark mode.

## Ordem sugerida de execução
1. Fase 1 (dados) — destrava tudo (status de tool, flag do coordenador, item estruturado).
2. Fase 2 (mapa) — componente isolado, testável sozinho.
3. Fase 3 (layout 2 colunas + largura).
4. Fase 4 (timeline no card + chip coordenador + anti-delay).
5. Fase 5 (polimento).
