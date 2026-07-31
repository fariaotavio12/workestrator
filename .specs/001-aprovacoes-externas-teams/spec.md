# 001 — Notificação externa de checkpoint + aprovador delegado

Status: 📝 especificado · Canal do v1: n8n entregando no Microsoft Teams · **A decisão continua sendo tomada
dentro do Workestrator** (ver [Fronteira do sistema](#fronteira-do-sistema)) · **Quem pode decidir é sempre
configuração do dono do squad** (ver [Aprovador delegado](#aprovador-delegado))

## Problema

Um squad pausa quando um agente exige aprovação humana (antes ou depois de agir). Hoje essa pausa só é
percebida e resolvida por quem é **dono do squad e está com o app aberto**. Consequências:

1. **O run fica parado sem ninguém saber.** Um squad que roda por agendamento às 6h da manhã e para num
   checkpoint às 6h02 desperdiça o dia inteiro. A notificação do SO só existe na máquina, e só enquanto
   alguém estiver olhando para ela.
2. **Quem decide não é sempre quem monta o squad.** Um gestor, um cliente, um responsável de compliance pode
   precisar aprovar sem ser dono de nada no Workestrator — hoje isso é literalmente impossível: toda consulta
   é escopada por `userId` do dono, sem exceção.
3. **Reprovar não deixa rastro.** Aborta o run e escreve uma linha de log. Não fica registrado **quem**
   reprovou, **quando** nem **por quê**.

## Objetivo

Avisar a pessoa responsável onde ela já está — no Teams — no momento em que um checkpoint abre, e permitir
que ela decida com a própria conta do Workestrator, **mesmo não sendo dona do squad**, sem herdar acesso a
mais nada além daquela decisão. O envio do aviso é feito por um fluxo do n8n; o Workestrator dispara o aviso
e resolve a decisão, venha ela de onde vier.

## Fronteira do sistema

O n8n é **mensageiro, não decisor**. Quem decide sempre usa uma conta do Workestrator — dono ou aprovador
delegado. Não existe decisão anônima nem decisão de dentro do próprio Teams.

```txt
apps/web ──► apps/api ──POST webhook──► fluxo n8n ──► Teams (pessoa específica)
   ▲            │                       (fora deste repo)
   │            │
   │            └── a decisão é sempre um POST autenticado no Workestrator,
   │                por quem o dono autorizou
   └── o cliente que roda o run descobre a decisão (a sua própria, ou a de outra sessão) e continua
```

Consequências que valem para toda a spec:

- **A API não expõe nenhuma rota pública.** Não há callback de terceiro, não há assinatura de entrada, não
  há endpoint para a Microsoft. A única saída é o `POST` no webhook do n8n; toda entrada de decisão passa
  pela autenticação normal do Workestrator.
- **Nada de Azure.** Sem Azure Bot, sem bot registrado, sem Adaptive Card interativo. A mensagem no Teams é
  texto com um link — quem clica entra no Workestrator (login se precisar) para decidir.
- **Quem conhece o contato no Teams é o n8n**; quem tem **permissão para decidir** é modelado aqui, porque
  isso é autorização, não entrega de mensagem.

## Aprovador delegado

Um usuário do Workestrator pode decidir o checkpoint de um squad que não é dele — **e tudo sobre isso é
configuração do dono do squad**, nunca padrão implícito do sistema.

### O pool

O dono monta um **pool de aprovadores** do squad: convida, por e-mail, contas **já existentes** no
Workestrator. Não há convite para quem ainda não tem conta; e-mail sem conta correspondente falha com erro
claro. Só o dono gerencia o pool — nenhum aprovador se auto-adiciona nem convida outro.

### A configuração, por agente

Para cada agente com checkpoint, o dono decide:

| Configuração | Opções | Default | Efeito |
|---|---|---|---|
| **Quem mais pode decidir** | subconjunto do pool do squad | vazio | quem está aqui pode aprovar/reprovar os checkpoints daquele agente |
| **O dono também decide** | sim / não | **sim** | `não` retira o próprio dono da decisão — segregação de função |
| **Avisar externamente** | ligado / desligado + conexão | desligado | dispara o aviso no Teams via n8n |

Combinações que isso permite, todas legítimas:

- **vazio + dono decide** (default) — exatamente o comportamento de hoje. Nenhum squad existente muda.
- **aprovadores + dono decide** — qualquer um dos dois resolve; o primeiro que decidir vence.
- **aprovadores + dono NÃO decide** — o dono monta o squad mas não aprova o próprio trabalho. É o caso de
  compliance, e o motivo pelo qual essa configuração existe.
- **aprovadores sem aviso externo** — o aprovador descobre pela própria lista de pendências, sem Teams.
- **aviso externo sem aprovadores** — aviso puramente informativo; só o dono decide.

Os dois eixos — **notificar** e **autorizar** — são independentes de propósito. Avisar alguém não dá a essa
pessoa poder de decisão, e dar poder de decisão não obriga a mandar aviso.

### Garantias que não são configuráveis

- **Um aprovador delegado nunca ganha acesso ao squad**, a outros runs ou a checkpoints que não foram
  atribuídos a ele. Ele decide por uma tela dedicada que mostra só o resumo daquela decisão.
- **O dono sempre pode abortar o run**, mesmo tendo se retirado da decisão. Retirar-se remove o poder de
  **aprovar**, não o de parar a própria execução — é o que impede que um squad fique preso para sempre se o
  aprovador ficar indisponível.
- **A primeira decisão vence**, seja de quem for.
- **Uma configuração que ninguém pode satisfazer é rejeitada**: não é possível retirar o dono da decisão sem
  ter pelo menos um aprovador atribuído.

## Não-objetivos

- **Decisão sem conta no Workestrator.** Todo aprovador precisa de login. Um aprovador anônimo (decide só com
  um link) fica fora — traria de volta token público, expiração e identidade não-verificada.
- **Decidir de dentro do próprio Teams** (botão no cartão). Exigiria bot registrado no Azure.
- **Quórum e dupla confirmação.** "O aprovador aprova e depois o dono confirma" é quórum de dois, e está
  fora: a primeira decisão vence, sempre. Se isso virar necessidade, é spec nova.
- **Delegação de delegação.** Um aprovador não repassa a permissão a outro.
- **Escalonamento por SLA.**
- **Edição do squad pelo aprovador.** Ele decide checkpoints atribuídos; não edita agentes, não vê scripts,
  não vê segredos, não vê outros runs.
- **Rodar o squad sem nenhum cliente aberto.** O motor de execução vive num cliente (do dono); ver a
  limitação abaixo.
- **O fluxo do n8n.** Fora deste repositório — mas há um [workflow pronto](n8n-workflow.md).

## Limitação estrutural aceita

O orquestrador roda no **cliente do dono do squad** (renderer do Electron / aba do navegador dele), não no
servidor. O run só está vivo enquanto **esse** cliente está aberto — mesmo que o aprovador decida de outro
lugar, é o cliente do dono que precisa estar de pé para o run continuar.

Isso significa: o aprovador pode decidir a qualquer momento, de qualquer dispositivo — mas se o cliente do
dono estiver fechado quando a decisão acontecer, ela fica registrada e **só se aplica quando esse cliente for
reaberto e o run retomado** (`resumeRun`, comportamento que já existe). Decisão às 3h da manhã com o run
terminando sozinho às 3h05 continua fora do v1.

## Personas

| Persona | O que faz | Tem conta Workestrator? | Acesso ao squad |
|---|---|---|---|
| **Dono do squad** | configura squad, agentes, pool, quem decide e política de aviso | sim | total |
| **Aprovador delegado** | recebe o aviso, entra com a própria conta e decide | **sim, conta própria — diferente da do dono** | só a aprovação atribuída |
| **Auditor** | vê no histórico quem decidiu o quê, quando e por quê | sim (leitura) | do dono |

## Requisitos funcionais

**Pool e configuração (tudo do dono)**

- **RF1** — O dono convida, por e-mail, uma conta existente do Workestrator para o pool de aprovadores do
  squad. E-mail sem conta correspondente → erro claro, sem criar nada. O dono pode remover um aprovador do
  pool a qualquer momento.
- **RF2** — Por agente com checkpoint, o dono atribui um subconjunto do pool como aprovadores daquele agente.
  Vazio (default) = só o dono decide — nenhum agente existente muda de comportamento.
- **RF3** — Por agente, o dono escolhe se **ele próprio** pode decidir (default: sim). Desligar isso exige ao
  menos um aprovador atribuído; a configuração é rejeitada com mensagem clara se ficaria insatisfazível.
- **RF4** — Remover do pool o último aprovador de um agente configurado como "dono não decide" é bloqueado
  com mensagem clara, porque deixaria aquele agente sem ninguém apto a aprovar.

**Notificação**

- **RF5** — O dono cadastra uma conexão de notificação com a URL do webhook do n8n e, opcionalmente, um
  segredo de autenticação. Guardados cifrados; nunca voltam em texto puro para o cliente, e a URL nunca é
  exposta ao renderer.
- **RF6** — Botão de teste dispara um aviso de exemplo e mostra o resultado (entregue / erro, com o motivo).
- **RF7** — Por agente, o dono liga ou desliga o aviso externo e escolhe a conexão. Default: desligado.
  Independente da configuração de quem decide.
- **RF8** — Ao entrar em checkpoint, o Workestrator registra o pedido e, se o aviso estiver ligado, dispara
  o envio pela conexão configurada. O envio é assíncrono e best-effort — falha **não** afeta o run.
- **RF9** — O aviso contém: nome do squad, qual agente vai agir (ou agiu), se é antes ou depois de agir, um
  resumo do que está sendo decidido e um **link para a tela de decisão** dentro do Workestrator. O mesmo
  link serve para o dono e para qualquer aprovador atribuído.
- **RF10** — O painel do checkpoint (visão do dono) mostra que o aviso foi enviado, por qual conexão e
  quando — ou o erro, se falhou, com a opção de reenviar. Mostra também quem está apto a decidir.

**Decisão**

- **RF11** — A tela de decisão exige login no Workestrator. Mostra o resumo do checkpoint (mesmo conteúdo do
  aviso) e os controles de aprovar/reprovar — nunca a configuração do squad, outros runs ou outros
  checkpoints.
- **RF12** — Só decide quem a configuração do dono autorizou: um aprovador atribuído àquele agente, ou o
  dono **quando ele não se retirou da decisão**. Qualquer outro usuário autenticado é bloqueado.
- **RF13** — Reprovar **exige** justificativa. Aprovar é uma ação de um clique.
- **RF14** — A primeira decisão vence, não importa a origem. Uma segunda tentativa mostra quem já decidiu e
  não altera o run.
- **RF15** — O dono pode abortar o run a qualquer momento, mesmo tendo se retirado da decisão. Abortar não é
  reprovar: encerra a execução e não gera justificativa de reprovação para a
  [002](../002-treinamento-pos-reprovacao/spec.md).
- **RF16** — Um aprovador logado vê uma lista própria das **aprovações atribuídas a ele que ainda estão
  pendentes** — não pode depender de o aviso externo ter chegado.
- **RF17** — Decidido em qualquer lugar, o cliente do dono que está rodando o run descobre a decisão e
  continua (ou aborta) automaticamente, com ou sem o painel do checkpoint aberto na tela.

**Registro**

- **RF18** — Cada pedido guarda: run, passo, agente, se houve aviso e por qual conexão, **a configuração de
  autorização vigente quando o checkpoint abriu**, quem decidiu de fato (e se era o dono ou um aprovador),
  quando, resultado e a justificativa da reprovação.
- **RF19** — O histórico do run mostra essa trilha junto com os passos, na ordem em que aconteceu.
- **RF20** — A justificativa da reprovação é entregue à feature
  [002](../002-treinamento-pos-reprovacao/spec.md) como entrada do treinamento.

## Requisitos não funcionais

- **Isolamento estrito do aprovador.** Ele nunca alcança rota de squad, agente, script, segredo ou run que
  não seja pela tela dedicada de uma aprovação atribuída a ele.
- **Autorização imutável por pedido.** A configuração vigente no momento em que o checkpoint abre é a que
  vale para aquele pedido até o fim. Mudar a configuração depois afeta os próximos checkpoints, não os
  pendentes — a regra não muda no meio do caminho.
- **Pool e configuração só editáveis pelo dono.**
- **Confidencialidade.** O payload que sai para o n8n carrega resumo, nunca artefato completo, nunca valor
  de segredo. O que interessa fica atrás do login, na tela de decisão.
- **Segredo só no servidor.** URL do webhook e segredo de autenticação vivem no backend.
- **Nunca bloqueia o run.** Envio de aviso fora do caminho crítico, com timeout curto.
- **Payload versionado.**

## Critérios de aceite

1. Convidar um e-mail sem conta correspondente falha com mensagem clara; e-mail de conta existente entra no
   pool.
2. Atribuir um aprovador do pool a um agente: ao chegar no checkpoint desse agente, o aviso é disparado e a
   tela de decisão fica acessível ao dono e ao aprovador atribuído.
3. Um usuário autenticado que não é dono nem está atribuído àquele checkpoint é bloqueado na tela de decisão.
4. O aprovador aprova pela própria conta: o run do dono (com o cliente aberto) segue em até 30s, sem o dono
   fazer nada.
5. O aprovador reprova sem justificativa: bloqueado. Com justificativa: o run aborta e a justificativa
   aparece no histórico.
6. Dono e aprovador decidindo quase ao mesmo tempo: o segundo recebe "já decidido por «nome»", e o run
   executa exatamente uma decisão.
7. **Agente com "dono não decide": o próprio dono é bloqueado na tela de decisão**, com mensagem explicando
   que ele se retirou da decisão daquele agente — e o aprovador atribuído decide normalmente.
8. **Tentar desligar "o dono também decide" sem nenhum aprovador atribuído é rejeitado** com mensagem clara.
9. **Remover do pool o último aprovador de um agente com "dono não decide" é bloqueado** com mensagem clara.
10. **O dono aborta o run de um agente onde ele não pode aprovar** — funciona, e o histórico registra
    aborto, não reprovação.
11. Mudar a configuração de autorização com um checkpoint já pendente **não** altera quem pode decidir aquele
    pedido; o próximo checkpoint já usa a configuração nova.
12. Agente sem aprovadores atribuídos (default) se comporta exatamente como hoje — só o dono decide.
13. n8n fora do ar no momento do checkpoint: o run não é afetado; o painel mostra "falha ao notificar" com
    opção de reenviar; a decisão segue possível pela tela, inclusive por quem descobrir pela lista
    "atribuídas a mim".
14. Nenhum valor de segredo, token ou artefato completo aparece no payload enviado ao n8n nem na tela do
    aprovador.
15. A URL do webhook e o segredo de autenticação nunca chegam ao cliente.
16. O aprovador, logado, não consegue abrir nenhuma rota do squad — só a tela de decisão da aprovação
    atribuída a ele.

## Extensão natural (não é requisito)

O encanamento é genérico: um checkpoint é só um evento, e "quem pode decidir" é só uma política. Os mesmos
mecanismos servem para `awaiting_input` (pergunta de um agente), para squads com mais de um dono, e para
outros canais de aviso (WhatsApp, e-mail). Ligar isso depois é configuração e reuso do mesmo modelo, não
desenho novo.
