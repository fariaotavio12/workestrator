# Capacidades do Claude via MCP `workestrator`

> Documento de referência. Me entregue este arquivo (ou só cite ele) quando quiser que eu
> opere o Workestrator por aqui — ele lista **tudo** que consigo fazer no sistema via MCP:
> o que leio, o que crio/edito, o que apago, o que **não** dá pra fazer, e os formatos exatos.
>
> Fonte da verdade: `electron/mcp-server/index.ts` +
> `src/features/security/orchestrator-shared/operations/` (catálogo e schemas Zod) +
> `orchestrator-shared/types` (modelo de domínio). Guia operacional passo a passo:
> `docs/mcp-workestrator-guia.md`.

---

## 1. O que é este acesso

O MCP `workestrator` é um servidor Node puro (stdio) que expõe a **camada de configuração** do
orquestrador como tools MCP. Ele fala direto com o **backend REST** em `WORKESTRATOR_API_URL`
(padrão `http://localhost:8080`), autenticado com o **token da sua sessão logada**. Ou seja:
tudo que eu faço aqui é **em nome do usuário logado** e persiste no backend real.

**Resumo do escopo:** monto e ajusto squads, agents, cadeiras, coordenador; anexo ferramentas;
e **leio** squads, runs, providers e scripts. **Não** executo runs, **não** crio/edito secrets e
**não** crio scripts por aqui (ver §6).

---

## 2. Pré-requisitos para eu conseguir operar

1. **Backend no ar** em `:8080` (ou onde `WORKESTRATOR_API_URL` apontar).
2. **Token de sessão válido** — o app cacheia em `~/.workestrator/mcp-session-token.json` a cada
   login. Sem login recente, precisa de `WORKESTRATOR_TOKEN=...` exportado.
3. **Servidor MCP carregado na sessão** — se aparecer como `mcp__workestrator__*` /
   `mcp__<uuid>__*`, uso direto. Se não estiver carregado, uso o cliente stdio temporário
   (Caminho B do guia).

Se qualquer um faltar, eu aviso antes de tentar — não fico chutando.

---

## 3. Tools disponíveis (16)

Legenda: **L** = leitura · **E** = escrita/criação/edição · **D** = destrutiva (exige `confirm: true`).

| # | Tool | Tipo | O que faz | Endpoint REST |
|---|------|------|-----------|---------------|
| 1 | `list_squads` | L | Lista os squads do usuário | `GET /squads` |
| 2 | `get_squad` | L | Detalha 1 squad (agents, cadeiras, coordenador, runtime) | `GET /squads/{id}` |
| 3 | `create_squad` | E | Cria um squad novo (a "casca") | `POST /squads` |
| 4 | `update_squad` | E | Atualiza campos de um squad | `PUT /squads/{id}` |
| 5 | `delete_squad` | **D** | Apaga squad **e todo o histórico de runs** | `DELETE /squads/{id}` |
| 6 | `add_agent` | E | Adiciona um agent ao squad | `POST /squads/{id}/agents` |
| 7 | `update_agent` | E | Atualiza campos de um agent | `PUT /squads/{id}/agents/{agentId}` |
| 8 | `remove_agent` | **D** | Remove agent do squad e libera a cadeira | `DELETE /squads/{id}/agents/{agentId}` |
| 9 | `add_seat` | E | Cria uma cadeira no grid do escritório | `POST /squads/{id}/seats` |
| 10 | `assign_seat` | E | Senta (ou esvazia) um agent numa cadeira | `PUT /squads/{id}/seats/{seatId}` |
| 11 | `remove_seat` | **D** | Remove uma cadeira do escritório | `DELETE /squads/{id}/seats/{seatId}` |
| 12 | `set_orchestrator` | E | Configura o coordenador (prompt, modelo, maxSteps) | `PUT /squads/{id}` |
| 13 | `attach_tool` | E | Anexa um script/tool da biblioteca a um agent | `PUT /squads/{id}/agents/{agentId}` |
| 14 | `list_runs` | L | Histórico de execuções de um squad | `GET /squads/{id}/runs` |
| 15 | `list_providers` | L | Lista providers/modelos cadastrados | `GET /providers` |
| 16 | `list_scripts` | L | Lista scripts/tools da biblioteca | `GET /scripts` |

As 3 destrutivas (`delete_squad`, `remove_agent`, `remove_seat`) **só rodam com `confirm: true`**,
e eu só mando isso **depois de você confirmar explicitamente**. Sem confirmar, elas devolvem um
aviso pedindo confirmação em vez de executar.

---

## 4. Parâmetros exatos de cada tool

### Leitura
- `list_squads` — **sem parâmetros** (passar `{}`).
- `list_providers` — **sem parâmetros** (`{}`).
- `list_scripts` — **sem parâmetros** (`{}`).
- `get_squad` — `{ squadId }`.
- `list_runs` — `{ squadId }`.

### Squads
```jsonc
// create_squad
{
  "name": "string (obrigatório)",
  "description": "string?",
  "icon": "string?",                     // emoji
  "trigger": { ... },                    // ver §5.5; default manual
  "orchSystemPrompt": "string?",
  "orchProviderId": "string | null?",
  "orchModel": "string | null?",
  "orchMaxSteps": "int > 0 ?"
}

// update_squad
{ "squadId": "...", "patch": { /* qualquer subconjunto dos campos de create */ } }

// delete_squad (DESTRUTIVA)
{ "squadId": "...", "confirm": true }
```

### Agents
```jsonc
// add_agent
{
  "squadId": "...",
  "agent": {
    "name": "string (obrigatório)",
    "role": "string?",
    "systemPrompt": "string?",
    "providerId": "string | null?",
    "model": "string | null?",
    "scriptIds": ["scriptId", ...]?,     // ferramentas anexadas
    "canExecute": "boolean?",            // ⚠ liga tools reais (Bash/Read/Write/Edit) — só agent confiável
    "requiresCheckpoint": "boolean?",    // pausa ANTES de acionar o agent
    "requiresCheckpointAfter": "boolean?", // pausa DEPOIS da saída, antes do coordenador seguir
    "character": "Male1..Male4 | Female1..Female6 ?",
    "gender": "male | female ?",
    "accentColor": "#hex ?"
  }
}

// update_agent
{ "squadId": "...", "agentId": "...", "patch": { /* subconjunto dos campos de agent */ } }

// remove_agent (DESTRUTIVA)
{ "squadId": "...", "agentId": "...", "confirm": true }
```

### Cadeiras (grid do escritório)
```jsonc
// add_seat  — col/row são inteiros >= 0 (posição no grid)
{ "squadId": "...", "col": 0, "row": 0, "agentId": "string | null?" }

// assign_seat — agentId = id do agent para sentar, ou null para esvaziar
{ "squadId": "...", "seatId": "...", "agentId": "agentId | null" }

// remove_seat (DESTRUTIVA)
{ "squadId": "...", "seatId": "...", "confirm": true }
```

### Coordenador e ferramentas
```jsonc
// set_orchestrator
{
  "squadId": "...",
  "config": {
    "systemPrompt": "string",
    "modelRef": { "providerId": "...", "model": "..." },
    "maxSteps": "int > 0"                // guardrail contra loop infinito
  }
}

// attach_tool — adiciona scriptId ao scriptIds do agent (sem duplicar)
{ "squadId": "...", "agentId": "...", "scriptId": "..." }
```

---

## 5. O que cada leitura me devolve (modelo de domínio)

### 5.1 Squad (de `get_squad`)
`id, name, description, icon, trigger, agents[], seats[], orchestrator, runtime, createdAt, updatedAt`.
(`list_squads` devolve a versão resumida, **sem** `agents/seats/orchestrator/runtime`.)

### 5.2 Agent
`id, name, role, systemPrompt, modelRef {providerId, model}, scriptIds[],
knowledgeCollectionIds[] (RAG), canExecute, requiresCheckpoint, requiresCheckpointAfter,
character, gender, accentColor, createdAt, updatedAt`.

### 5.3 Seat
`id, col, row, agentId (string | null)`.

### 5.4 Orchestrator / Runtime
- **Orchestrator**: `systemPrompt, modelRef, maxSteps`.
- **Runtime** (estado ao vivo): `status, startedAt, currentStep, perAgentStatus, log[], events[],
  pendingSeatId, pendingCheckpointKind, streamingText, pendingQuestion, pendingQaHistory`.
- `status` possíveis: `idle · running · paused · completed · checkpoint · awaiting_input · aborted`.

### 5.5 Trigger (gatilho de execução)
Uma de:
- `{ "type": "manual" }`
- `{ "type": "schedule", "every": "5m" | "1h" | "daily", "enabled": true|false }`
- `{ "type": "onComplete", "squadId": "..." }`

### 5.6 Provider (de `list_providers`)
`id, label, kind, baseUrl?, apiKeyRef?, models[{value,label}], createdAt, updatedAt`.
- `kind`: `claude-cli · codex-cli · gpt-cli · anthropic-api · openai · openai-compat`.
- Use sempre um `providerId` + `model` **reais** daqui — nunca invento id de provider/modelo.

### 5.7 Script / Tool (de `list_scripts`)
`id, name, description?, kind, ...campos por kind..., authRef?, createdAt, updatedAt`.
- `kind`: `command · inline · file · http · mcp · connector`.
  - `command`: `command`, `args[]`.
  - `inline`: `language` (bash|node|python), `content`. Só materializa em arquivo se o agent tiver `canExecute`.
  - `file`: `path` (arquivo/dir no disco do runner; só providers locais resolvem).
  - `http`: `method`, `urlTemplate`, `headers`, `bodySchema`, `responseMap`.
  - `mcp`: `transport` (stdio usa `command`/`args`; http usa `url`), `env`, `toolAllowlist[]`.
  - `connector`: `connectorProvider` (composio|zapier|n8n|youtube), `config`.
  - `authRef` referencia um `Secret` (nunca o valor cru).

### 5.8 RunRecord (de `list_runs`)
`id, squadId, input, startedAt, endedAt, status (running|done|failed|aborted), steps[], qaLog[]`.

### 5.9 Secret (contexto — **não** exposto via MCP)
`id, label, authType, metadata?, connectorId?, hasValue, createdAt, updatedAt`.
O **valor** é cifrado no backend (AES-256-GCM) e **nunca** é devolvido — só o runner o resolve em
runtime. `authType`: `bearer · header · query · basic · oauth2_client_credentials · oauth2_refresh · raw`.

---

## 6. O que eu **NÃO** consigo fazer por aqui (limites)

- **Executar squad (`run_squad`)** — não existe no MCP. O engine de execução roda no **renderer**
  do app (não headless), não no backend. Para rodar um squad: pela **UI/assistente do app**, ou por
  gatilho `schedule`/`onComplete`. Eu monto e configuro; **você dispara** a execução.
- **Secrets (criar/editar/apagar)** — sem tools de secret no MCP. Só consigo **referenciar** um
  secret existente (via `authRef`/`apiKeyRef` de scripts/providers). CRUD de secret é pela UI
  (`/secrets`, feature `secrets`) ou pelos endpoints `POST/PUT/DELETE /secrets`.
- **Criar/editar/apagar scripts** — só `list_scripts` (leitura). Criação de tool é pela UI
  (feature `scripts`, `POST /scripts`).
- **Criar/editar/apagar providers** — só `list_providers` (leitura).
- **Bases de conhecimento (RAG)** — não há tool aqui; só vejo `knowledgeCollectionIds` no agent.
- **Ler o valor de um secret** — impossível por design.

Se você me pedir algo dessa lista, eu digo que é fora do MCP e aponto o caminho (UI/endpoint).

---

## 7. Como eu costumo trabalhar (fluxos)

**Montar um squad do zero ("cria um squad que faz X"):**
1. `list_providers` → escolho `providerId`/`model` reais.
2. `create_squad { name, description?, icon? }` → cria a casca.
3. `set_orchestrator` → prompt + modelo + maxSteps do coordenador.
4. `add_agent` (1..N) → cada especialista.
5. `add_seat` (1 por agent) + `assign_seat` → sento cada agent numa cadeira.
6. (Opcional) `list_scripts` + `attach_tool` → anexo ferramentas aos agents.
> `create_squad` sozinho cria só a casca — sem os passos 3–5 o squad não roda.

**Ajustar um squad existente:**
1. `list_squads` / `get_squad` → descubro os **ids reais** (nunca chuto).
2. `update_squad` / `update_agent` / `assign_seat` / `set_orchestrator` conforme o pedido.

**Auditar:** `get_squad` + `list_runs` para ver config atual e histórico de execuções.

---

## 8. Regras que eu sigo sempre

- **Descubro ids antes de agir** (`list_*`/`get_squad`) — nunca invento id de squad/agent/seat/
  provider/model/script.
- **Confirmo antes de qualquer destrutiva** e só então mando `confirm: true`.
- **Tools sem parâmetro** (`list_squads`, `list_providers`, `list_scripts`) recebem `{}` — nunca
  `undefined` (com `undefined` a leitura do resultado falha e parece "0 resultados").
- `character` válido: `Male1..Male4`, `Female1..Female6`; `gender`: `male`/`female`;
  `accentColor`: hex.
- Ao criar coisas de teste, aviso e ofereço remover depois.
- Se um pré-requisito faltar (backend/token/servidor), aviso antes de tentar.

---

## 9. Referências no repositório

- Servidor MCP: `electron/mcp-server/index.ts`
- Catálogo de operações + descrições: `src/features/security/orchestrator-shared/operations/catalog.ts`
- Schemas Zod dos parâmetros: `src/features/security/orchestrator-shared/operations/schemas.ts`
- Modelo de domínio (tipos): `src/features/security/orchestrator-shared/types/index.ts`
- Guia operacional (conectar + fallback stdio): `docs/mcp-workestrator-guia.md`
- Design de integrações/tools/secrets: `docs/plano-integracoes-e-flow-builder.md`
