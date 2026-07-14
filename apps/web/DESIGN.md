---
name: Workestrator Design System
description: Sistema visual do Workestrator, um console para coordenar squads de agentes de IA de multiplos provedores, com estetica clara e calma inspirada em ferramentas de agente como o Claude Code.
colors:
  layout: "#F0EEE7"
  background: "#FAF9F5"
  foreground: "#26251F"
  card: "#FFFFFF"
  card-foreground: "#26251F"
  primary: "#C96442"
  primary-foreground: "#FFFFFF"
  secondary: "#EFEDE4"
  secondary-foreground: "#3A3833"
  muted: "#F2F0E9"
  muted-foreground: "#6B6862"
  accent: "#F5E9E2"
  accent-foreground: "#8A4A31"
  border: "#E5E2D8"
  input: "#FFFFFF"
  input-border: "#DAD6CA"
  ring: "#C96442"
  destructive: "#C0392B"
  destructive-foreground: "#FFFFFF"
  success: "#4F7A52"
  success-foreground: "#FFFFFF"
  warning: "#B8792A"
  warning-foreground: "#FFFFFF"
  chart-1: "#C96442"
  chart-2: "#4F7A52"
  chart-3: "#B8792A"
  chart-4: "#5B7C99"
  chart-5: "#3A3833"
  sidebar: "#F0EEE7"
  sidebar-foreground: "#3A3833"
  sidebar-primary: "#C96442"
  sidebar-primary-foreground: "#FFFFFF"
  sidebar-accent: "#E7E4DA"
  sidebar-accent-foreground: "#26251F"
  sidebar-border: "#E1DDD2"
  sidebar-ring: "#C96442"
darkColors:
  layout: "#1F1E1B"
  background: "#262624"
  foreground: "#EDEBE3"
  card: "#2F2E2B"
  card-foreground: "#EDEBE3"
  primary: "#D97757"
  primary-foreground: "#2B1710"
  secondary: "#35332F"
  secondary-foreground: "#DEDBD1"
  muted: "#2F2E2B"
  muted-foreground: "#A39F94"
  accent: "#3A2E28"
  accent-foreground: "#E9C3B2"
  border: "#3A3833"
  input: "#2F2E2B"
  input-border: "#494740"
  ring: "#D97757"
  destructive: "#E07A6B"
  destructive-foreground: "#2B0F0B"
  success: "#7FA982"
  success-foreground: "#0F1E10"
  warning: "#D9A441"
  warning-foreground: "#2A1E08"
  chart-1: "#D97757"
  chart-2: "#7FA982"
  chart-3: "#D9A441"
  chart-4: "#88A6C2"
  chart-5: "#DEDBD1"
  sidebar: "#1F1E1B"
  sidebar-foreground: "#C9C5BA"
  sidebar-primary: "#D97757"
  sidebar-primary-foreground: "#2B1710"
  sidebar-accent: "#2F2E2B"
  sidebar-accent-foreground: "#EDEBE3"
  sidebar-border: "#33322E"
  sidebar-ring: "#D97757"
typography:
  font-family-sans: '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  font-family-mono: '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace'
  font-size-display: "clamp(2rem, 4vw, 3.25rem)"
  font-size-heading: "clamp(1.5rem, 2.4vw, 2.25rem)"
  font-size-title: "1rem"
  font-size-body: "0.875rem"
  font-size-caption: "0.75rem"
  line-height-display: "1.08"
  line-height-heading: "1.16"
  line-height-title: "1.35"
  line-height-body: "1.5"
  line-height-caption: "1.35"
  font-weight-display: "700"
  font-weight-heading: "650"
  font-weight-title: "600"
  font-weight-body: "400"
  font-weight-caption: "600"
radii:
  base: "0.625rem"
  sm: "0.375rem"
  md: "0.625rem"
  lg: "0.875rem"
  xl: "1rem"
  full: "9999px"
components:
  app-sidebar:
    token: "sidebar"
    usage: "Sidebar persistente clara com navegacao principal (Squads, Agents, Integracoes, Execucoes, Ajustes) e squads recentes. Colapsavel."
  workspace-tabs:
    token: "background"
    usage: "Tabs de contexto por squad: Run, Fluxo, Agents, Escritorio e Historico. Sempre visiveis no header da area de trabalho."
  agent-thread:
    token: "background"
    usage: "Area central de trabalho: stream de conversa/output por agente, com respiro e leitura confortavel. Outputs e logs em fonte mono."
  integration-card:
    token: "card"
    usage: "Card de integracao de IA (provedor + modelo + status da conexao). Integracao e conceito de primeira classe."
  status-pill:
    token: "accent"
    usage: "Estado de agent, passo ou run. Sempre combinar cor com texto/icone."
  office-view:
    token: "layout"
    usage: "Visualizacao espacial opcional do squad (aba Escritorio). Canvas calmo com os mesmos tokens do console: agents como nodes/cards limpos, conexoes sutis, status por pill. Sem pixel-art."
---

# Workestrator Design System

## Visual Direction

O Workestrator deve parecer uma ferramenta de trabalho para coordenar agentes — a mesma familia mental do Claude Code — porem para coordenar varias IAs. A experiencia central e um console: sidebar persistente, area de trabalho focada em conteudo e tabs de contexto.

O visual e claro, calmo e quente. Superficies off-white, bordas sutis, sombra minima, muito respiro e tipografia legivel. Nao e um dashboard corporativo denso, nao e um terminal escuro de neon e nao e uma landing. O conteudo (output do agente) e o protagonista.

## Product Surfaces

- **Sidebar**: navegacao persistente entre as areas do produto, squads recentes e acao de novo squad.
- **Squads**: lista/entrada principal; cada squad abre na area de trabalho com suas tabs.
- **Run (tab)**: stream da execucao, output por agente, decisoes bloqueantes e checkpoints.
- **Fluxo (tab)**: pipeline entre agents (quem chama quem, ordem, dependencias).
- **Agents (tab)**: agents do squad com provedor, modelo, papel e ferramentas.
- **Integracoes**: provedores de IA conectados (Claude, GPT, Gemini, locais), com status.
- **Escritorio (tab, opcional)**: visualizacao 2D ludica do squad; secundaria, nunca o centro.
- **Design system**: referencia tecnica dos componentes reais usados pelo produto.

## Palette

A paleta e quente e calma, inspirada em ferramentas de agente claras:

- Off-white/paper (`background`, `layout`) para canvas e sidebar — nada de branco puro frio nem preto de terminal.
- Coral/terracota (`primary`) para acao principal, item ativo e execucao — usado com moderacao.
- Verde sage (`success`) para passos concluidos.
- Ambar (`warning`) para checkpoints e pendencias.
- Vermelho (`destructive`) para erro, abortar, falha ou remocao.
- Azul acinzentado e slate quente aparecem em graficos, avatars e diferenciacao de agents/provedores.

Nao usar gradientes decorativos, fundos frios, sidebar preta de neon ou paginas promocionais genericas. Um unico acento (coral) domina; o resto e neutro quente. Isso vale tambem para o escritorio: ele usa a mesma paleta calma, sem pixel-art nem cores de jogo.

## Typography

Use `Typography` para todo texto de conteudo. Titulos devem ser claros e orientados a acao: "Squads", "Agents", "Integracoes", "Execucoes", "Fluxo", "Checkpoint". Evite frases de marketing abstratas.

Outputs de agente, logs, comandos e trechos de codigo usam a fonte monoespacada (`font-family-mono`) para reforcar a sensacao de ambiente de agente. Textos operacionais devem ser curtos e honestos: "Integracoes sao simuladas nesta versao client-side."

## Layout

O console segue tres zonas fixas:

- **Sidebar** persistente a esquerda (clara, colapsavel) com as areas do produto e squads recentes.
- **Header de contexto** com o squad ativo, status e as tabs (`Run`, `Fluxo`, `Agents`, `Escritorio`, `Historico`).
- **Area de trabalho** central e ampla, focada no conteudo do agente ativo, com respiro generoso.

A primeira experiencia deve levar direto ao console/squads, nunca a uma landing. Estados vazios apresentam a proxima acao clara (criar squad, conectar integracao, adicionar agent).

## Office View

O escritorio deixa de ser o centro e vira uma **visualizacao espacial opcional** do squad, acessivel por uma tab. Ele preserva o valor de "ver o squad trabalhando", mas mantem a mesma estetica profissional e calma do console — nao e um jogo.

Direcao visual:

- canvas com a superficie quente e neutra do produto (`layout`/`background`), nao um cenario de jogo;
- cada agent e um **node/card limpo** com avatar, nome, provedor/modelo e status pill — a mesma linguagem dos cards do console;
- o fluxo entre agents aparece como **conexoes sutis** (linhas finas em `border`, ativa em `primary`), nao setas decorativas;
- posicao e agrupamento comunicam a estrutura do squad; layout espacado, com respiro, sem clutter.

Regras da view:

- deve refletir o estado real do squad (assento vazio, agent trabalhando, checkpoint, concluido, falha) via texto + icone + cor;
- usa exclusivamente os tokens do design system — nada de pixel-art, sprites ou paleta paralela;
- lifecycle do canvas/engine fica isolado da UI React;
- toda acao possivel no canvas tem equivalente acessivel fora dele.

## Components

Use os componentes locais existentes antes de criar novos primitivos. Novos componentes reutilizaveis precisam ter pasta propria, `index.ts`, story e export pelo barrel quando fizer sentido.

Priorize:

- `Sidebar` para a navegacao persistente do console;
- `Tabs` para o contexto do squad (Run, Fluxo, Agents, Escritorio, Historico);
- `Card` para squads, agents e integracoes;
- `Badge` ou status pill para estados;
- `AppSheet` ou `Dialog` para configuracao de agent/integracao e checkpoints;
- `FieldWrapper`, React Hook Form e Zod para formularios.

## States

Estados sao parte central do produto:

- `idle`: neutro, pronto para executar;
- `working`: coral/primary, em progresso;
- `done`: verde sage, finalizado;
- `checkpoint`: ambar, aguardando decisao;
- `failed`: vermelho, erro;
- `aborted`: vermelho discreto ou slate quente, execucao interrompida.

Sempre combinar cor com texto, icone ou label.
