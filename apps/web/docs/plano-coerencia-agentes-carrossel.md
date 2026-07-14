# Plano — coerência dos agentes do squad "Carrossel Instagram (News)"

Estado alvo: o squad produz o carrossel **pronto** (imagens renderizadas + legenda) de ponta a ponta.
A publicação no Instagram fica **desligada** até os secrets existirem — o Publisher está inativo e o
coordenador não o aciona.

`squadId = 41cd95ba-d86a-463a-a282-ee954b75eeca`

## Estado atual (o que já está feito)

| Agente | Ferramenta real | canExecute | Status | Coerência |
|---|---|---|---|---|
| 🔵 Researcher | — (pesquisa via prompt) | true | ativo | ok |
| 🟠 Copywriter | — | true | ativo | ok |
| 🔵 Image Designer | **Playwright** (`browser_navigate/resize/take_screenshot`) | true | ativo | **renderiza de verdade** |
| 🟢 Reviewer | — | true | ativo | ok |
| 🟣 Publisher | Instagram (`publish_carousel`) | **false** | **INATIVO** | não acionado; config preservada |
| 🧭 Orquestrador | — | — | ativo | pipeline termina na ENTREGA (passo 9), não delega ao Publisher |

Secrets cadastrados: **`IMGBB_API_KEY`** (só usado na publicação — ocioso por enquanto).
Faltam: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`.

## Pontos de incoerência a resolver (próximas atualizações dos agentes)

1. **Image Designer — formato de saída.** O prompt pede PNG e depois JPEG. Como a entrega final agora é
   "imagens prontas", padronizar em **JPEG** direto (Instagram exige JPEG) evita passo extra. Ação:
   ajustar o prompt para gerar `output/images/slide-XX.jpg` já no screenshot (type jpeg) OU um passo
   Bash de conversão único no fim. Confirmar suporte a `type:"jpeg"` na versão do `@playwright/mcp`.

2. **Chromium.** 1ª execução pode falhar sem browser. Ação: rodar `npx playwright install chromium`
   uma vez na máquina do runner (ou deixar o Image Designer rodar no boot). Documentar no prompt (já está).

3. **Caminho de saída compartilhado.** Image Designer escreve e (futuro) Publisher lê os mesmos arquivos.
   Garantir que ambos usem a **mesma workspace do run** (`output/images/`). Hoje coerente; revalidar quando
   reativar o Publisher.

4. **Role/descrição do Image Designer** ainda diz "HTML→PNG". Ação cosmética: atualizar para
   "Diagramação + render (HTML→JPEG)".

5. **Reviewer** pode incluir no checklist a verificação de que os arquivos `output/images/*.jpg`
   existem e batem com o número de slides — fecha o loop de qualidade da entrega real.

## Reativar o Publisher (quando tiver os 2 secrets do Instagram)

1. Criar os secrets `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_USER_ID` (tipo "Placeholder manual").
2. Pegar os 3 IDs (incl. o `IMGBB_API_KEY` já criado) e ligar no env do Script "Instagram Publisher"
   via `PUT /scripts/{id}`:
   ```json
   { "env": { "INSTAGRAM_ACCESS_TOKEN": "$<id>", "INSTAGRAM_USER_ID": "$<id>", "IMGBB_API_KEY": "$<id>" } }
   ```
3. `update_agent` no Publisher: `canExecute: true` + remover o marcador "INATIVO" do systemPrompt
   (a config de publicação está preservada logo abaixo do marcador).
4. `set_orchestrator`: reintroduzir o passo 10 (Publisher) e o 2º checkpoint (aprovar publicação).
5. Testar com `publish_carousel { dryRun: true }` antes de publicar de verdade.

## Verificação do estado atual (fazer agora)

Rodar o squad com um briefing real e confirmar:
- Para no CHECKPOINT do ângulo (passo 3).
- Image Designer gera `output/images/slide-XX.jpg` de verdade (Playwright).
- Entrega final = imagens + legenda, **sem** acionar o Publisher.
```
