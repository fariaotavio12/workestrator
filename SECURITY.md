# Política de Segurança

## Reportando uma vulnerabilidade

**Não abra uma issue pública para vulnerabilidades de segurança.**

Reporte de forma privada por e-mail para **fariaotavio30@gmail.com** com o assunto começando por `[SECURITY]`. Se preferir, use o canal privado de [Security Advisories do GitHub](https://github.com/fariaotavio12/workestrator/security/advisories/new).

Inclua, se possível:

- Uma descrição da falha e do impacto.
- Passos para reproduzir (ou um proof-of-concept).
- Versão/commit afetado.

Você receberá uma confirmação de recebimento e será mantido informado sobre a correção antes de qualquer divulgação pública.

## Modelo de ameaça — leia antes de usar

O Workestrator é uma ferramenta de orquestração que **executa código na sua máquina**. Isso é intencional e é o que a torna útil, mas tem implicações de segurança:

- O runner (app Electron / middleware de dev) faz `spawn()` de binários locais (`claude`, `codex`, `gpt`) e executa **scripts** (comando, inline, arquivo) numa pasta de trabalho escopada.
- Quando um agente tem `canExecute` habilitado, o runner passa **flags de auto-aceite de permissões** para a CLI — ou seja, ações de arquivo/shell são executadas sem confirmação interativa.
- Não há sandbox real. O escopo é uma pasta de trabalho, não um container isolado.

Por isso:

- **Trate squads, scripts e assets importados como código não confiável.** Revise antes de rodar, especialmente com `canExecute` ligado.
- **Não rode em uma máquina com dados sensíveis** sem entender exatamente o que os agentes e scripts fazem.
- Scripts do tipo `file` leem caminhos absolutos ao vivo no disco do runner — confira o que está sendo referenciado.

## Segredos

- Nunca commite segredos. Os `.env` são gitignored; use os `.env.example` como template.
- API keys de providers **não trafegam pelo navegador** — o client usa apenas uma referência (`apiKeyRef`/`authRef`) e o valor real é resolvido no lado do runner/servidor.
- Segredos do backend são cifrados em repouso (AES-256-GCM). Não desabilite essa proteção em produção.

## Versões suportadas

O projeto está em desenvolvimento ativo e ainda não tem releases versionadas estáveis. Correções de segurança são aplicadas no branch `main`.
