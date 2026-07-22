# Plano — arquivos, roteamento, Instagram e runs paralelos

> Status: plano de continuidade após a entrega parcial `3f0f869`
>
> Última atualização: 21/07/2026
>
> Aplicações afetadas: `apps/web` (React/Electron/runner) e `apps/api` (Kotlin/Spring)
>
> Documento de referência: as marcações abaixo distinguem o que já existe na branch do que ainda será implementado

> Correção de entendimento — Instagram: o fluxo alvo é autenticação interativa pelo próprio computador.
> O usuário clica em `Conectar Instagram`, o Electron abre o navegador, recebe o retorno OAuth e salva a
> conta. Não faz parte da experiência final pedir que o usuário cole `INSTAGRAM_ACCESS_TOKEN` ou
> `INSTAGRAM_USER_ID`. Client ID e Client Secret pertencem à configuração administrativa do aplicativo Meta,
> não à configuração cotidiana de cada agente.

## Índice

1. [Download dos arquivos do run](#1-download-dos-arquivos-do-run)
2. [Correção do coordenador no run enviado](#2-correção-do-coordenador-no-run-enviado)
3. [Autenticações genéricas N:N e publicação no Instagram](#3-autenticações-genéricas-nn-e-publicação-no-instagram)
4. [Runs em paralelo](#4-runs-em-paralelo)
5. [Ordem recomendada de implementação](#5-ordem-recomendada-de-implementação)
6. [Critérios globais de pronto](#6-critérios-globais-de-pronto)

## Objetivo

Organizar cinco melhorias relacionadas ao ciclo completo de uma execução de squad:

1. baixar todos os arquivos de um run em um ZIP ou baixar somente um arquivo;
2. impedir que o coordenador repita uma etapa já concluída quando o Reviewer apontar outro agente como responsável;
3. criar autenticações genéricas N:N, permitindo várias contas por conector e a escolha da conta usada por cada agente/tool;
4. transformar o OAuth do Instagram e o Publisher já existentes no primeiro caso real dessa arquitetura genérica;
5. permitir vários runs do mesmo squad em paralelo, com acompanhamento visual independente e ao vivo.

Este documento orienta as próximas implementações. Atualizar o plano não autoriza tratar itens pendentes como
concluídos nem substituir os critérios de aceite por protótipos.

## Estado real da branch atual

| Demanda | Estado | Observação |
| ------- | ------ | ---------- |
| Download de um arquivo do run | Implementado | Usa diálogo nativo de salvamento no Electron |
| Download de todos os arquivos | Implementado | Gera ZIP pelo runner, com validação de caminho |
| Repetição após `REVIEW_CHANGES owner=...` | Implementado parcialmente | Guardrail e teste existem; falta o contrato estruturado completo e validar o squad real |
| Publisher Instagram MCP | Protótipo técnico | Publica, mas ainda depende de token/user ID configurados manualmente; não atende ao login solicitado |
| Login Instagram pelo navegador do computador | Pendente | A infraestrutura OAuth genérica existe, mas o fluxo Instagram ponta a ponta ainda não foi entregue |
| Múltiplas contas e referência no agente | Pendente | Ainda existe somente `Script.authRef`; não existe `AuthConnection`/`AgentAuthBinding` |
| Runs paralelos do mesmo squad | Pendente | Runtime e workspace ainda precisam ser isolados por `runId` |
| Visualização simultânea dos runs em movimento | Pendente | Depende primeiro do runtime paralelo e dos eventos indexados por `runId` |

## Escopo e premissas

Incluído neste plano:

- arquitetura, contratos, segurança, interface, migração e testes;
- execução local no Electron instalado no Windows;
- persistência complementar no backend;
- autenticações manuais, API keys, OAuth2, device flow e OAuth de MCP remoto;
- múltiplos runs e múltiplas contas do mesmo usuário.

Fora do primeiro release:

- sincronizar a animação ao vivo entre computadores diferentes;
- publicar em contas pessoais do Instagram sem suporte oficial da API;
- armazenar tokens no renderer ou entregar tokens diretamente ao modelo;
- paralelismo sem limite ou sem isolamento por run;
- copiar autenticações ao compartilhar um squad.

Premissas:

- o Electron continua sendo necessário para providers CLI e arquivos locais;
- o backend continua sendo a fonte de verdade de secrets, conexões e histórico;
- toda ação externa sensível possui checkpoint e auditoria;
- cada run recebe identidade imutável antes do primeiro agente;
- compatibilidade com runs e scripts existentes será preservada durante a migração.

## Glossário

| Termo             | Significado neste documento                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `runId`           | Identidade única de uma execução, mesmo quando várias pertencem ao mesmo squad                 |
| Workspace do run  | Pasta isolada onde somente aquela execução lê/escreve arquivos e configurações MCP             |
| Snapshot          | Cópia final e imutável dos arquivos gerados por um run                                         |
| `AuthConnection`  | Identidade segura de uma conta/conexão; não contém token visível para UI ou agente             |
| Secret            | Valor sensível cifrado usado internamente para autenticar uma conexão                          |
| Auth binding      | Associação entre agente, tool, slot de autenticação e conexão autorizada                       |
| Auth slot         | Nome da credencial exigida por uma tool, como `instagram_account` ou `storage_account`         |
| Override por run  | Troca da conta usada somente naquela execução, sem alterar a configuração permanente do agente |
| Auth Flow Manager | Componente do Electron que abre e acompanha autorizações HTTPS e aprovações pendentes          |
| MCP remoto        | Servidor MCP acessado por Streamable HTTP/SSE                                                  |
| MCP stdio         | Servidor MCP local iniciado como subprocesso e conectado por entrada/saída padrão              |
| Idempotency key   | Chave que impede repetir uma ação externa já executada, como uma publicação                    |

## Resumo das decisões

| Tema                      | Decisão proposta                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Download individual       | Ação `Baixar arquivo` sempre visível para o arquivo selecionado                                         |
| Download completo         | Ação `Baixar tudo` gera um ZIP preservando as subpastas do run                                          |
| Windows/Electron          | Usar diálogo nativo de salvamento; não depender apenas do atributo HTML `download`                      |
| Segurança dos arquivos    | O runner resolve arquivos por `runId/rootId` e bloqueia caminhos fora do snapshot                       |
| Repetição de agente       | `REVIEW_CHANGES owner=<agente>` vira uma instrução de roteamento obrigatória                            |
| Contexto de revisão       | O responsável recebe a revisão e os passos originais necessários, não somente a última saída            |
| Autenticações             | Substituir o vínculo único `Script.authRef` por conexões reutilizáveis e vínculos N:N agente/tool/conta |
| Múltiplas contas          | Permitir várias conexões do mesmo conector, com nome e identidade da conta                              |
| Escolha da conta          | Configurar uma conta padrão por agente/tool e permitir override antes de iniciar o run                  |
| Instagram                 | Login pelo navegador do computador; conta descoberta e salva sem token/user ID manual                   |
| Configuração Meta         | App ID/secret configurados uma vez no sistema; usuário final apenas autoriza sua conta                   |
| Publicação                | Exigir preview, `dryRun` e aprovação humana antes do efeito externo                                     |
| Fluxos HTTPS              | Electron inicia, acompanha e cancela fluxos interativos por URL HTTPS validada                          |
| MCP OAuth                 | Usar OAuth nativo do MCP remoto quando suportado; usar o Auth Flow Manager nos demais casos             |
| Paralelismo               | Isolar uma workspace por run e indexar todo o runtime por `runId`, inclusive no mesmo squad             |
| Primeira entrega paralela | Até 2 runs simultâneos, inclusive duas execuções do mesmo squad                                         |
| Visualização              | Cada run possui mapa, agentes, terminal, arquivos, checkpoint e progresso próprios                      |

---

## 1. Download dos arquivos do run

### 1.1 Diagnóstico atual

- O run já salva um manifesto em `RunRecord.files` e o runner cria um snapshot em `.runs/<runId>`.
- `Ver arquivos gerados` registra a pasta do snapshot e monta URLs locais de preview.
- `FilePreview` oferece download apenas como fallback para tipos que não possuem preview próprio.
- HTML, imagem, Markdown e código podem ser visualizados, mas não apresentam uma ação uniforme de download.
- Não existe ação para baixar o conjunto completo.
- Confiar somente em `<a download>` é frágil no Electron/Windows e não dá ao usuário controle claro sobre o destino.

### 1.2 Experiência desejada

No histórico ou no run recém-concluído:

- `Ver arquivos gerados` continua abrindo o preview;
- o cabeçalho mostra `Baixar tudo`;
- o arquivo selecionado mostra `Baixar arquivo`;
- `Baixar tudo` abre o seletor nativo do Windows e salva um ZIP;
- `Baixar arquivo` abre o seletor nativo e salva apenas o item escolhido;
- a estrutura interna é preservada, por exemplo `output/images/slide-01.jpg`;
- cancelar o seletor não gera mensagem de erro;
- sucesso e falha aparecem em toast, com caminho final quando for seguro exibi-lo.

### 1.3 Contrato do runner

Preferir operações orientadas ao run/snapshot, sem aceitar um caminho absoluto arbitrário enviado pela interface.

Operações propostas:

```ts
type SaveRunFileInput = {
	runId: string;
	rootId: string;
	relativePath: string;
};

type SaveRunArchiveInput = {
	runId: string;
	rootId: string;
	suggestedName: string;
};
```

No Electron, expor por IPC/preload:

- `files.saveRunFile(input)`;
- `files.saveRunArchive(input)`.

O processo principal deve:

1. localizar o `rootId` na allowlist do runner;
2. confirmar que a raiz corresponde ao snapshot do `runId`;
3. resolver o caminho real com `path.resolve`;
4. confirmar que o resultado permanece dentro da raiz permitida;
5. abrir `dialog.showSaveDialog`;
6. copiar o arquivo ou criar o ZIP diretamente no destino escolhido;
7. devolver `{ saved, path? }`, diferenciando cancelamento de erro.

Como fallback de desenvolvimento no navegador, o servidor local pode expor respostas com
`Content-Disposition: attachment`, sempre protegidas pelo token efêmero do runner. O app instalado deve
preferir o fluxo IPC nativo.

### 1.4 Regras do ZIP

- Nome sugerido: `<squad>-<data>-arquivos.zip`.
- Fallback: `run-<runId>-arquivos.zip`.
- Preservar subpastas relativas.
- Não incluir `.git`, `.mcp.json`, `scripts/`, secrets, logs internos do runner ou outros snapshots.
- Ignorar links simbólicos que escapem da raiz.
- Se um arquivo desaparecer durante a compactação, abortar com erro claro em vez de produzir um ZIP silenciosamente incompleto.
- Criar o ZIP no destino escolhido ou em diretório temporário exclusivo; remover temporários após sucesso/erro.
- A biblioteca de ZIP deve funcionar no Node empacotado pelo Electron, sem depender de `zip.exe`, PowerShell ou ferramentas instaladas no Windows.

### 1.5 Interface

Arquivos principais:

- `apps/web/src/components/preview/preview-modal.tsx` — ações e estados de carregamento;
- `apps/web/src/components/preview/file-preview.tsx` — ação individual uniforme;
- `apps/web/src/components/orchestrator/run-detail-sheet/run-detail-sheet.tsx` — fornecer `runId`, squad e nome sugerido;
- `apps/web/src/features/security/orchestrator-shared/runtime/model-client.ts` — fallback HTTP do runner;
- `apps/web/electron/preload.ts` — API segura do renderer;
- `apps/web/electron/main.ts` — IPC e diálogo nativo;
- `apps/web/electron/runner/runner.ts` — resolução segura e compactação;
- `apps/web/electron/runner/server.ts` — fallback HTTP, se mantido.

Estados de UI:

- normal: `Baixar tudo` / `Baixar arquivo`;
- processando: `Preparando ZIP...` / `Salvando...`;
- cancelado: retornar ao normal, sem toast de erro;
- concluído: `Arquivo salvo`;
- falha: mensagem específica, sem expor token ou caminho interno da workspace.

### 1.6 Testes e aceite

- baixar individualmente JPG, HTML, Markdown e arquivo sem preview;
- ZIP com 1 arquivo e com vários arquivos;
- ZIP preserva `output/images` e `output/slides`;
- tentativa com `../`, caminho absoluto, drive diferente e link simbólico é bloqueada;
- um run não consegue solicitar arquivo de outro run;
- cancelar o diálogo do Windows não é tratado como falha;
- nome com acento e caracteres inválidos é normalizado;
- validar no Electron instalado no Windows, não apenas no Vite;
- abrir o ZIP salvo e comparar quantidade, nomes e tamanhos com `RunRecord.files`.

---

## 2. Correção do coordenador no run enviado

### 2.1 Evidência do erro

Run analisado:

`carrossel-instagram-news--2026-07-21t20-04-13.765z.md`

Sequência observada:

1. Passo 1: Researcher entregou pesquisa, fatos, ângulo e fontes.
2. Passo 2: foram gravados 8 arquivos HTML.
3. Passo 3: foram renderizados 8 JPGs.
4. Passo 4: Reviewer respondeu `REVIEW_CHANGES owner=Copywriter` e informou que faltavam roteiro, legenda, hashtags e fontes no contexto de revisão.
5. Passo 5: o sistema executou novamente uma pesquisa completa, em vez de devolver a demanda ao Copywriter.

Conclusão: não foi falha de geração dos arquivos. Foi uma falha de roteamento e de transporte de contexto.
O coordenador recebeu o histórico, mas não existe hoje uma regra determinística que transforme
`owner=Copywriter` em destino obrigatório. Ele inferiu que a ausência de fontes exigia repetir o Researcher,
apesar de o Reviewer ter indicado outro responsável.

Há um segundo problema de observabilidade: o Markdown exportado não identifica claramente o nome, a função e
a cadeira que produziram cada passo. Isso dificulta comprovar pelo arquivo se o passo 2 foi Copywriter, Slide
Author ou outro agente.

### 2.2 Ajuste do contrato de revisão

Manter compatibilidade com a saída textual existente, mas definir um contrato estruturado como alvo:

```json
{
	"status": "changes_requested",
	"ownerSeatId": "<seat-id>",
	"ownerAgentId": "<agent-id>",
	"requiredContextSteps": [1, 4],
	"details": "Gerar roteiro, legenda, hashtags e manter aderência às fontes."
}
```

Durante a migração, aceitar também:

```txt
REVIEW_CHANGES owner=Copywriter details=...
```

Regras:

- `ownerSeatId` é a referência preferencial e estável;
- `ownerAgentId` é o segundo fallback;
- `owner=<nome>` é compatibilidade para squads existentes;
- nomes devem ser comparados normalizados, mas o Reviewer deve usar exatamente um agente sentado;
- owner inexistente ou ambíguo pausa o run com erro acionável; não escolhe outro agente silenciosamente.

### 2.3 Guardrail no runtime

Antes de executar a escolha retornada pelo coordenador:

1. localizar a revisão pendente mais recente ainda não resolvida;
2. extrair o owner;
3. resolver a cadeira ocupada correspondente;
4. comparar com a decisão do coordenador;
5. se forem diferentes, substituir a decisão pelo owner indicado e registrar a correção no transcript;
6. enviar ao agente os passos de contexto pedidos pelo Reviewer;
7. marcar a revisão como resolvida somente depois de uma nova entrega do owner e uma nova passagem pelo Reviewer.

No caso enviado, o resultado esperado seria:

```txt
Passo 4: Reviewer pede mudanças para Copywriter
Passo 5: Copywriter recebe o conteúdo completo dos passos 1 e 4
Passo 6: Reviewer revalida a nova entrega
```

O runtime não deve proibir toda repetição de agente: revisões legítimas exigem reexecução. A regra correta é
impedir repetição sem justificativa e respeitar a responsabilidade explícita da revisão.

### 2.4 Ajuste do prompt do coordenador e do squad

No prompt genérico de `buildCoordinatorPrompt`:

- explicar que `REVIEW_CHANGES owner=...` é vinculante;
- proibir reinício de fases anteriores, salvo quando o próprio Reviewer indicar aquele owner;
- exigir `context_steps` com a revisão e a fonte original necessária;
- exigir motivo explícito para repetir um agente já concluído;
- orientar `done` somente quando não houver revisão pendente.

No squad Carrossel Instagram:

- o Reviewer deve citar o nome/seat real do responsável;
- o checklist deve separar problemas de pesquisa, copy, HTML, render e publicação;
- `Copywriter` recebe roteiro, legenda e hashtags;
- `Slide Author` recebe estrutura/conteúdo visual, se for um agente separado;
- `Image Designer/Renderer` recebe somente correções de render;
- o coordenador deve conhecer essa tabela de responsabilidades;
- definir limite de tentativas por fase, por exemplo 2 revisões antes de pausar para intervenção humana.

### 2.5 Histórico e exportação

Adicionar a cada passo exportado:

- número do passo;
- `agentName` e `agentRole`;
- `agentId` e `seatId` em uma seção técnica recolhível ou no rodapé;
- decisão anterior do coordenador e motivo;
- `context_steps` realmente enviados;
- revisão que originou uma reexecução.

Isso permite distinguir “o coordenador repetiu o Slider” de “o coordenador chamou novamente o Researcher”
sem depender somente do estilo textual do resultado.

### 2.6 Testes e aceite

- fixture baseada exatamente nos cinco passos do run enviado;
- coordenador escolhe Researcher após `owner=Copywriter`: runtime corrige para Copywriter;
- Copywriter recebe passos 1 e 4 completos;
- owner inexistente pausa com mensagem clara;
- owner ambíguo não escolhe por aproximação;
- nova revisão pode reenviar ao mesmo owner de forma legítima;
- `REVIEW_OK` encerra a pendência;
- limite de revisão evita loop infinito;
- exportação Markdown informa quem executou cada passo;
- teste de regressão mantém `context_steps` e checkpoints existentes.

Arquivos prováveis:

- `apps/web/src/features/security/orchestrator-shared/runtime/orchestrator-runtime.ts`;
- `apps/web/src/features/security/orchestrator-shared/runtime/orchestrator-decision.ts`;
- respectivos testes de runtime/decisão;
- exportador em `apps/web/src/components/orchestrator/run-detail-sheet/`;
- configuração/prompt do squad salvo no backend.

---

## 3. Autenticações genéricas N:N e publicação no Instagram

### 3.1 Objetivo do modelo genérico

Permitir qualquer tipo de autenticação e mais de uma conta do mesmo serviço, sem amarrar a credencial a um
único script. Exemplos:

- duas contas do Instagram, uma pessoal da empresa e outra de cliente;
- três workspaces do Slack;
- duas organizações do GitHub;
- uma API key diferente por cliente;
- uma conta OAuth reutilizada por vários agentes e ferramentas;
- um agente com contas diferentes para ferramentas diferentes.

O relacionamento alvo é N:N:

```txt
Agent N --- N AuthConnection
Tool  N --- N AuthConnection
Run       --- snapshot/override das conexões selecionadas
```

Uma conexão pode servir vários agentes. Um agente pode usar várias conexões. A associação deve sempre informar
em qual tool e em qual slot aquela conexão será usada.

### 3.2 Diagnóstico atual

- `Script.authRef` aceita somente um secret por tool.
- `Agent` referencia `scriptIds`, mas não possui vínculos de autenticação próprios.
- a página de conexões monta um `Map<connectorId, Secret>`, o que visualmente reduz cada conector a uma única conta;
- o runner já resolve bearer, header, query, basic, OAuth client credentials, OAuth refresh e raw;
- placeholders `$<secretId>` permitem vários secrets no `env`, mas isso é configuração manual e não constitui um
  modelo de contas por agente;
- o compartilhamento de squad remove corretamente `authRef`, mas o novo modelo também precisará remover bindings;
- a SDK MCP instalada possui suporte a OAuth para transportes HTTP, porém `connectMcpTools` cria hoje o
  `StreamableHTTPClientTransport` sem `authProvider`; portanto, o OAuth MCP automático ainda não está ligado;
- servidores MCP locais por stdio, como o Publisher do Instagram, não ganham OAuth automaticamente: eles dependem
  das conexões/secrets injetadas pelo Workestrator.

### 3.3 Modelo de domínio proposto

Evoluir `Secret` para uma conexão com identidade operacional, mantendo o valor cifrado separado:

```ts
type AuthConnection = {
	id: string;
	connectorId?: string;
	label: string; // "Instagram — Empresa A"
	accountExternalId?: string; // id no provider
	accountDisplayName?: string; // @empresa_a
	authType: SecretAuthType;
	scopes: string[];
	status: "connected" | "expired" | "revoked" | "error";
	expiresAt?: string;
	lastValidatedAt?: string;
};

type AgentAuthBinding = {
	id: string;
	agentId: string;
	scriptId: string;
	authSlot: string; // "instagram_account", "github_account", "api_key"
	connectionId: string;
	alias: string; // "instagram_empresa_a"
	isDefault: boolean;
};
```

O valor sensível continua em `Secret`/cofre criptografado. `AuthConnection` é a identidade segura que a UI e o
agente podem enxergar. O binding aponta para a conexão, nunca para o token bruto.

Cada tool declara os slots de autenticação aceitos:

```ts
type ToolAuthRequirement = {
	slot: string;
	required: boolean;
	acceptedConnectorIds?: string[];
	acceptedAuthTypes?: SecretAuthType[];
	cardinality: "one" | "many";
};
```

Isso permite tanto uma tool simples com uma conta quanto uma tool que precisa de mais de uma credencial, por
exemplo Instagram + storage de mídia.

### 3.4 Resolução da conta usada pelo agente

Ordem de precedência:

1. override escolhido na tela antes de iniciar aquele run;
2. binding padrão do agente para aquela tool/slot;
3. binding padrão da própria tool;
4. se houver exatamente uma conexão compatível, sugeri-la e pedir confirmação;
5. se houver zero ou mais de uma sem padrão, bloquear o início com mensagem acionável.

Ao iniciar, salvar um snapshot imutável no run:

```ts
type RunAuthBindingSnapshot = {
	agentId: string;
	scriptId: string;
	authSlot: string;
	connectionId: string;
	accountDisplayName?: string;
};
```

Se o usuário editar o agente enquanto o run está rodando, a conta do run não muda. Uma retomada reutiliza o
snapshot, salvo se a conexão estiver expirada/revogada; nesse caso o run entra em `awaiting_auth`.

O agente enxerga somente aliases e nomes seguros, por exemplo:

```txt
Contas disponíveis para Instagram Publisher:
- instagram_empresa_a — @empresa_a (padrão deste run)
- instagram_cliente_b — @cliente_b
```

Se houver uma única conta selecionada, a tool pode omitir o argumento de conta. Se houver várias, aceitar
`accountAlias`, resolvido no runner contra os bindings permitidos. O modelo nunca recebe nem escolhe `secretId`.

### 3.5 Interface de conexões e agentes

Na área `Conexões e autenticações`:

- permitir `Adicionar outra conta` no mesmo conector;
- agrupar por conector sem colapsar as contas em um único item;
- mostrar label, identidade externa, scopes, validade e status;
- permitir testar, reconectar, renomear, revogar e excluir cada conta separadamente;
- impedir exclusão sem informar quais agentes/tools serão afetados.

No formulário do agente, criar a seção `Contas usadas pelas ferramentas`:

```txt
Instagram Publisher
  Conta para publicação: [Instagram — Empresa A]
  Alias para o agente:    [instagram_empresa_a]

Upload de mídia
  Credencial:             [R2 — Produção]
```

Antes de iniciar o run, mostrar `Autenticações deste run`, permitindo sobrescrever as contas sem editar o squad.
Essa seleção deve ficar visível no detalhe do run e na tela de aprovação de uma ação externa.

### 3.6 Auth Flow Manager do Electron

Criar um gerenciador genérico de fluxos interativos, acessível por IPC/preload e pelo servidor local autenticado
do Electron. Ele serve OAuth, device authorization e aprovações que exigem abrir uma URL HTTPS.

Contrato proposto:

```txt
POST /api/auth-flows
GET  /api/auth-flows/:flowId
POST /api/auth-flows/:flowId/open
POST /api/auth-flows/:flowId/cancel
POST /api/auth-flows/:flowId/approve
POST /api/auth-flows/:flowId/reject
```

Exemplo de criação:

```ts
type StartAuthFlowInput = {
	connectorId: string;
	connectionId?: string;
	purpose: "connect" | "reconnect" | "tool_authorization" | "action_approval";
	runId?: string;
	agentId?: string;
	scriptId?: string;
	requestedScopes?: string[];
};
```

Estados:

```txt
created -> awaiting_user -> browser_opened -> callback_received
        -> exchanging_token -> connected
        -> approved/rejected/cancelled/expired/failed
```

Regras de segurança:

- não aceitar URL livre enviada pelo agente;
- obter `authorizationUrl`, `tokenUrl`, callback e domínios permitidos do catálogo do conector ou metadata MCP;
- exigir HTTPS para URLs externas; permitir HTTP somente no callback loopback em `127.0.0.1`;
- bloquear credenciais embutidas na URL, protocolos `file:`, `javascript:` e redirects fora da allowlist;
- usar `state`, PKCE, expiração curta e uso único;
- abrir pelo `shell.openExternal` ou `BrowserWindow` isolado, conforme o conector;
- proteger endpoints locais com token de sessão do runner e bind exclusivo em `127.0.0.1`;
- nunca considerar o clique em `Aprovar` como aprovação do provider: OAuth só conclui após callback/token válido;
- usar `approve/reject` apenas para consentimentos internos do Workestrator, como publicar um post;
- emitir eventos SSE/IPC para atualizar o run sem polling agressivo.

Quando uma tool devolver `AUTH_REQUIRED` com um `flowId`, o runtime deve:

1. colocar somente aquele run em `awaiting_auth`;
2. mostrar conta, tool, scopes e URL/domínio que será aberto;
3. permitir `Abrir autorização`, `Cancelar` ou trocar de conexão;
4. retomar a mesma chamada de tool depois de `connected`;
5. preservar idempotência para não repetir uma ação já concluída.

### 3.7 O que o MCP resolve e o que o Electron resolve

O MCP ajuda, mas não resolve sozinho todos os casos.

| Caso                                         | Responsável proposto                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| MCP remoto HTTP com metadata OAuth válida    | SDK MCP + `OAuthClientProvider`, integrado ao Auth Flow Manager         |
| MCP remoto HTTP com bearer/API key existente | `AuthConnection` injetada nos headers                                   |
| MCP local stdio que usa API externa          | Workestrator injeta a conexão no env/IPC; MCP não abre OAuth sozinho    |
| Tool HTTP declarativa                        | Workestrator resolve o binding e aplica bearer/header/query/basic/OAuth |
| Provider usa device code                     | Auth Flow Manager abre URL e acompanha polling controlado               |
| Ação destrutiva ou publicação                | Checkpoint interno do runtime, independente do OAuth MCP                |

Mudança necessária em `openai-tools.ts`: fornecer um `OAuthClientProvider` ao
`StreamableHTTPClientTransport`, persistir tokens pelo backend e redirecionar `redirectToAuthorization` ao Auth
Flow Manager. Sem isso, o suporte presente na SDK permanece inativo.

### 3.8 Instagram como primeiro conector real

#### 3.8.1 Correção do fluxo alvo

O login deve acontecer pelo próprio computador, como no fluxo já iniciado em `electron/oauth-flow.ts`:

```txt
Usuário -> Conexões -> Instagram -> Conectar outra conta
Electron -> abre navegador/BrowserWindow com o login oficial do Instagram
Instagram -> callback único do fluxo
Electron -> troca e valida o token sem expô-lo ao renderer
Workestrator -> descobre id + @usuário e salva a conexão
Agente -> referencia apenas a conexão/alias autorizado
```

Não usar como experiência final:

- formulário pedindo access token;
- formulário pedindo Instagram user ID;
- placeholders como `$instagram-access-token` e `$instagram-user-id` no Publisher;
- Client ID/Client Secret digitados novamente a cada conta conectada;
- token enviado no prompt, transcript ou configuração visível do agente.

#### 3.8.2 O que já existe e será reaproveitado

Reutilizar:

- `apps/web/electron/oauth-flow.ts`;
- `ConnectOAuthDialog`;
- catálogo OAuth `instagram`;
- `InstagramTokenStrategy` e `OAuthTokenService`;
- `apps/web/electron/mcp-servers/instagram-publisher.mjs`.

Lacunas atuais que precisam ser fechadas:

- o diálogo OAuth ainda pede Client ID/Secret ao usuário em toda conexão;
- o callback loopback usa porta aleatória, enquanto o provider pode exigir redirect URI exata;
- o catálogo Instagram ainda precisa declarar o escopo de publicação além do escopo básico;
- o resultado OAuth salva token, mas ainda não cria uma identidade de conta com `id` e `@username`;
- a tela de conexões reduz um conector a uma única conta;
- o Publisher ainda lê token e user ID de variáveis de ambiente configuradas manualmente;
- o agente ainda não possui binding explícito para escolher qual conta usar.

#### 3.8.3 Configuração do aplicativo Meta

Criar uma configuração de sistema separada das contas dos usuários:

```ts
type OAuthAppConfig = {
	connectorId: "instagram";
	clientIdRef: string;
	clientSecretRef: string;
	redirectMode: "loopback" | "https_relay";
	redirectUri: string;
	allowedAuthHosts: string[];
};
```

Regras:

- App ID e App Secret são cadastrados uma vez por administrador/deploy, preferencialmente por secrets do backend;
- a UI comum mostra somente `Conectar Instagram`, sem solicitar credenciais técnicas do app;
- builds de desenvolvimento podem permitir configuração local explícita, sem embutir o App Secret no renderer;
- a conexão de uma conta nunca duplica o App Secret dentro do secret daquela conta;
- validar na inicialização se o conector está configurado e mostrar instrução acionável se faltar configuração.

#### 3.8.4 Callback no computador

Caminho principal:

1. o Electron cria um `flowId`, `state` e PKCE de uso único;
2. abre o login oficial no navegador do computador ou em `BrowserWindow` isolada;
3. recebe o callback em servidor loopback ligado somente a `127.0.0.1`;
4. troca o código por token no processo main/backend seguro;
5. fecha a janela/aba e atualiza a tela de conexões automaticamente.

O callback não deve continuar usando uma porta aleatória sem garantia de compatibilidade. Fazer primeiro um spike
com o aplicativo Meta real e escolher uma destas opções:

- `loopback`: porta fixa configurável e redirect URI exata cadastrada no Meta App;
- `https_relay`: apenas se a Meta não aceitar o loopback no aplicativo distribuído; o navegador continua abrindo no
  computador, o backend recebe o callback HTTPS e devolve ao Electron por `flowId` de uso único/deep link.

O relay HTTPS é fallback de compatibilidade, não substitui a experiência de login local. O plano só avança para a
implementação completa depois que uma conta de teste concluir login, cancelamento e reconexão no app instalado.

#### 3.8.5 Descoberta e persistência da conta

Depois da troca do código:

1. trocar o token curto pelo token de longa duração usando a estratégia Instagram já existente;
2. consultar a API oficial com o token para obter ao menos `id`, `username` e tipo da conta;
3. verificar se é uma conta profissional compatível com publicação;
4. confirmar os scopes `instagram_business_basic` e `instagram_business_content_publish`;
5. criar `AuthConnection` com `accountExternalId`, `accountDisplayName`, scopes, validade e status;
6. guardar o token somente no secret cifrado associado à conexão;
7. exibir a conta como, por exemplo, `Instagram — @empresa_a`.

Falhas de descoberta, conta incompatível ou scope negado não podem criar uma conexão com status `connected`.

Fluxo:

1. `Adicionar conta` -> `Instagram`;
2. clicar em `Conectar` sem colar token, user ID ou credenciais do app;
3. abrir autorização pelo Auth Flow Manager no computador;
4. solicitar `instagram_business_basic instagram_business_content_publish`;
5. validar callback, trocar token curto por longo e manter renovação no backend;
6. consultar a identidade da conta profissional;
7. criar `AuthConnection` com label e `@usuario`;
8. vincular a conta ao Publisher do agente;
9. selecionar/confirmar a conta antes do run ou da publicação.

#### 3.8.6 Referência da conta no agente

Na edição do agente Publisher, mostrar:

```txt
Ferramenta: Instagram Publisher
Conta para publicação: [Instagram — @empresa_a]
Alias interno: instagram_empresa_a
```

O valor salvo é um `AgentAuthBinding` para o slot `instagram_account`. O agente recebe apenas o alias seguro. No
início do run, o binding vira um snapshot imutável e pode ser sobrescrito para outra conta conectada. Se a conexão
expirar, somente esse run entra em `awaiting_auth` e oferece `Reconectar no navegador`.

#### 3.8.7 Injeção no Publisher

Alterar o Publisher para receber uma credencial resolvida pelo binding, não por placeholders manuais:

- `AuthConnection.accountExternalId` fornece o ID da conta;
- o runner resolve o access token válido no último momento;
- token e ID entram somente no processo MCP local, após validação do run/agente/tool;
- remover do template os placeholders `INSTAGRAM_ACCESS_TOKEN` e `INSTAGRAM_USER_ID`;
- manter a credencial de storage em slot separado (`media_storage`) até a migração do imgBB para R2;
- registrar nos logs apenas `connectionId`, alias seguro e `@username`, nunca o token.

### 3.9 Publicação no Instagram

Contrato da tool:

```ts
publish_instagram_carousel({
  runId: string,
  accountAlias?: string,
  imagePaths: string[],
  caption: string,
  dryRun: boolean,
  idempotencyKey: string,
})
```

Validações:

- alias pertence aos bindings daquele run/agente/tool;
- conexão ativa, conta profissional e permissão concedida;
- 2 a 10 JPEGs válidos;
- legenda com até 2.200 caracteres;
- arquivos pertencem à workspace do run;
- nenhuma publicação anterior com a mesma idempotency key.

Fluxo de efeito externo:

1. Reviewer aprova conteúdo;
2. Publisher executa `dryRun`;
3. UI mostra conta escolhida, preview, quantidade e legenda;
4. run entra em `awaiting_approval`;
5. usuário aprova ou rejeita pelo endpoint/checkpoint interno;
6. após aprovação, executar `media_publish` uma única vez;
7. salvar media ID, conta, run, horário e resultado.

Manter imgBB no MVP e migrar depois para o Cloudflare R2 do backend com URLs temporárias. Nunca enviar
`file://` ou URL local do runner para a Meta.

### 3.10 Segurança, compartilhamento e testes

- tokens não aparecem no renderer, prompt, transcript, ZIP ou exportação;
- compartilhar/duplicar squad copia requisitos e aliases, nunca connection IDs do proprietário;
- ao importar um squad, bindings ficam `não configurados` até o novo usuário escolher suas contas;
- usuário A não consegue referenciar conexão do usuário B;
- agentes só acessam connections explicitamente permitidas em seus bindings;
- dois runs paralelos do mesmo squad podem escolher contas diferentes sem trocar tokens entre si;
- testar múltiplas contas do mesmo connector, conta expirada e reconnect;
- testar OAuth cancelado, state inválido, callback expirado e scope negado;
- testar MCP remoto com OAuth e MCP stdio com conexão injetada;
- testar URL fora da allowlist e protocolo não HTTPS;
- `dryRun` e checkpoint rejeitado nunca publicam;
- retry com a mesma idempotency key não duplica publicação.

Referência oficial atual para o primeiro conector: coleção da Meta no Postman para Instagram API:
https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api

---

## 4. Runs em paralelo

### 4.1 Diagnóstico atual

O código já possui parte da base para paralelismo entre squads:

- o Zustand guarda `runtimes` separados por `squadId`;
- `activeRuns`, IDs persistidos e chamadas em andamento também são separados por `squadId`;
- a página de squads já consegue listar vários squads ativos.

Porém, não é seguro executar em paralelo hoje:

- todos os squads usam a mesma `WORKSPACE_DIR`;
- `startRun` chama `resetWorkspace()` nessa pasta compartilhada;
- um segundo run pode apagar arquivos enquanto o primeiro ainda trabalha;
- `.mcp.json`, scripts materializados e diffs Git também são compartilhados;
- o snapshot final pode capturar arquivos de outro run;
- estruturas indexadas apenas por `squadId` fazem um segundo run do mesmo squad sobrescrever estado, IDs,
  cancelamento, checkpoint e transcript do primeiro;
- `startRun` rejeita a nova execução quando o runtime daquele squad já está ativo;
- o diálogo global aponta para o squad, não para uma execução específica;
- o mapa/escritório possui um único estado visual por cadeira, então não consegue mostrar o mesmo agente trabalhando
  simultaneamente em dois runs;
- não existe limite global ou por provider, então vários CLIs podem saturar CPU, memória ou rate limits.

### 4.2 Arquitetura alvo

Cada execução recebe uma identidade própria desde o início, mesmo quando pertence ao mesmo squad:

```txt
orchestrator-workspace/
  runs/
    <runId-A>/
      work/
      scripts/
      .mcp.json
      output/
    <runId-B>/
      work/
      scripts/
      .mcp.json
      output/
  snapshots/
    <runId-A>/
    <runId-B>/
```

O estado deixa de ser `Record<squadId, Runtime>` e passa a ter índice primário por run:

```ts
type RunRuntimeStore = {
	runtimesByRunId: Record<string, Runtime>;
	activeRunIdsBySquadId: Record<string, string[]>;
	selectedRunIdBySquadId: Record<string, string | undefined>;
};
```

`activeRuns`, `persistedRunIds`, `runCreationInFlight`, controllers de cancelamento, perguntas e checkpoints
também devem usar `runId`. `squadId` permanece como filtro/agrupador, nunca como identidade da execução.

Todas as operações passam `runId`/`workspaceId` explicitamente:

- reset;
- chamada do agente;
- configuração MCP;
- leitura/escrita de arquivos;
- preview;
- snapshot;
- download;
- cancelamento;
- logs e atividade ao vivo.

O runner nunca deve inferir “o run atual” por uma pasta global. `startRun` deve devolver imediatamente o `runId`
para a UI abrir e acompanhar exatamente aquela execução.

### 4.3 Gerenciador de concorrência

Criar um `RunExecutionManager` no Electron/runtime com:

- fila FIFO;
- limite global configurável, começando em 2;
- limite por squad configurável, começando em 2;
- limite opcional por provider/CLI;
- estados `queued`, `preparing`, `running`, `checkpoint`, `paused`, `completed`, `aborted`;
- cancelamento individual por `runId`;
- liberação garantida do slot em sucesso, erro, cancelamento ou fechamento do processo;
- recuperação de runs interrompidos após reinício do app;
- proteção contra iniciar duas vezes a mesma solicitação.

Política inicial sugerida:

```txt
Máximo global: 2 runs
Mesmo squad: até 2 runs
Claude CLI: 2 processos, ajustável
Codex CLI: 2 processos, ajustável
Provider HTTP: respeitar rate limit e backoff do provider
Publisher Instagram: 1 publicação por conexão por vez
```

O limite de publicação é por `connectionId`, não por squad: dois runs do mesmo squad podem preparar posts para
contas diferentes simultaneamente, enquanto duas publicações na mesma conta são serializadas.

### 4.4 Fases de entrega

#### Fase 1 — migração interna e isolamento

- criar workspace por run;
- migrar stores, maps, controllers e APIs internas para `runId`;
- passar `runId` por toda a cadeia;
- adaptar snapshot, preview e download;
- manter temporariamente o limite global em 1 durante a migração técnica;
- provar que não houve regressão.

#### Fase 2 — liberar paralelismo completo do MVP

- ativar limite global 2;
- permitir os dois slots para o mesmo squad ou para squads diferentes;
- mostrar runs ativos e enfileirados na sidebar;
- testar duas execuções do mesmo squad com briefing, conta e arquivos distintos;
- lançar a funcionalidade somente quando o mesmo squad funcionar em paralelo.

#### Fase 3 — controle e resiliência

- configuração de concorrência;
- métricas de duração, fila, memória e falhas;
- backpressure quando CPU/memória estiver alta;
- retry controlado para 429/erros transitórios;
- recuperação após fechar/reabrir o Electron.

#### Fase 4 — escala configurável

- permitir limites globais e por squad maiores que 2;
- adicionar perfis `Conservador`, `Balanceado` e `Personalizado`;
- aplicar limite de memória/processos e rate limit por provider/conexão;
- manter uma faixa máxima segura no Windows para evitar travar o Electron.

### 4.5 Persistência e identidade

Hoje o backend cria o ID persistido de forma assíncrona. Para a workspace nascer isolada antes do primeiro passo,
definir um `executionId` local imutável e uma das estratégias:

1. preferida: backend aceita um `clientExecutionId` idempotente e o associa ao Run persistido;
2. alternativa: aguardar a criação do Run no backend antes de executar;
3. fallback offline: usar UUID local e sincronizar a associação depois.

Não renomear pastas de um run em andamento. Snapshot, histórico e download devem guardar a associação entre
`executionId`, ID do backend e `rootId`.

### 4.6 Visualização dos runs em movimento

Criar uma central `Runs ativos` orientada por `runId`:

- contador global `2 rodando · 1 aguardando · 1 precisa de você`;
- agrupamento por squad, permitindo vários cards sob o mesmo squad;
- cada card mostra nome curto/briefing, horário, passo, agente atual, provider e conta externa selecionada;
- clicar abre o run específico sem substituir ou misturar o outro;
- badges diferentes para `queued`, `running`, `awaiting_auth`, `awaiting_approval`, `checkpoint` e `paused`;
- notificações sempre carregam `runId` e abrem a execução correta;
- cancelar, pausar, responder e aprovar atuam somente naquele run.

No modo visual do escritório:

- cada run possui sua própria instância lógica do mapa e do estado das cadeiras;
- o usuário seleciona qual run observar por tabs/cards;
- agentes em execução mantêm animação, atividade, streaming e terminal daquele run;
- alternar de run não desmonta nem interrompe streams dos outros;
- oferecer modo `Visão geral` com miniaturas de até 4 runs ativos;
- miniatura mostra movimento/status dos agentes, progresso e alerta de intervenção;
- para mais de 4, usar lista virtualizada em vez de renderizar todos os mapas completos;
- destacar quando o mesmo agente lógico trabalha em dois runs, mas manter processos, status e outputs separados.

Eventos ao vivo devem incluir sempre:

```ts
type RunLiveEvent = {
	runId: string;
	squadId: string;
	seatId?: string;
	agentId?: string;
	kind: string;
	sequence: number;
	createdAt: string;
};
```

`sequence` permite descartar eventos atrasados/duplicados e reconstruir o movimento correto após alternar de tela.
Enquanto o runtime permanecer local ao Electron, usar store + SSE atual por run. Para acompanhar em outro dispositivo
no futuro, persistir/propagar esses eventos pelo backend via SSE ou WebSocket.

Configuração:

- permitir reduzir/aumentar limite com faixa segura;
- avisar que reduzir o limite não mata runs atuais; afeta somente próximos inícios;
- permitir nomear cada execução no início, com fallback derivado do briefing.

### 4.7 Testes e aceite

- dois runs do mesmo squad escrevem `output/result.md` simultaneamente e cada um recebe seu próprio conteúdo;
- reset de um run não remove arquivos de outro;
- `.mcp.json` e secrets injetados não cruzam entre runs;
- cancelar A não aborta B;
- snapshot/ZIP de A nunca contém arquivo de B;
- dois runs do mesmo squad ocupam os dois slots e avançam simultaneamente;
- terceiro run fica `queued` quando o limite é 2;
- encerrar um run libera exatamente um slot;
- A pode aguardar checkpoint enquanto B continua;
- A pode aguardar OAuth enquanto B continua;
- duas execuções do mesmo squad podem usar contas diferentes da mesma integração;
- tabs/miniaturas mostram movimento e agente atual corretos para cada `runId`;
- alternar rapidamente entre runs não mistura streaming, terminal ou eventos;
- reiniciar o Electron marca ou recupera runs interrompidos de forma coerente;
- testes de carga com 2 CLIs e monitoramento de CPU/memória no Windows instalado.

Arquivos prováveis:

- `apps/web/src/features/security/orchestrator-shared/runtime/orchestrator-runtime.ts`;
- `apps/web/src/features/security/orchestrator-shared/runtime/runner-controllers.ts`;
- `apps/web/src/features/security/orchestrator-shared/model/use-orchestrator-runtime-store.ts`;
- `apps/web/src/features/security/orchestrator-shared/runtime/model-client.ts`;
- `apps/web/electron/runner/runner.ts`;
- `apps/web/electron/runner/server.ts`;
- componentes de sidebar, lista de squads, dialog e histórico.

---

## 5. Ordem recomendada de implementação

### Etapa 0 — testes de regressão do run enviado

- transformar o run em fixture;
- cobrir o bug de `REVIEW_CHANGES owner=Copywriter`;
- melhorar a exportação com identidade do agente.

### Etapa 1 — identidade e workspace por run

- introduzir `executionId`;
- migrar runtime, cancelamento, checkpoints e diálogo de `squadId` para `runId`;
- isolar workspace, scripts, MCP, preview e snapshot;
- manter apenas um run global durante a migração.

### Etapa 2 — download individual e ZIP

- implementar APIs seguras sobre o snapshot isolado;
- adicionar diálogo nativo do Windows;
- entregar botões no preview/histórico.

### Etapa 3 — correção de roteamento

- contrato estruturado do Reviewer;
- guardrail de owner;
- contexto correto e limite de revisões;
- atualizar o squad Carrossel Instagram.

### Etapa 4 — paralelismo controlado

- fila e limite global 2;
- permitir duas execuções simultâneas do mesmo squad;
- adicionar central, tabs e miniaturas dos runs em movimento;
- observabilidade e cancelamento por run.

### Etapa 5 — autenticações genéricas N:N

- criar `AuthConnection`, requisitos de auth por tool e bindings de agente;
- permitir várias contas por connector;
- adicionar escolha padrão e override por run;
- garantir que compartilhamento de squad nunca transporte connections do proprietário.

### Etapa 6 — Auth Flow Manager e MCP OAuth

- endpoints/IPC de fluxo HTTPS no Electron;
- estados `awaiting_auth`, autorização, cancelamento e retomada;
- integrar `OAuthClientProvider` para MCP remoto HTTP;
- manter injeção segura para MCP local stdio e tools HTTP.

### Etapa 7 — Instagram OAuth

- cadastrar App ID/Secret uma única vez na configuração administrativa, sem pedi-los em toda conexão;
- validar redirect URI com o Meta App real no Electron instalado e fixar `loopback` ou `https_relay`;
- fazer `Conectar Instagram` abrir o navegador do computador e concluir/cancelar/reconectar sem colar token;
- solicitar `instagram_business_basic instagram_business_content_publish`;
- trocar token curto por longo e manter renovação;
- descobrir automaticamente `id`, `username`, tipo da conta e scopes;
- salvar a conta como `AuthConnection` e provar duas contas Instagram simultâneas no mesmo usuário;
- adicionar teste de conexão real e estados expired/revoked/error.

### Etapa 8 — publicação Instagram

- substituir token/user ID manual pelo binding `instagram_account` escolhido no agente/run;
- remover os placeholders manuais do template do Publisher;
- injetar token válido + accountExternalId somente no processo MCP local;
- `dryRun`, checkpoint, idempotência e auditoria;
- mostrar `@conta` e preview na aprovação antes de publicar;
- testar em conta de teste antes de produção.

### Etapa 9 — escala do paralelismo

- aumentar limites além de 2 com guardrails;
- configuração por squad/provider/conexão e recuperação completa após restart.

## 6. Critérios globais de pronto

- nenhum arquivo de run depende da workspace global compartilhada;
- download individual e ZIP funcionam no app Electron instalado no Windows;
- o run de regressão envia a revisão ao owner correto sem repetir Researcher/Slider indevidamente;
- o histórico informa qual agente executou cada passo e por quê;
- duas execuções do mesmo squad rodam e aparecem em movimento simultaneamente, sem colisão de arquivos ou estado;
- vários agentes podem referenciar a mesma conexão e um agente pode selecionar contas diferentes por tool;
- várias contas do mesmo conector coexistem e podem ser sobrescritas por run;
- um fluxo HTTPS pendente pausa somente o run interessado e pode ser aberto/cancelado pelo Electron;
- MCP remoto usa OAuth nativo quando disponível; MCP stdio usa bindings do Workestrator;
- Instagram conecta pelo navegador e identifica a conta sem token/user id manual;
- publicação exige aprovação humana, não duplica no retry e salva o media ID;
- tokens e secrets não aparecem em prompts, logs, exports ou downloads;
- build, lint e testes web/API passam antes do release.
