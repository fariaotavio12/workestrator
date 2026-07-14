# Guia — usar o MCP `workestrator` (criar/ajustar squads via MCP)

Playbook para quando o usuário pedir "conecta no MCP e cria/ajusta algo". O MCP `workestrator`
(`electron/mcp-server/index.ts`) expõe a camada de operações de config do orquestrador como tools MCP
por stdio, falando com o backend REST em `WORKESTRATOR_API_URL` (padrão `http://localhost:8080`).

## Pré-requisitos (checar antes)
1. **Backend no ar** em `:8080` — `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/squads`
   (401/200 = vivo; sem resposta = subir o backend).
2. **Token de sessão** — o app cacheia em `~/.workestrator/mcp-session-token.json` a cada login
   (campos `token`, `expiresAt`). Sem login recente, exportar `WORKESTRATOR_TOKEN=...`.
   Validar sem expor o token: `node -e '...'` lendo o arquivo e fazendo `GET /squads` com `Bearer`.
3. **`.mcp.json`** na raiz já configura o server (`npx tsx electron/mcp-server/index.ts`).

## Caminho A (preferido) — tools MCP já disponíveis na sessão
Se o servidor `workestrator` estiver aprovado/carregado na sessão do Claude Code, as tools aparecem como
`mcp__workestrator__<tool>` (ou `mcp__<uuid>__<tool>`). Carregar via ToolSearch (`select:...`) e chamar direto.
Se `ToolSearch` por `create_squad`/`list_squads` não retornar nada, o server **não está carregado** → usar o Caminho B.

## Caminho B (fallback) — cliente stdio temporário
Conecta no server pelo SDK e chama as tools. Criar em `scripts/_mcp-smoke.mjs`, rodar, **apagar depois**
(nunca commitar). Template:

```js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const transport = new StdioClientTransport({
  command: process.platform === "win32" ? "npx.cmd" : "npx",
  args: ["tsx", "electron/mcp-server/index.ts"],
  env: { ...process.env }, stderr: "pipe",
});
const client = new Client({ name: "cli", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);
console.log((await client.listTools()).tools.map(t => t.name));
const res = await client.callTool({ name: "create_squad", arguments: { name: "X", description: "...", icon: "🧪" } });
console.log(res.content[0].text);
await client.close(); process.exit(0);
```
Rodar da raiz do repo (`node scripts/_mcp-smoke.mjs`) pra resolver `node_modules`. Apagar o arquivo ao fim.

## Tools disponíveis (16)
`list_squads`, `get_squad`, `create_squad`, `update_squad`, `delete_squad*`, `add_agent`, `update_agent`,
`remove_agent*`, `add_seat`, `assign_seat`, `remove_seat*`, `set_orchestrator`, `attach_tool`, `list_runs`,
`list_providers`, `list_scripts`.

- `*` = **destrutivas**: exigem `confirm: true` no argumento, e SÓ depois do usuário confirmar explicitamente.
- **`run_squad` NÃO existe no MCP** — iniciar execução é do runtime do renderer (não headless). Pra rodar
  squad, é pela UI/assistente, não pelo MCP.

## Fluxo recomendado para "cria um squad ..."
1. `list_providers` — pra usar um `providerId`/`model` real no coordenador/agents (nunca inventar id).
2. `create_squad { name, description?, icon?, orchSystemPrompt?, orchProviderId?, orchModel?, orchMaxSteps? }`.
3. `add_agent { squadId, agent: { name, role?, systemPrompt?, providerId?, model?, ... } }`.
4. `add_seat { squadId, col, row }` + `assign_seat { squadId, seatId, agentId }` pra sentar o agent.
5. `set_orchestrator { squadId, config: { systemPrompt, modelRef, maxSteps } }` se precisar ajustar o coordenador.

## Gotchas
- **Tools sem argumento** (`list_providers`, `list_squads`, `list_scripts`): passar `arguments: {}` no `callTool`,
  **nunca `undefined`** — com `undefined` a leitura do resultado falha (parece "0 resultados").
- `character` válido: `Male1..Male4`, `Female1..Female6`; `gender`: `male`/`female`; `accentColor`: hex.
- Fluxo completo de um squad pronto (testado via MCP): `set_orchestrator` → `add_agent` (x2) →
  `add_seat` (x2) → `assign_seat` (sentar cada agent). `create_squad` sozinho cria só a "casca".

## Boas práticas
- Descobrir ids com `list_*`/`get_squad` antes de agir — nunca chutar id.
- Confirmar com o usuário antes de qualquer tool destrutiva (`delete_*`/`remove_*`) e só então mandar `confirm: true`.
- Ao criar coisas de teste, avisar o usuário e oferecer remover depois.
- Apagar qualquer harness temporário (`scripts/_mcp-*.mjs`) ao terminar.
