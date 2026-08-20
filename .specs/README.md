# .specs — Spec-Driven Development

Cada feature não-trivial ganha uma pasta `NNN-slug/` com três arquivos:

| Arquivo | Responde | Público |
|---|---|---|
| `spec.md` | **o quê** e **por quê** — problema, requisitos, critérios de aceite | produto + dev |
| `design.md` | **como** — arquitetura, modelo de dados, contratos, riscos | dev |
| `tasks.md` | **em que ordem** — checklist executável por fase, com arquivos | dev / agente |

Anexos são permitidos quando o artefato é entregável por si só e sujaria o `design.md` (um JSON importável, um
schema, um exemplo de payload longo). Nome descritivo, referenciado do `design.md` e do `tasks.md` — nunca
solto. Ex.: `001-.../n8n-workflow.md`.

Regras:

- `spec.md` não cita nome de arquivo nem classe. Se citou, o texto pertence a `design.md`.
- `design.md` cita o estado atual do código com caminho real (`apps/web/src/...`) — é o que faz a spec ser verificável meses depois.
- `tasks.md` é a única parte que muda toda hora. `[ ]` → `[x]`, sem apagar item concluído.
- Toda decisão fechada vira uma linha em `## Decisões` do `design.md`, com o motivo. Alternativa descartada fica registrada — quem lê depois precisa saber que foi considerada.
- Coisa não verificada no ambiente (build, API externa, versão de SDK) é marcada com `⚠️ a confirmar` no lugar exato. Não some do documento até ser confirmada.

Numeração é sequencial por ordem de criação, nunca reaproveitada.

## Índice

| # | Feature | Status |
|---|---|---|
| [001](001-aprovacoes-externas-teams/spec.md) | Notificação externa (n8n → Teams) + aprovador delegado — decisão sempre autenticada, pode ser outra conta | 🚧 em implementação (backend + web da fase 1 implementados e testados; falta rodar `gradlew.bat build` fora do sandbox e importar o workflow do n8n — ver `tasks.md`) |
| [002](002-treinamento-pos-reprovacao/spec.md) | Treinamento do agente após reprovação | 🚧 em implementação (fases 1–3 mergeadas em `feat/improve-squads`; falta a avaliação manual da qualidade da lição e o vínculo `retriedRunId` — ver `tasks.md`) |

Status: `📝 especificado` → `🚧 em implementação` → `✅ entregue` → `🗄️ superado por NNN`.

## Specs novas moram fora do repo

A partir da 003, spec nova nasce em `C:\Projetos\docs\Workestrator\NNN-slug\` (decisão `AD-002` em `C:\Projetos\docs\STATE.md`), com índice próprio no `README.md` de lá. A numeração é contínua com a daqui — nenhum número é reaproveitado nos dois lugares.

| # | Feature | Onde |
|---|---|---|
| 003 | Autenticação OAuth 1.0a nas ferramentas HTTP — o cofre assina cada requisição e uma API legada (Fluig/TOTVS) passa a ser chamada de dentro do run | `C:\Projetos\docs\Workestrator\003-autenticacao-oauth1-nas-ferramentas\` |

As 001 e 002 ficam aqui até fecharem: estão em implementação e são referenciadas pelos `CLAUDE.md` dos dois apps e por comentários no código.
