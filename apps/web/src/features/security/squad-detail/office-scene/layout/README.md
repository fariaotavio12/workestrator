# Layout do escritório

O escritório é **dado, não código**. Ele é desenhado no [LDtk](https://ldtk.io) (grátis, 1.5.3) e
importado; a cena Phaser só monta o que o layout manda.

**Não edite `office.generated.json` nem `preset-classic-office.ts` à mão** — a próxima importação
sobrescreve tudo.

## Como mudar o escritório

```bash
# 1. abra o projeto no LDtk e arraste as peças
apps/web/authoring/office.ldtk

# 2. Ctrl+S no LDtk, e então:
cd apps/web && npx tsx scripts/import-ldtk-office.ts

# 3. confira
npx vitest run src/features/security/squad-detail/office-scene
```

O importador escreve `office.generated.json` e imprime o que mudou. É o **único** caminho entre o
editor e o app, e anda numa direção só.

## Os arquivos

| Arquivo | Papel |
|---|---|
| `authoring/office.ldtk` | **A fonte.** O escritório, editável no LDtk. |
| `authoring/office-props.png` | Atlas só do editor (as 53 peças), pra elas aparecerem desenhadas. |
| `layout/office.generated.json` | Saída do importador. Commitado — é o que o app carrega. |
| `layout/preset-classic-office.ts` | Só tipa o JSON como `OfficeLayout`. |
| `layout/office-layout.ts` | O formato + helpers de coordenada (`CELL`, `cellBaseline`). |
| `authoring/ldtk-to-layout.ts` | O importador de verdade. |
| `authoring/ldtk-schema.ts` | Subconjunto tipado do JSON do LDtk + as convenções do mapeamento. |

## O modelo

Grade de **24×15 células de 64px** (`CELL`) = mundo de 1536×960. Três camadas no LDtk:

- **Structure** — `FloorZone`, `Wall`, `Glass`, `Door`. Piso/parede/vidro são entidades
  **redimensionáveis**: arrastar a alça muda o trecho. Ancoradas no canto da célula. As paredes são
  ladrilhadas a partir de um pedaço de 1 célula (mais pilar/cap nas pontas), então **qualquer
  comprimento funciona** — não existe asset por tamanho.
- **Furniture** — `Prop`, uma por peça. Campos: `propId` (enum com o sprite real), `flip`, `angle`
  (90 = frente p/ esquerda, −90 = p/ direita). O pivô é a **baseline** (centro-x / base), igual à cena:
  onde você solta é onde a peça encosta no chão.
- **Anchors** — `DeskAnchor` (campos `slot`, `facing`) e `Coordinator` (`facing`).

### Baias são âncoras, não móveis

A `DeskAnchor` marca **a baia inteira** — não tem mesa nenhuma no editor. Cadeira, mesa, monitor,
gaveteiro e planta são montados em tempo de execução por `scene/workstation-module.ts`, quando um
agente ocupa aquele slot.

A baia é **centrada na âncora** (`STATION_DX` em `workstation-module.ts`): ela tem ~100px de largura,
então vaza ~18px de cada lado da célula, simetricamente. Inverter o `facing` **espelha no lugar** —
a baia não muda de posição, só de lado. `right` = mesa à direita da pessoa. Só `left`/`right`: os
sprites sentados são de perfil.

## Armadilhas

- **`slot` ≤ 11.** `MAX_SEATS` é 12 (`orchestrator-shared/data/constants.ts`). Baia com slot fora
  disso nunca é preenchida. Os slots precisam ser únicos e contíguos a partir de 0 — cuidado ao
  **duplicar** uma âncora no LDtk: a cópia vem com o `slot` do original.
- **Peça nova nasce 64×64 no editor.** O tamanho real vem do `prop-manifest`; a caixa no LDtk é só
  cosmética e o importador ignora largura/altura.
- **Offset arredonda pro pixel.** O LDtk guarda posição inteira, então um ajuste fino volta em
  múltiplos de 1/64 de célula (≤ 0,2px de diferença). Irrelevante na tela, mas explica por que o
  JSON mostra `0.203125` onde você esperava `0.2`.
- **Cuidado ao mexer no pivô de uma entidade.** O `px` do LDtk é a posição do **pivô**, não do canto:
  mudar o pivô de uma entidade que já tem instâncias faz todas as caixas andarem sem o `px` mudar, e
  elas passam a ficar a cavalo entre células. O importador respeita o pivô e **avisa** (`fora da grade
  em Npx`) em vez de errar calado — mas o aviso é sinal de que o desenho saiu do lugar.
- **As setas do teclado no LDtk movem 1px**, sem encaixar na grade. Se aparecer aviso de "fora da
  grade", provavelmente foi isso; o importador encaixa na célula mais próxima.
- **Peça nova exige PNG + entrada no manifesto.** O enum `PropId` sai de `prop-manifest.ts`; pra
  adicionar uma peça, ver a seção abaixo.

## Adicionar uma peça nova

1. PNG em `public/assets_office_transparente/`.
2. Meça: `node scripts/measure-office-props.mjs` (atualiza `prop-metrics.generated.json`).
3. Registre a categoria/tamanho em `assets/prop-manifest.ts` (`OVERRIDES`).
4. Regere o atlas do editor: `node scripts/generate-ldtk-atlas.mjs`.
5. O enum `PropId` do `.ldtk` só ganha o valor novo quando o projeto é re-semeado
   (`authoring/layout-to-ldtk.ts`) — hoje isso não tem script, justamente pra ninguém sobrescrever o
   `.ldtk` sem querer.

## As redes de proteção

`npx vitest run src/features/security/squad-detail/office-scene` roda:

- **`layout/preset-classic-office.test.ts`** — valida o layout **importado**: peças existem no
  manifesto, tudo dentro da grade, slots únicos/contíguos ≤ `MAX_SEATS`, ids únicos. É o que pega
  edição ruim vinda do LDtk.
- **`assets/asset-manifest.test.ts`** — manifesto ↔ arquivos em disco (peças, paredes, personagens).
- **`authoring/ldtk-round-trip.test.ts`** — exportar → importar devolve o mesmo layout, e o andaime
  do nosso JSON bate chave a chave com um projeto real do LDtk instalado (pula sozinho se não houver).

## Por que LDtk e não Godot/Tiled

O renderizador (Phaser) e o editor são coisas separadas: o que faltava era **autorar o dado**, não
trocar de engine. Godot exigiria embutir a engine inteira (o `.tscn` não é formato de intercâmbio);
o LDtk tem modelo de "entidade + campos" que mapeia quase 1:1 no `OfficeLayout` e exporta JSON limpo.
