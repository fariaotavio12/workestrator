# Plano — Squad "Code Review de PR" via MCP

Objetivo: squad completo que revisa Pull Requests do GitHub — coleta diff/metadata via `gh` CLI
exposto como tool MCP, analisa segurança/qualidade/testes em paralelo por agentes especializados,
consolida os achados num review único e posta no PR, com um coordenador orquestrando tudo e um
checkpoint humano antes de publicar.

## Estado atual (base para o plano)

- `Squad = agents[] + seats[] + orchestrator (coordenador) + trigger`
  ([types/index.ts](../src/features/security/orchestrator-shared/types/index.ts)). Todo squad roda
  no modo orquestrado: o coordenador decide a cada passo `{ next: seatId | "done", reason?,
  context_steps? }`, parseado em
  [orchestrator-decision.ts](../src/features/security/orchestrator-shared/runtime/orchestrator-decision.ts) —
  não existe mais pipeline fixo.
- Tool `kind: "mcp"` ([runner.ts](../electron/runner/runner.ts), `buildMcpServerEntry`/`buildMcpConfig`)
  só vira entrada em `.mcp.json`/`--mcp-config` quando o agent tem **`canExecute: true` e provider
  `claude-cli`** — não basta anexar via `scriptIds`.
- `canExecute: true` também libera Bash/Read/Write/Edit reais na pasta escopada do runner
  (`bypassPermissions`, sem prompt de aprovação ao vivo) — não é uma flag "só MCP". Escopo limita só
  onde o comando *começa*, não é sandbox de verdade.
- Auth de secret em script MCP: `authRef` resolve automaticamente pra `transport: "http"` (vira header
  `Authorization`); pra `transport: "stdio"`, existe o placeholder `$secretId` dentro de qualquer valor
  de `env`. Não é necessário aqui — ver decisão abaixo.
- `Agent.requiresCheckpoint` pausa o run **antes** de acionar o agent, esperando aprovação — é o
  padrão do "Publicador" no squad-conteudo
  ([seeds.ts](../src/features/security/orchestrator-shared/data/seeds.ts)). Publicar review em PR é
  ação externa/visível a terceiros — mesmo padrão se aplica aqui.
- MCP `workestrator` (meta,
  [docs/mcp-workestrator-capacidades.md](mcp-workestrator-capacidades.md)) monta squad/agents/seats/
  coordenador via tools (`create_squad`, `add_agent`, `add_seat`, `assign_seat`, `set_orchestrator`,
  `attach_tool`), mas **não cria Script** — `list_scripts` é só leitura ali; criação de tool é só pela
  UI (`/scripts`) ou `POST /scripts` direto.

## Decisão: GitHub via `gh` CLI (não um pacote MCP de terceiros)

Script `kind: "mcp"`, `transport: "stdio"`, `command: "gh"`, `args: ["mcp-server"]`. Sem `authRef`/
secret novo: o `gh` CLI usa a sessão já autenticada na máquina do runner (`gh auth login`) — nenhum
PAT trafega pelo Workestrator.

> ⚠️ Não foi possível confirmar via busca web (indisponível na sessão em que este plano foi escrito)
> se `gh mcp-server` é exatamente o subcomando certo na versão de `gh` instalada. **Etapa 0 do plano
> de implementação cobre essa verificação** antes de criar o Script, com fallback documentado.

## Squad "Code Review de PR"

**Revisão (pós-implementação, mesma sessão):** o desenho original tinha 3 revisores separados
(Segurança, Qualidade, Testes/CI). Simplificado pra 5 agents — 2 revisores em vez de 3, um deles
comparando o diff com as convenções documentadas do próprio projeto (`.claude/skills`/`.agents`) em
vez de regras genéricas, já que é mais prático e mais alinhado ao repo revisado:

| Seat | Agent | Papel | `canExecute` | Checkpoint |
|---|---|---|---|---|
| 1 | **Coletor de PR** | Busca metadata, diff, arquivos alterados, comentários, status de CI, e dá `gh pr checkout` (arquivos reais em disco, não só diff) | ✅ | — |
| 2 | **Revisor de Padrões** | Compara o diff com `.claude/skills/**/SKILL.md` / `.agents/**` do repo (ou um link/caminho passado no briefing) — flags divergência de convenção, não regra genérica | ✅ (precisa ler arquivos do checkout) | — |
| 3 | **Revisor de Segurança e Qualidade** | Injection/secrets/auth/OWASP top 10 **+** arquitetura/duplicação/complexidade, no mesmo parecer | ❌ | — |
| 4 | **Consolidador** | Junta os 2 pareceres + status de CI já coletado num review único, rankeado por severidade, com veredito (approve/request-changes/comment) | ❌ | — |
| 5 | **Publicador** | Posta o review consolidado no PR | ✅ | ✅ **antes** de agir |
| 6 | **Corretor** | Aplica as correções dos achados nos arquivos (já em checkout) e `git commit` local — **não** dá push | ✅ | — |
| 7 | **Publicador de Correção** | `git push` pro branch do PR; se faltar permissão (PR de fork sem "allow edits from maintainers"), cai no fallback de postar a correção como comentário/sugestão via `gh pr comment` | ✅ | ✅ **antes** de agir |

Coordenador direciona: Coletor → (Padrões, Segurança e Qualidade, ordem livre) → Consolidador →
Publicador → Corretor → Publicador de Correção → `done`. `maxSteps: 12`. `trigger: manual` —
briefing tipo "revise o PR #42 de acme/api" (opcionalmente com link/caminho de skills a usar).

Dois checkpoints humanos no fluxo: antes de postar o review (Publicador) e antes de publicar a
correção (Publicador de Correção) — nenhum dos dois é removível, são a única rede de segurança contra
um review ruim ou uma correção automática que introduz bug novo.

Squad criado e ajustado via MCP `workestrator` (Caminho B, script temporário
`scripts/_mcp-smoke.mjs`, apagado ao final) — id `a78a797b-5fe7-4899-a224-e840928fd042`.

## Áreas afetadas

- `/scripts` (UI) ou `POST /scripts` — 1 Script novo `kind: mcp` ("GitHub CLI (MCP)").
- `orchestrator-shared/data/seeds.ts` — opcional, só se quiser o squad como seed de demo; senão monta-se
  direto via UI ou MCP `workestrator`.
- Nenhuma mudança necessária em `runner.ts` / `orchestrator-runtime.ts` / `orchestrator-decision.ts` —
  a arquitetura atual já suporta esse desenho.

## Riscos e tradeoffs

- **Dependência do `gh` CLI instalado e autenticado** na máquina do runner — se não estiver, o
  Coletor/Publicador falham ao chamar a tool. Verificar `gh auth status` antes.
- **`canExecute` dá Bash real**, não só MCP — mitigado por ser só 2 dos 6 agents.
- **Se `gh mcp-server` não existir** na versão instalada: fallback é usar `kind: "command"` chamando
  `gh pr view --json ...` / `gh pr diff` / `gh pr review` direto (o agent já tem Bash via
  `canExecute`) — funciona igual, só não passa pelo protocolo MCP formal.
- **Trigger agendado pra novos PRs** (v2) precisaria de um passo de "descoberta" com idempotência —
  fora do escopo v1.

## Plano de implementação

1. **Verificar** na máquina do runner: `gh --version`, `gh auth status`, e se existe `gh mcp-server`
   (`gh mcp-server --help` ou `gh extension list`). Define se uso o Script `kind: mcp` ou o fallback
   `kind: command`.
2. Criar o Script "GitHub CLI (MCP)" (ou os 2-3 Scripts `command` do fallback) via `/scripts`.
3. Criar o squad "Code Review de PR": casca + coordenador (`set_orchestrator`) via MCP `workestrator`
   ou UI.
4. Criar os 6 agents (`add_agent`), anexando o Script só ao Coletor e ao Publicador (`attach_tool`),
   com `canExecute: true` nesses dois e `requiresCheckpoint: true` no Publicador.
5. Criar as 6 seats e sentar cada agent (`add_seat` + `assign_seat`).
6. Rodar um PR de teste pequeno, validar o checkpoint e o review postado.

## Critérios de aceite

1. Run com briefing "revise o PR #N de owner/repo" produz diff coletado, 3 pareceres, review
   consolidado, e pausa em checkpoint antes de postar.
2. Aprovar o checkpoint publica de fato o review no PR.
3. Só Coletor e Publicador têm `canExecute: true`.
4. Secret/token do GitHub nunca aparece em texto puro em artifact/log do run (não se aplica aqui já
   que não há secret novo — vale se a decisão do transporte mudar no futuro).
