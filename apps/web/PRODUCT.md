# Product

## Register

Workestrator

## Users

Pessoas que trabalham com agentes de IA, automacoes e fluxos de producao assistida. O usuario quer montar squads de agentes de diferentes provedores (Claude, GPT, Gemini, modelos locais), definir papeis, encadear um fluxo de trabalho, rodar execucoes e acompanhar claramente o que cada agente esta produzindo.

O produto atende principalmente operadores tecnicos, criadores de workflows, desenvolvedores e times pequenos que precisam orquestrar varias IAs em conjunto — sem depender de uma unica ferramenta ou provedor.

## Product Purpose

Workestrator e um console para criar, organizar e executar squads de agentes de IA de multiplos provedores. A referencia mental e uma ferramenta de agente como o Claude Code, porem para coordenar varias integracoes de IA ao mesmo tempo: cada agente e amarrado a um provedor/modelo e a um conjunto de ferramentas, e o usuario encadeia esses agentes em um fluxo.

A experiencia principal e um console de trabalho, nao um jogo e nao uma landing:

- **sidebar persistente** a esquerda com as areas do produto (Squads, Agents, Integracoes, Execucoes, Ajustes) e squads recentes;
- **area central de trabalho** clara e espacosa, focada no conteudo (conversa/output do agente ativo);
- **tabs por squad** para alternar contexto: `Run`, `Fluxo`, `Agents`, `Escritorio` e `Historico`.

Nesta fase, tudo roda no navegador com persistencia em `localStorage`. As integracoes de IA, ferramentas e runners sao simulados para validar modelo mental, experiencia de uso e arquitetura da feature antes da conexao com provedores e um backend real.

Sucesso significa que o usuario consegue:

- conectar/registrar integracoes de IA (mesmo que mockadas);
- criar uma biblioteca de agents, cada um com provedor, modelo, papel e ferramentas;
- montar varios squads e encadear um fluxo entre os agents;
- rodar uma execucao e acompanhar, em stream, o output por agente;
- entender quem esta trabalhando, quem concluiu e onde existe checkpoint;
- retomar o historico de execucoes.

## Brand Personality

Calmo, tecnico e util — a personalidade de uma ferramenta de trabalho de agente, na linha do Claude Code, e nao de um dashboard corporativo ou de um jogo.

A interface e clara, com muito respiro, tipografia legivel e foco no conteudo. Ela nao grita: as acoes principais sao evidentes, o texto conduz e o status e sempre legivel. Elementos operacionais (outputs, logs, comandos) usam fonte monoespacada para reforcar a sensacao de ambiente de agente.

A voz do produto e direta, brasileira e honesta. Evita jargoes vagos de IA e explica limites reais quando necessario — como o fato de as integracoes e execucoes serem simuladas nesta versao client-side.

## Anti-references

- **Template React generico**: a UI nao deve falar como boilerplate, starter kit ou base neutra.
- **Dashboard corporativo pesado**: evitar excesso de cards, sombras fortes, bordas grossas, gradientes gratuitos e paineis lotados sem hierarquia.
- **Landing SaaS abstrata**: evitar herois grandiosos, metrics decorativas, grids de beneficios e textos de marketing que nao mostram o produto.
- **Console escuro "hacker"**: apesar de ser uma ferramenta tecnica, o padrao e claro e calmo — nao um terminal preto de neon.
- **Jogo acima da ferramenta**: o escritorio e uma visualizacao espacial opcional, com a mesma estetica limpa do console (sem pixel-art ou cara de jogo), e nunca deve transformar operacoes criticas em interface confusa.

## Design Principles

- **Console, nao jogo**: a experiencia central e uma ferramenta de trabalho de agente — sidebar, area de trabalho e tabs. O escritorio 2D e uma visao opcional do squad, nao o centro.
- **Multiplas IAs sao o diferencial**: sempre deixar claro qual provedor/modelo cada agente usa. Integracao e um conceito de primeira classe.
- **Conteudo em primeiro lugar**: a area central prioriza o output do agente (conversa, texto, logs) com respiro e leitura confortavel, como uma sessao de agente.
- **O squad da o contexto**: a UI deixa claro qual squad esta ativo, quais agents participam e qual passo esta rodando.
- **Estados sao produto**: `idle`, `working`, `done`, `checkpoint`, `failed` e `aborted` precisam ser legiveis por texto, icone e cor.
- **Simulado, mas honesto**: quando algo for mockado (integracao, runner, timer), a interface comunica o limite sem parecer erro.
- **Escala por slices**: cada dominio vive em `src/features/security/orchestrator`, mantendo tipos, store, componentes, runner e paginas proximos.
- **Controle sem ruido**: a UI tem personalidade calma, mas acoes principais, tabelas, formularios e dialogos continuam previsiveis.

## Accessibility & Inclusion

Meta WCAG 2.1 AA. Nao depender apenas de cor para status; usar texto, icones e labels. A visualizacao de escritorio deve ter alternativa acessivel fora do canvas. Foco visivel, navegacao por teclado e contraste adequado sao obrigatorios em sidebar, tabs, botoes, formularios, listas e overlays.
