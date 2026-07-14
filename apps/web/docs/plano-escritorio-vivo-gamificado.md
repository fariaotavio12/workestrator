# Plano — Escritório vivo gamificado do squad

> Transformar o board estático do squad num **escritório 2.5D top-down** onde o
> coordenador e os agentes têm corpo, andam, trabalham e falam em balões,
> conduzidos pelo estado real da execução (`Runtime`). Visão única: o mesmo canvas
> serve para **configurar** o squad (sentar/editar agente) e para **assistir** ao
> run ao vivo.

---

## 1. Objetivo e decisões já tomadas

- **Substituir** o grid de cards atual ([office-canvas.tsx](../src/features/security/squad-detail/office/office-canvas.tsx))
  por um escritório espacial. Não é uma segunda tela nem um toggle — é a visão única.
- **Avatares andam de verdade**: quando o coordenador chama um agente, o avatar se
  desloca da cadeira até um "ponto de ação" central, trabalha lá e volta.
- **Zero lógica nova de execução.** O runtime já emite tudo (ver §3). Este trabalho
  é 100% camada de apresentação: ler o `Runtime` e dar corpo visual.
- Two modos derivados do `runtime.status`:
  - **Config** (`idle`): clicar cadeira vazia = sentar agente; clicar agente = editar.
  - **Ao vivo** (`running`/`checkpoint`/`awaiting_input`): entra o movimento, os balões
    e o spotlight; edição bloqueada (já existe o guard em `openSeat`, linha 147).

---

## 2. Estado atual (ponto de partida)

| Peça | Onde está | O que faz hoje |
|---|---|---|
| Board do squad | [office-canvas.tsx](../src/features/security/squad-detail/office/office-canvas.tsx) | Grid `auto-fill` de cards; **ignora `col/row`** dos seats |
| Montagem da view | [page-squad-detail.tsx:79-104](../src/features/security/squad-detail/page-squad-detail.tsx) | `seatsView` monta `OfficeSeatView[]` (nome, role, character, accent, model, issue, status) |
| Avatar (sprite) | [agent-avatar.tsx](../src/components/orchestrator/agent-avatar/agent-avatar.tsx) | `<img>` do sprite com pose; borda de accent |
| Poses/sprites | [characters.ts](../src/features/security/orchestrator-shared/data/characters.ts) | `avatarSrc(name, "talk"\|"blink"\|"wave")` em `/public/assets/avatars` |
| Estado ao vivo | [use-orchestrator-runtime-store.ts](../src/features/security/orchestrator-shared/model/use-orchestrator-runtime-store.ts) | Store Zustand `runtimes[squadId]` |
| Mapa do run (reuso) | [run-activity-map.tsx](../src/components/orchestrator/run-activity-map/run-activity-map.tsx) | Já traduz `perAgentStatus`/`coordinatorThinking` em nós com pose — **é o embrião da coreografia** |
| Coordenador | [constants.ts:8](../src/features/security/orchestrator-shared/data/constants.ts) | `COORDINATOR_CHARACTER = "Male1"` |

**Sprites confirmados em `/public/assets/avatars/`:** todo personagem tem `_talk`,
`_blink` e aceno. `Male1/Male2/Female1/Female2` têm **dois frames de aceno**
(`_1wave` + `_2wave`) → dá pra animar o aceno em loop; os demais têm só `_wave`
(um frame). Ver `SINGLE_WAVE` em `characters.ts:17`.

---

## 3. Fonte de dados — mapa `Runtime` → visual

Tudo abaixo já existe em [`Runtime`](../src/features/security/orchestrator-shared/types/index.ts#L219).
**Nada precisa ser adicionado ao tipo.**

| Campo do `Runtime` | Uso visual |
|---|---|
| `status` | Decide modo config vs ao vivo; badge global |
| `perAgentStatus[seatId]` → `idle\|working\|done\|checkpoint` | Pose, aura e balão de cada avatar |
| `coordinatorThinking` | Spotlight + balão "decidindo…" na mesa do coordenador |
| `pendingSeatId` | Quem caminha para o centro / quem está em checkpoint |
| `pendingCheckpointKind` (`before`/`after`) | Copy do balão de checkpoint |
| `streamingText` | Texto digitando ao vivo no balão do agente ativo |
| `liveActivity[]` (`kind`, `toolName`, `detail`) | Sub-rótulo "usando: Bash/Write…" + ícone da ferramenta |
| `events[]` (`RunEvent`) | Histórico de falas; última fala do agente vira balão |
| `pendingQuestion` (`question`, `options[]`) | Balão interativo com botões de resposta |
| `stepStartedAt` | Cronômetro do passo atual (opcional no avatar ativo) |

> Regra de ouro: os componentes visuais **só leem** o `Runtime`. Quem escreve é o
> runner (`orchestrator-runtime.ts`), intocado.

---

## 4. Sistema de coordenadas e layout

Seats têm `col` (1–3) e `row` (1–N). `MAX_SEATS = 12` → até 4 linhas × 3 colunas.
Layout de nova cadeira: `col=(count%3)+1`, `row=floor(count/3)+1` (page-squad-detail.tsx:27).

**Modelo do palco (top-down):**

```
┌──────────────────────────────────────────────┐
│                  [ Coordenador ]              │  faixa superior fixa (mesa central)
│                      ▼ spotlight              │
│                 · ponto de ação ·             │  centro: onde o agente chamado trabalha
│                                               │
│   [seat 1,1]     [seat 2,1]     [seat 3,1]    │  grade de cadeiras por col/row
│   [seat 1,2]     [seat 2,2]     [seat 3,2]    │
└──────────────────────────────────────────────┘
```

- Converter `(col,row)` → coordenada em % do palco:
  - `x% = col === 1 ? 18 : col === 2 ? 50 : 82`
  - `y% = 42 + (row - 1) * 26` (linhas empilhadas abaixo da faixa do coordenador)
- **Ponto de ação** (destino da caminhada): `x=50%`, `y=28%` (logo abaixo do coordenador).
- Coordenador: `x=50%`, `y=6%`.
- Posições **absolutas** dentro de um container `relative` com `aspect-ratio` fixo
  (ex.: `16/10`) e `overflow-hidden`; avatares posicionados por `left/top` em `%`,
  movimento via `transform`/transição.

---

## 5. Arquitetura de arquivos

Criar uma pasta `office/` coesa. **Onde criar / editar:**

```
src/features/security/squad-detail/office/
├─ office-canvas.tsx           EDITAR  — vira o orquestrador de layout+modo (hoje é o grid)
├─ office-floor.tsx            CRIAR   — piso, grid de pontos, mesa do coordenador, moldura
├─ coordinator-desk.tsx        CRIAR   — avatar do coordenador + spotlight "decidindo…"
├─ agent-actor.tsx             CRIAR   — 1 avatar posicionado: pose, aura, movimento, status
├─ speech-bubble.tsx           CRIAR   — balão (fala / checkpoint / pergunta) com markdown
├─ empty-seat.tsx              CRIAR   — cadeira vazia "sentar agente" (extraído do canvas atual)
├─ use-office-choreography.ts  CRIAR   — traduz Runtime -> estado de cena declarativo
├─ office-geometry.ts          CRIAR   — helpers puros: (col,row)->(%), pontos, testáveis
└─ office-canvas.stories.tsx   CRIAR   — Storybook: config, running, checkpoint, question
```

**Não** tocar em: `page-squad-detail.tsx` além de passar props novas (runtime/events)
para `OfficeCanvas`; runner; store; tipos.

**Reuso:** a lógica de pose/estado já vive em `run-activity-map.tsx` (linhas 104-107).
Extrair essa derivação de pose para `office-geometry.ts` (ou um `agent-visual.ts`
compartilhado) e reusar nos dois lugares, para o mapa do run e o escritório nunca
divergirem.

---

## 6. Contrato dos componentes

### 6.1 `use-office-choreography.ts` (coração)

Hook puro de tradução. Entrada: `squad` (com `runtime`) + `seatsView`. Saída: um
array declarativo de "atores" + estado do coordenador. Nenhum efeito colateral.

```ts
export type ActorScene = {
  seatId: string;
  agent: OfficeSeatView["agent"];       // null = cadeira vazia
  status: AgentStatus;
  pose: AvatarPose;                     // derivado: working=talk, done=wave, else=blink
  position: { x: number; y: number };  // % no palco; centro quando é o pendingSeatId ativo
  isActive: boolean;                    // pendingSeatId === seatId && status working/checkpoint
  bubble?: {
    tone: "neutral" | "warning" | "success";
    text: string;                       // streamingText | último event.content | question
    kind: "speech" | "checkpoint" | "question";
    options?: string[];                 // só question
    toolLabel?: string;                 // liveActivity ativo -> "Usando Bash"
  };
};

export type CoordinatorScene = {
  thinking: boolean;                     // coordinatorThinking
  model: string;
};

export const useOfficeChoreography = (squad, seatsView): {
  actors: ActorScene[];
  coordinator: CoordinatorScene;
  mode: "config" | "live";
};
```

Regras de derivação:
- `mode = ["running","checkpoint","awaiting_input"].includes(status) ? "live" : "config"`.
- `pose`: reusa a regra do `run-activity-map` (working→talk, done→wave, senão blink).
- `position`: cadeira normal usa `seatToPosition(col,row)`; se
  `seatId === pendingSeatId` **e** está `working`/`checkpoint`, vai para o
  ponto de ação (centro).
- `bubble.text` prioridade: `pendingQuestion?.question` (se este seat) →
  `streamingText` (se ativo) → último `RunEvent` com `kind:"agent"` deste `seatId`.
- `toolLabel`: derivar de `liveActivity` (último `kind:"tool"` com `status:"running"`),
  reusando o helper existente [activity-label.ts](../src/components/orchestrator/run-transcript/activity-label.ts).

### 6.2 `office-geometry.ts` (puro, testável com Vitest)

```ts
seatToPosition(col: number, row: number): { x: number; y: number }
ACTION_POINT: { x: number; y: number }         // { x: 50, y: 28 }
COORDINATOR_POINT: { x: number; y: number }     // { x: 50, y: 6 }
poseForStatus(status: AgentStatus): AvatarPose  // extraído do run-activity-map
```

### 6.3 `agent-actor.tsx`

Props: `{ scene: ActorScene; onClick?: () => void; disabled?: boolean }`.
- Container `absolute` posicionado por `scene.position` (`left/top` em %),
  `transition-[left,top]` (ou `motion` — ver §8) para a caminhada.
- Renderiza `<AgentAvatar>` (reuso) com `pose={scene.pose}`.
- **Aura** por status: anel pulsante `working` (accent), estático `done` (success),
  âmbar `checkpoint`. Usar `ring`/`shadow` via classes semânticas.
- **Nome + micro-status** abaixo (reusar copy do `STATE_HINT` do run-activity-map).
- Se `scene.bubble`, renderiza `<SpeechBubble>` ancorado acima.
- Idle: `blink` + animação de "respiração" sutil (`scale` 1↔1.02, `prefers-reduced-motion` respeitado).

### 6.4 `coordinator-desk.tsx`

Props: `{ scene: CoordinatorScene; onClick?: () => void }`.
- Mesa fixa no topo; `<AgentAvatar character={COORDINATOR_CHARACTER}>`.
- `thinking` → spotlight (halo pulsante) + balão "decidindo o próximo passo…"
  com `Loader2` girando (mesma linguagem do `run-activity-map` linhas 69-77).
- Clique abre `OrchestratorConfigDialog` (mantém `onCoordinatorClick` atual).

### 6.5 `speech-bubble.tsx`

Props: `{ tone; kind; text; options?; toolLabel?; onAnswer?(opt) }`.
- `tone` → cores semânticas (neutral=card, warning=`--warning`, success=`--success`).
- `kind:"question"` → renderiza `options` como botões que chamam `onAnswer`
  (liga no fluxo de `pendingQuestion` já existente — mesma ação do run-dialog).
- Texto em markdown quando vier de `event.content`/`streamingText` (reusar o
  renderer de markdown já usado no transcript).
- "Rabinho" do balão apontando para o avatar; largura máx. com `text-wrap`.
- Streaming: mostrar cursor piscando enquanto `streamingText` não fecha.

### 6.6 `office-canvas.tsx` (editar)

Novo contrato de props (superset do atual — page-squad-detail passa mais dados):

```ts
type Props = {
  squad: Squad;                    // já tem runtime embutido (page monta em :64-67)
  seats: OfficeSeatView[];
  coordinator: CoordinatorView;
  onCoordinatorClick?: () => void;
  onSeatClick?: (seatId: string) => void;
  onAnswerQuestion?: (answer: string) => void;  // novo: responder no canvas
  className?: string;
};
```

Estrutura JSX:
```
<OfficeFloor>
  <CoordinatorDesk scene={coordinator} onClick={onCoordinatorClick} />
  {actors.map(a => a.agent
     ? <AgentActor scene={a} onClick={() => onSeatClick(a.seatId)} disabled={mode==="live"} />
     : <EmptySeat position={a.position} onClick={() => onSeatClick(a.seatId)} disabled={mode==="live"} />
  )}
</OfficeFloor>
```

---

## 7. Máquina de estados visual (coreografia)

Sequência de um passo, dirigida pelos campos do `Runtime`:

1. `coordinatorThinking = true` → spotlight no coordenador + balão "decidindo…";
   agentes em `blink`/idle.
2. `coordinatorThinking = false` + `pendingSeatId = X`, `perAgentStatus[X] = working`
   → ator X **caminha** cadeira→ponto de ação; pose `talk`; aura accent pulsando.
3. `streamingText`/`liveActivity` atualizam → balão digita; sub-rótulo "Usando Bash".
4. `perAgentStatus[X] = checkpoint` (+ `pendingSeatId=X`, `pendingCheckpointKind`)
   → aura âmbar, balão de aprovação; run pausado (usuário decide no dialog/canvas).
5. `pendingQuestion` deste seat → balão com `options` clicáveis (`onAnswerQuestion`).
6. `perAgentStatus[X] = done` → pose `wave`, ✅ flutuante, ator volta à cadeira.
7. `status = completed` → todos idle, badge "Concluído".

Reduced motion: sem caminhada nem respiração; troca de posição/pose vira corte seco
(ainda comunica o estado, sem animar).

---

## 8. Técnica de animação

- **DOM + CSS**, não `<canvas>`. Motivos: ≤12 atores, cliques, balões com markdown,
  acessibilidade, e reuso do `<AgentAvatar>`/sprites atuais.
- Movimento: preferir **Framer Motion** se já estiver no projeto (checar
  `package.json`); senão, `transition: left .9s cubic-bezier(.4,0,.2,1), top .9s`.
  A caminhada é interpolação ponto-a-ponto simples (sem pathfinding).
- Aceno em loop (personagens com 2 frames) opcional: alternar `_1wave`/`_2wave` com
  um pequeno timer enquanto `done`. Fallback: `_wave` estático.
- Sprites já usam `image-rendering: pixelated` — manter.
- `will-change: transform` só nos atores em movimento.

> Antes da Fase 4, **confirmar se Framer Motion está no projeto**. Se não estiver,
> não adicionar dependência sem aprovação — CSS puro cobre o movimento.

---

## 9. Fases de entrega

### Fase 1 — Piso espacial + modo config (sem run)
- Criar `office-geometry.ts` (+ teste Vitest de `seatToPosition`).
- Criar `office-floor.tsx`, `empty-seat.tsx`, `coordinator-desk.tsx` (estático).
- Criar `agent-actor.tsx` só com posição+pose estática (sem movimento/balão).
- Editar `office-canvas.tsx` para posicionar por `col/row` em vez do grid.
- **Preservar 100%** o config: sentar agente (`onSeatClick`→`SeatAssignDialog`),
  editar agente, adicionar cadeira, aviso de readiness.
- ✔ Critério: escritório espacial renderiza; sentar/editar/adicionar cadeira funcionam
  igual a hoje; `npm run build` + `tsc -p tsconfig.app.json` limpos.

### Fase 2 — Coreografia de estado (poses, auras, spotlight)
- Criar `use-office-choreography.ts` (sem balões ainda).
- Ligar `perAgentStatus`/`coordinatorThinking` → pose + aura + spotlight.
- Extrair `poseForStatus` e reusar em `run-activity-map.tsx`.
- ✔ Critério: rodar um squad e ver avatares mudando de estado ao vivo (sem mover ainda).

### Fase 3 — Balões de fala + pergunta interativa
- Criar `speech-bubble.tsx`; ligar `streamingText`/`events`/`pendingQuestion`.
- `pendingQuestion` responde pelo canvas (`onAnswerQuestion`) — reusar a ação já
  existente do run-dialog (localizar o handler e expor no page-squad-detail).
- ✔ Critério: balões aparecem com streaming; responder pergunta no canvas destrava o run.

### Fase 4 — Movimento e polish
- Caminhada cadeira↔ponto de ação no `pendingSeatId`.
- ✅ flutuante ao concluir, respiração idle, aceno 2 frames, spotlight refinado.
- Reduced motion + responsivo (§10).
- Som opcional (desligado por padrão; só se o usuário pedir).
- ✔ Critério: ciclo completo do mockup reproduzido com dados reais.

---

## 10. Responsividade e acessibilidade

- **Desktop/tablet**: palco `aspect-ratio` fixo, escala fluida.
- **< `sm` (mobile)**: escritório espacial não cabe. Plano B — abaixo de `sm`,
  cair para uma **lista vertical compacta** (reusar o layout de nós do
  `run-activity-map`, que já é mobile-friendly). Decidir por CSS/`useMediaQuery`.
- **A11y**:
  - Cada ator é um `<button>` com `aria-label` (nome + role + status).
  - Balões: `role="status"`/`aria-live="polite"` para leitor de tela anunciar falas.
  - `prefers-reduced-motion`: sem caminhada/respiração/spinner (corte seco).
  - Foco visível nos atores/cadeiras (já há padrão `focus-visible:ring` no canvas atual).
  - Contraste dos balões via cores semânticas (`--warning`/`--success`), nunca hex cru.

---

## 11. Riscos e pontos de atenção

- **Run vive num dialog hoje.** [run-dialog.tsx](../src/components/orchestrator/run-dialog/run-dialog.tsx)
  abre a execução em modal com `RunActivityMap` + transcript. O escritório da página
  já reflete `perAgentStatus` (page passa runtime), então ele anima **em segundo plano**
  na página enquanto o dialog está aberto. Decisão a validar: (a) manter o dialog para
  briefing/transcript e deixar o escritório animar atrás; ou (b) reduzir o dialog e
  promover o escritório a palco principal. **Recomendação:** (a) na F1–F3, avaliar (b) na F4.
- **Divergência de pose** entre mapa e escritório: mitigado extraindo `poseForStatus`
  para um único helper (§5).
- **12 cadeiras** em telas menores podem apertar; o `aspect-ratio` + scroll interno
  resolve, mas validar com um squad cheio.
- **Framer Motion**: confirmar presença antes de usar (§8).
- **Assets de aceno de 1 frame**: 6 personagens não animam o aceno — tratar via
  `SINGLE_WAVE` (já existe) sem quebrar.

---

## 12. Checklist de verificação (por fase)

- [ ] `npx tsc --noEmit -p tsconfig.app.json` limpo (0 erros).
- [ ] `npm run lint` limpo nos arquivos tocados.
- [ ] `npm run test` — geometria (`office-geometry`) e coreografia (`use-office-choreography`) cobertas.
- [ ] Config: sentar / editar / adicionar cadeira / readiness continuam idênticos.
- [ ] Ao vivo: rodar um squad real e conferir estados, balões e (F4) movimento.
- [ ] Reduced motion e mobile (lista vertical) validados.
- [ ] `office-canvas.stories.tsx` cobre config / running / checkpoint / question.

---

## 13. Resumo de "onde mexer"

| Ação | Arquivo |
|---|---|
| Reescrever board → palco | `squad-detail/office/office-canvas.tsx` (editar) |
| Piso/moldura/grid | `squad-detail/office/office-floor.tsx` (novo) |
| Coordenador + spotlight | `squad-detail/office/coordinator-desk.tsx` (novo) |
| Avatar posicionado/animado | `squad-detail/office/agent-actor.tsx` (novo) |
| Balões | `squad-detail/office/speech-bubble.tsx` (novo) |
| Cadeira vazia | `squad-detail/office/empty-seat.tsx` (novo) |
| Tradução Runtime→cena | `squad-detail/office/use-office-choreography.ts` (novo) |
| Geometria pura + testes | `squad-detail/office/office-geometry.ts` (novo) |
| Passar runtime/events/answer | `squad-detail/page-squad-detail.tsx` (props novas em `<OfficeCanvas>`) |
| Unificar pose | `components/orchestrator/run-activity-map/run-activity-map.tsx` (importar `poseForStatus`) |
