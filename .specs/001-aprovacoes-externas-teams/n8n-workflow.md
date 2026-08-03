# 001 · Anexo — Workflow do n8n (pronto para importar)

Workflow que recebe o aviso do Workestrator e entrega no Teams **uma mensagem por item** — um chamado por
aprovação (design D15). O JSON versionado está em [`n8n-workflow.json`](n8n-workflow.json); importe esse
arquivo direto (n8n → Workflows → *Import from File*).

Contrato de entrada: [`design.md` § Contrato do payload](design.md#contrato-do-payload-para-o-n8n).

## Uma mensagem por item

O nó `Montar mensagem` devolve **um item de saída por elemento de `items[]`**, então o nó do Teams roda uma
vez por chamado e cada mensagem carrega o seu próprio `item.decisionUrl`. Não precisa de nó `Split Out`: o
`return` de um array no Code node já produz N itens, e resolver no próprio Code node deixa o caso "sem itens"
no mesmo lugar da lógica em vez de exigir um `IF` só para isso.

Comportamento verificado (rodando o Code node contra o payload real, com 3 chamados):

| Entrada | Saída |
|---|---|
| `items[]` com 3 chamados | 3 mensagens, cada uma com `itemId` e link próprios |
| `items: []` (agente respondeu em prosa) | **1** mensagem de resumo — o aviso nunca some |
| payload sem o campo `items` (formato anterior) | 1 mensagem — retrocompatível |
| `NUM_PROCESS` ou `SOLICITANTE_NECESSIDADE` ausente | célula com `—`, sem quebrar a tabela |
| texto do solicitante com `<` ou `&` | escapado (`&lt;`, `&amp;`) — sem tag crua vazando |

## O mapeamento de campos vive aqui, e só aqui

O objeto `F` no topo do Code node é o **único lugar do sistema** que conhece `NUM_PROCESS`,
`SOLICITANTE_NECESSIDADE`, `EXECUTOR_RESPONSAVEL` e companhia. O Workestrator manda `item.data` como
passthrough de propósito: o esquema pertence ao domínio de quem montou o squad, e cravá-lo no Kotlin ou no
runtime amarraria o produto ao caso de uso de T.I. de um squad só. Mudou o esquema do agente? Muda `F`, e
nada mais.

## Dois bugs que a versão anterior deste fluxo tinha

| Bug | Sintoma | Correção |
|---|---|---|
| Code node lia `$input.all().map(i => i.json)` | no webhook v2.1 o corpo do POST está em `$json.**body**`; sem isso todo campo era `undefined` — a tabela chegava com `—` em tudo e "temos 1 chamados" | lê `$input.first().json.body` |
| Campos de negócio buscados na raiz do payload | `processo`/`necessidade`/… nunca existiram no contrato; os dados do agente ficavam presos dentro de `summary`, que o backend trunca em 500 chars (cortava no meio da palavra) | dados vêm de `items[].data`, sem truncamento; `summary` virou só um resumo legível |

## Falta endurecer: autenticação do webhook

O JSON entregue **não** tem `headerAuth`, para importar e funcionar sem depender de credencial nova. Enquanto
isso, qualquer um com a URL do webhook dispara mensagem no seu Teams. Para fechar (2 minutos):

1. n8n → Credentials → *Header Auth*: `Name` = `X-Workestrator-Token`, `Value` = um segredo aleatório.
2. No nó `Aviso do Workestrator`, marcar *Authentication* → *Header Auth* e selecionar a credencial.
3. No Workestrator, na conexão de notificação, preencher `authHeaderName` = `X-Workestrator-Token` e o
   segredo com o **mesmo** valor.

Fazer os três juntos — só o passo 2 sem o 3 faz o n8n rejeitar os avisos e o pedido gravar `notifyError`.

## Sobre o botão "Testar conexão"

O teste manda o payload real com **dois itens de exemplo**, então ele exercita o caminho de `items[]` (você
recebe duas mensagens). As chaves de `data` do teste são genéricas (`exemplo`), não as suas — o backend não
tem como conhecer o esquema de cada squad. Resultado esperado: as mensagens chegam com as células em `—`.
Isso valida conectividade, credencial e formato; o mapeamento real só aparece num checkpoint de verdade.

## Por que o nó nativo do Teams (e não HTTP Request)

Este fluxo usa `n8n-nodes-base.microsoftTeams` (*Chat Message → Create*), que é o que já está funcionando na
instância — trocar por `HTTP Request` + Microsoft Graph só para uniformizar exigiria refazer a credencial sem
ganho nenhum. O `chatId` fica no parâmetro do nó, não numa URL.

> ⚠️ A credencial Teams OAuth2 precisa de escopo que permita enviar mensagem de chat (`ChatMessage.Send`).
> Um **403** no envio é escopo, não estrutura do fluxo: o caminho é uma credencial *Microsoft Entra Service
> Principal* ou uma OAuth2 genérica onde você controla os escopos.

## Passo a passo

1. n8n → **Workflows → Import from File** → [`n8n-workflow.json`](n8n-workflow.json).
2. Conferir se o nó `Create chat message` está com a credencial **Microsoft Teams OAuth2** e o `chatId` certo
   (o JSON já vem com os da instância atual — ver [Como descobrir o chatId](#como-descobrir-o-chatid) se mudar
   de destinatário).
3. **Ativar** o workflow e copiar a *Production URL* do nó de webhook.
4. No Workestrator, cadastrar/atualizar a conexão de notificação com essa URL.
5. Clicar em **Testar** na conexão — devem chegar **duas** mensagens de exemplo (ver a seção do botão acima).
6. Opcional, recomendado: fechar a autenticação do webhook (seção
   [Falta endurecer](#falta-endurecer-autenticação-do-webhook)).

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
- **Versionar este JSON.** Exportar de volta para `n8n-workflow.json` e commitar sempre que o fluxo mudar.
  Fluxo editado à mão sem revisão é o modo de falha mais comum desse tipo de integração — os dois bugs da
  seção acima entraram exatamente assim.
- **Cuidado com o teto de mensagens.** Um lote de 60 chamados vira 60 mensagens no Teams. Se isso virar ruído,
  o lugar de agrupar é aqui (uma mensagem a cada N itens), não no Workestrator — a granularidade da *decisão*
  segue sendo por item de qualquer forma.
- **Não colocar regra de negócio aqui.** O workflow formata e entrega. Qualquer decisão é do Workestrator —
  quem decide precisa estar autenticado lá, e é isso que a
  [spec](spec.md#fronteira-do-sistema) garante.
- **Roteamento por destinatário (opcional).** O payload traz `approvers[]` com e-mail e nome dos aprovadores
  atribuídos. Para mandar para pessoas diferentes conforme o agente, resolva o `chatId` a partir desse campo
  em vez de fixá-lo na URL. Não é necessário no v1 — com uma pessoa específica, o id fixo basta.
