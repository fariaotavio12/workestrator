# Plano — tool de renderização de imagem (Playwright) para o squad de carrossel

Objetivo: dar ao agente **Image Designer** a capacidade real de transformar o HTML de cada slide em
PNG/JPEG 1080×1440, fechando o fluxo `Copywriter → Image Designer → Publisher`. Espelha o skill
`image-creator` do opensquad (`type: mcp, server_name: playwright`), agora no modelo do Workestrator.

## Contexto (por que MCP)

Igual ao Instagram: só tools `kind: mcp/http/connector` são plugadas no `.mcp.json` do Claude CLI
(`buildMcpConfig` em `electron/runner/runner.ts`). Renderização = MCP do Playwright. **Diferença boa:
não usa segredo nenhum** — então é mais simples que o Instagram.

## Passo 1 — Registrar o Script (kind: mcp, stdio)

Payload `POST /scripts` (via REST, como no Instagram — o MCP não tem `create_script`):

```json
{
  "name": "Playwright Renderer",
  "description": "Renderiza HTML em imagem via Playwright MCP. Tools: browser_navigate, browser_resize, browser_take_screenshot.",
  "kind": "mcp",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@playwright/mcp@latest"],
  "toolAllowlist": ["browser_navigate", "browser_resize", "browser_take_screenshot"]
}
```

- **Sem `authRef`/`env`** — não há segredo.
- Depende do `scripts_kind_check` já corrigido (mesmo fix do Instagram). Confirmar `@playwright/mcp`
  como o pacote certo e os nomes exatos das tools que ele expõe (podem variar por versão — ajustar o
  `toolAllowlist`).

## Passo 2 — Pré-requisito de browser

`playwright` já é dependência do front (1.59.1), mas o binário do Chromium pode não estar instalado.
Rodar uma vez na máquina do runner:

```bash
npx playwright install chromium
```

(ou deixar o próprio Image Designer rodar isso via Bash na 1ª execução — ele tem `canExecute`.)

## Passo 3 — Anexar ao Image Designer

`attach_tool { squadId, agentId: <ImageDesigner>, scriptId: <PlaywrightRenderer> }`.

## Passo 4 — Ajustar o system prompt do Image Designer

Trocar a parte "modo teste" por instruções reais:

1. Para cada slide, escrever `output/slides/slide-XX.html` (self-contained, viewport 1080×1440, regras
   de tipografia legível já no prompt atual).
2. `browser_navigate` para `file://<abs>/output/slides/slide-XX.html` (HTML self-contained dispensa
   servidor HTTP local; se usar assets relativos, subir `python -m http.server` como no skill original).
3. `browser_resize` para 1080×1440.
4. `browser_take_screenshot` salvando em `output/images/slide-XX.png`.
5. Repetir para todos os slides; manter a mesma viewport.
6. **Converter PNG→JPEG** antes de entregar ao Publisher (Instagram exige JPEG). Opções: `browser_take_screenshot`
   com `type: "jpeg"` se a versão do MCP suportar, ou um passo Bash com `sharp`/`ffmpeg`.

## Passo 5 — Handoff para o Publisher

O Image Designer termina com os arquivos em `output/images/slide-01.jpg … slide-NN.jpg` (mesma
workspace do runner). O Publisher passa esses caminhos absolutos para `publish_carousel({ images: [...] })`.

## Passo 6 — Verificação

Rodar o squad com um briefing real e confirmar:
- Os `.jpg` aparecem em `output/images/`.
- Abrir 1–2 para checar legibilidade (fontes ≥ os mínimos do prompt).
- `publish_carousel` com `dryRun: true` aceita os caminhos e monta o container sem erro.

## Riscos / pontos a confirmar

- Nome do pacote e das tools do Playwright MCP (versão).
- Chromium instalado no PATH do runner.
- Caminho de saída consistente entre os dois agentes (mesma workspace do run).
- JPEG vs PNG na borda com o Instagram.
```
