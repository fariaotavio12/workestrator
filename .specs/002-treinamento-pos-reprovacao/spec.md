# 002 — Treinamento do agente após reprovação

Status: 📝 especificado · Depende de [001](../001-aprovacoes-externas-teams/spec.md) para a captura da
justificativa

## Problema

Reprovar um checkpoint hoje aborta o run e escreve `"Checkpoint rejeitado."` no log. O motivo da reprovação
existe apenas na cabeça de quem reprovou. Consequências:

1. **O erro volta.** O próximo run parte do mesmo prompt, da mesma base e do mesmo briefing — nada mudou, o
   agente repete o comportamento reprovado.
2. **A correção acontece fora do sistema.** Quem reprova acaba abrindo o agente e editando o `systemPrompt`
   na mão, sem registro do que mudou, de por que mudou, nem de qual run motivou a mudança. Depois de alguns
   ciclos, o prompt é uma pilha de regras cuja origem ninguém sabe — e ninguém tem coragem de remover.
3. **A reprovação não distingue quem errou.** O checkpoint costuma estar no fim da linha (um publicador,
   um revisor), mas o erro foi produzido três passos antes. Abortar sem apontar o responsável perde a única
   informação que tornaria a correção precisa.

## Objetivo

Transformar uma reprovação em uma correção **durável, revisada e reversível**: o ciclo reprovar → entender o
erro → corrigir o agente → refazer o passo acontece dentro do produto, com rastro de onde cada regra veio.

## Decisão: RAG + refino de prompt, não fine-tuning

Fine-tuning foi considerado e **descartado para esta feature**, pelos motivos abaixo. A decisão fica
registrada porque a pergunta vai voltar.

| Motivo | Detalhe |
|---|---|
| **Volume** | Reprovações chegam de uma em uma, dezenas por mês no melhor caso. Fine-tuning útil pede ordens de magnitude mais exemplos consistentes. |
| **Natureza do erro** | O erro típico é *instrução ou contexto ausente* ("não sabia que este cliente exige aprovação de jurídico"), não *incapacidade do modelo*. Fine-tuning não ensina fato novo de forma confiável; prompt e recuperação ensinam. |
| **Heterogeneidade de provider** | O Workestrator roda em CLIs locais já autenticadas (`claude`, `codex`, `gpt`) e endpoints OpenAI-compat. Boa parte desses caminhos simplesmente não aceita um modelo ajustado por usuário. |
| **Latência do ciclo** | Ajustar um modelo leva horas e custa dinheiro; a próxima execução do squad pode ser em 10 minutos. |
| **Reversibilidade** | Prompt e documento se revertem em um clique. Peso de modelo, não. |

O que fica no lugar: **duas alavancas complementares**.

- **Lição aprendida na base de conhecimento** (RAG, infraestrutura já existente) — bom para conhecimento
  factual e específico de domínio, recuperado só quando for relevante, sem custo fixo de contexto.
- **Ajuste do `systemPrompt`** — bom para regra de comportamento que precisa valer **sempre**, não só quando
  a busca por similaridade lembrar dela.

Um dataset exportável para fine-tuning futuro é subproduto natural do registro (`## Fases`, fase 4), não um
objetivo.

## Não-objetivos

- **Aplicar mudança sem revisão humana.** Nenhuma alteração de prompt ou base entra sozinha. Um sistema que
  se reescreve a partir de uma frase irritada às 18h é pior que o problema.
- **Aprender com runs bem-sucedidos.** Extrair boas práticas do que deu certo é outra feature.
- **Compartilhar aprendizado entre squads ou entre contas.** A lição pertence ao squad que a viveu.
- **Treinar o coordenador.** O escopo é o agente responsável pelo erro. Erro de roteamento do coordenador é
  outro problema, com outra correção.
- **Treinar a partir de erro técnico.** Falha de rede, estouro de orçamento, ferramenta indisponível não são
  erro de processo — não geram treinamento.

## Requisitos funcionais

**Captura**

- **RF1** — Reprovar exige justificativa em texto livre. Sem ela não há reprovação (e, por consequência, não
  há treinamento).
- **RF2** — Ao reprovar, é possível apontar **qual passo** produziu o erro. O default é o passo do
  checkpoint; o usuário pode escolher um passo anterior do run.
- **RF3** — Opcionalmente o usuário classifica o erro em uma lista curta e fechada (ex.: fugiu da instrução,
  informação errada, formato errado, tom errado, faltou etapa, extrapolou o escopo) e marca a gravidade.
- **RF4** — A justificativa e a classificação ficam registradas no run, visíveis no histórico, mesmo que o
  usuário decida não treinar nada.

**Diagnóstico**

- **RF5** — Após a reprovação, o usuário pode disparar o **treinamento**. É uma ação explícita, nunca
  automática.
- **RF6** — O treinamento analisa: briefing do run, o passo culpado e os passos que o alimentaram, a saída
  reprovada, a justificativa, a classificação e o `systemPrompt` atual do agente responsável.
- **RF7** — O resultado tem três partes: um **diagnóstico** curto do que aconteceu, uma **lição aprendida**
  em texto pronto para a base de conhecimento, e uma **proposta de alteração** do `systemPrompt`.
- **RF8** — Se o treinamento concluir que o erro não é do agente (briefing ambíguo, dado de entrada errado,
  falha de ferramenta), ele diz isso e **não** propõe alteração. Essa é uma saída legítima, não uma falha.

**Revisão e aplicação**

- **RF9** — O usuário vê a proposta antes de qualquer efeito: a lição em markdown editável e a alteração do
  prompt como diff lado a lado.
- **RF10** — Lição e prompt são aplicáveis de forma **independente** — uma, outra, ambas ou nenhuma.
- **RF11** — Salvar a lição a coloca numa coleção de conhecimento do squad, criada na primeira vez. Se o
  agente responsável não consultar essa coleção, o Workestrator a vincula ao agente — uma lição que nunca é
  recuperada não serve para nada.
- **RF12** — Aplicar a alteração do prompt guarda a versão anterior, com o motivo e o run de origem, e
  permite voltar atrás.
- **RF13** — O histórico de versões do prompt é visível no agente: o que mudou, quando, por qual run.

**Fechar o ciclo**

- **RF14** — Depois de aplicar, o usuário pode **refazer o passo reprovado** com o treinamento em vigor,
  sem reiniciar o run do zero.
- **RF15** — O run refeito registra que partiu de um treinamento, apontando para a reprovação de origem.

## Requisitos não funcionais

- **Prompt não incha.** A proposta **reescreve e consolida** a seção de regras, não empilha linha nova a
  cada reprovação. Crescimento acima de um limite configurado é bloqueado com aviso de que é hora de
  consolidar ou mover conhecimento para a base.
- **Lição é recuperável.** Uma lição salva precisa ser encontrada pela busca por similaridade quando o
  cenário se repetir. Isso implica escrevê-la com o vocabulário do problema, não como ata de reunião.
- **Rastreabilidade total.** Toda lição e toda versão de prompt aponta para o run e a reprovação que a
  originou. Sem isso, o prompt volta a ser a pilha inauditável de hoje.
- **Reversível.** Voltar uma versão de prompt e remover uma lição são operações de um clique, sem efeito
  colateral em outros agentes.
- **Custo visível.** O treinamento é uma chamada de modelo a mais. Ela é explícita, disparada pelo usuário,
  e não roda dentro do run.
- **Sem vazamento entre squads.** A coleção de lições é do squad. Nada de base global compartilhada.

## Critérios de aceite

1. Reprovar sem justificativa é impossível.
2. Reprovar apontando um passo anterior ao do checkpoint registra esse passo como responsável, e o
   treinamento analisa o agente daquele passo — não o do checkpoint.
3. Disparar o treinamento devolve diagnóstico, lição e diff do prompt em uma única tela.
4. Aplicar só a lição não altera o `systemPrompt`; aplicar só o prompt não cria documento na base.
5. Salvar a lição cria a coleção do squad na primeira vez, adiciona um documento por lição, e o documento
   fica pesquisável (chega a `ready` com chunks).
6. Se o agente responsável não consultava a coleção, ele passa a consultá-la depois de salvar a lição.
7. Aplicar a alteração do prompt cria uma versão nova; o histórico mostra a anterior com motivo e run de
   origem; reverter restaura exatamente o texto anterior.
8. Proposta que ultrapassa o limite de crescimento do prompt é bloqueada com mensagem explicando o motivo,
   e a lição continua aplicável.
9. Reprovação causada por falha de ferramenta/rede: o treinamento responde que não é erro do agente e não
   propõe alteração.
10. "Refazer o passo" após aplicar executa a mesma cadeira com o prompt e a base novos, e o novo run aponta
    para a reprovação de origem.
11. Nenhum valor de segredo aparece na lição gerada nem no prompt proposto.
