# 001 · Anexo — Workflow do n8n (pronto para importar)

Workflow completo que recebe o aviso do Workestrator e entrega no Teams para uma pessoa específica.
**Depois de importar, só três coisas precisam ser corrigidas** — as duas credenciais e o id do chat. Estão
todas marcadas com `SUBSTITUIR` no JSON.

Contrato de entrada: [`design.md` § Contrato do payload](design.md#contrato-do-payload-para-o-n8n).

## O que precisa ser corrigido

| # | O quê | Onde | Como obter |
|---|---|---|---|
| 1 | **Credencial Header Auth** — valida que o `POST` veio do Workestrator | nó `Aviso do Workestrator` | criar em n8n → Credentials → *Header Auth*: `Name` = nome do header (ex.: `X-Workestrator-Token`), `Value` = um segredo aleatório. O **mesmo** par vai em `authHeaderName` + segredo da conexão de notificação no Workestrator |
| 2 | **Credencial Microsoft Teams OAuth2** | nó `Enviar no Teams` | criar em n8n → Credentials → *Microsoft Teams OAuth2 API* e autorizar com a conta que vai enviar as mensagens |
| 3 | **`SUBSTITUIR_CHAT_ID`** — o chat 1:1 do destinatário | URL do nó `Enviar no Teams` | ver [Como descobrir o chatId](#como-descobrir-o-chatid) |

Nada mais no workflow precisa ser editado para funcionar.

## Por que HTTP Request em vez do nó nativo do Teams

O nó `Microsoft Teams` do n8n tem a operação *Chat Message → Create*, e funciona. Aqui uso `HTTP Request`
chamando o Microsoft Graph direto por dois motivos:

- os nomes de parâmetro do nó nativo variam entre versões do n8n, e um JSON de importação com parâmetro
  errado chega quebrado — enquanto `HTTP Request` + Graph é estável;
- a credencial continua sendo a **mesma** do nó nativo (`predefinedCredentialType` →
  `microsoftTeamsOAuth2Api`), então não há setup extra de autenticação.

Se preferir o nó nativo, troque o terceiro nó e mantenha os dois primeiros — o resto do workflow não muda.

> ⚠️ **A confirmar no primeiro teste:** a credencial Teams OAuth2 do n8n precisa ter escopo que permita
> enviar mensagem de chat (`ChatMessage.Send`). Se o Graph responder **403**, o caminho é usar uma credencial
> *Microsoft Entra Service Principal* ou uma OAuth2 genérica onde você controla os escopos. Isso não muda a
> estrutura do workflow, só a credencial do nó de envio.

## O JSON

```json
{
  "name": "Workestrator — aviso de checkpoint",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "workestrator-checkpoint",
        "authentication": "headerAuth",
        "responseMode": "onReceived",
        "options": {}
      },
      "id": "a1b2c3d4-0001-4000-8000-000000000001",
      "name": "Aviso do Workestrator",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [-220, 0],
      "webhookId": "a1b2c3d4-0001-4000-8000-000000000001",
      "credentials": {
        "httpHeaderAuth": {
          "id": "SUBSTITUIR",
          "name": "Workestrator — segredo do webhook"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "const p = $input.first().json.body;\nconst momento = p.checkpointKind === 'before' ? 'antes de agir' : 'já agiu, aguardando validação';\nconst partes = [\n  `<b>${p.title}</b>`,\n  p.summary || null,\n  `<i>${momento}</i>`,\n  `<a href=\"${p.decisionUrl}\">Abrir no Workestrator</a>`\n].filter(Boolean);\nreturn [{ json: { html: partes.join('<br>'), approvalId: p.approvalId ?? null } }];"
      },
      "id": "a1b2c3d4-0002-4000-8000-000000000002",
      "name": "Montar mensagem",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [0, 0]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://graph.microsoft.com/v1.0/chats/SUBSTITUIR_CHAT_ID/messages",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "microsoftTeamsOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ body: { contentType: 'html', content: $json.html } }) }}",
        "options": {}
      },
      "id": "a1b2c3d4-0003-4000-8000-000000000003",
      "name": "Enviar no Teams",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [220, 0],
      "credentials": {
        "microsoftTeamsOAuth2Api": {
          "id": "SUBSTITUIR",
          "name": "Microsoft Teams — conta remetente"
        }
      }
    }
  ],
  "connections": {
    "Aviso do Workestrator": {
      "main": [[{ "node": "Montar mensagem", "type": "main", "index": 0 }]]
    },
    "Montar mensagem": {
      "main": [[{ "node": "Enviar no Teams", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  },
  "pinData": {}
}
```

## Passo a passo

1. n8n → **Workflows → Import from clipboard** → colar o JSON acima.
2. Criar a credencial **Header Auth** (item 1 da tabela) e selecioná-la no nó `Aviso do Workestrator`.
3. Criar a credencial **Microsoft Teams OAuth2 API** (item 2) e selecioná-la no nó `Enviar no Teams`.
4. Descobrir o `chatId` e substituir na URL do nó `Enviar no Teams` (item 3).
5. **Ativar** o workflow e copiar a *Production URL* do nó de webhook.
6. No Workestrator: cadastrar a conexão de notificação com essa URL, o nome do header e o segredo — os
   mesmos da credencial Header Auth.
7. Clicar em **Testar** na conexão do Workestrator. Deve chegar uma mensagem de exemplo no Teams.

## Como descobrir o chatId

O jeito mais confiável usa a **mesma credencial** que o workflow vai usar — então já serve de teste dela.
Num workflow temporário, um nó `HTTP Request` com autenticação `predefinedCredentialType` →
`microsoftTeamsOAuth2Api`:

```txt
GET https://graph.microsoft.com/v1.0/me/chats?$expand=members&$top=50
```

Procure o chat `oneOnOne` cujo `members` contém o e-mail do destinatário e copie o `id` (formato
`19:...@unq.gbl.spaces`). Alternativa sem Graph: abrir o chat no Teams web e ler o id da URL.

Se o chat 1:1 ainda não existir (vocês nunca conversaram), mande uma mensagem manual primeiro — o Graph não
lista chat que não existe.

## Recomendações que evitam dor depois

- **Error workflow.** Em *Workflow → Settings → Error workflow*, apontar para um workflow de erro. Sem isso,
  uma execução que falha é silenciosa, e a única pista fica no `notifyError` do Workestrator. Não dá para
  pré-configurar no JSON porque depende de um workflow que só existe na sua instância.
- **Versionar este JSON.** Exportar de volta e commitar junto do projeto sempre que o fluxo mudar. Fluxo
  editado à mão sem revisão é o modo de falha mais comum desse tipo de integração.
- **Não colocar regra de negócio aqui.** O workflow formata e entrega. Qualquer decisão é do Workestrator —
  quem decide precisa estar autenticado lá, e é isso que a
  [spec](spec.md#fronteira-do-sistema) garante.
- **Roteamento por destinatário (opcional).** O payload traz `approvers[]` com e-mail e nome dos aprovadores
  atribuídos. Para mandar para pessoas diferentes conforme o agente, resolva o `chatId` a partir desse campo
  em vez de fixá-lo na URL. Não é necessário no v1 — com uma pessoa específica, o id fixo basta.
