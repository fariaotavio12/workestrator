/**
 * Importador: projeto LDtk → `OfficeLayout`. É o lado que importa de verdade — depois de arrastar as
 * peças no editor, isto vira o preset que a cena consome (ver scripts/import-ldtk-office.ts).
 *
 * Falha alto e cedo: é um conversor de build, então enum desconhecido / camada faltando devem estourar
 * na hora, não virar um escritório silenciosamente errado.
 */

import { CELL, type Cell, type FloorZone, type FurnitureInstance, type OfficeLayout } from "../layout/office-layout";
import {
	ENTITY,
	fieldValue,
	LAYER,
	LDTK_TO_DOOR_KIND,
	LDTK_TO_FACING,
	LDTK_TO_FLOOR_TEX,
	LDTK_TO_GLASS_FRAME,
	propEnumId,
	type LdtkEntityInstance,
	type LdtkProject,
} from "./ldtk-schema";
import { PROP_IDS } from "../assets/prop-manifest";

/** Enum do LDtk → propId real (inverso de `propEnumId`, derivado do manifesto). */
const ENUM_TO_PROP_ID = new Map(PROP_IDS.map((id) => [propEnumId(id), id]));

/** Tolerância p/ tratar um offset como "zero" (px inteiros no LDtk → 1/64 de célula). */
const EPS = 1e-6;

const fail = (msg: string): never => {
	throw new Error(`ldtk-to-layout: ${msg}`);
};

const lookup = <T extends string>(map: Record<string, T>, raw: unknown, what: string): T => {
	const key = typeof raw === "string" ? raw : "";
	return map[key] ?? fail(`valor de ${what} desconhecido: ${JSON.stringify(raw)}`);
};

/**
 * `Math.round` devolve -0 para entradas como -0.4. Serializa como "0", mas vaza em comparação estrita
 * (`Object.is(-0, 0)` é falso) — normalizamos p/ o layout não carregar dois zeros diferentes.
 */
const roundCell = (n: number): number => {
	const r = Math.round(n);
	return r === 0 ? 0 : r;
};

/**
 * Encaixa um valor em px na grade. O LDtk deixa empurrar entidade 1px por vez com as setas, então
 * nada garante alinhamento — sem arredondar, uma célula sairia fracionária (e `cellBaseline` colocaria
 * a peça fora da grade). Avisa quando o desencaixe é real, pra o desvio não passar silencioso.
 */
const snapCell = (px: number, what: string): number => {
	const raw = px / CELL;
	const cell = roundCell(raw);
	if (Math.abs(raw - cell) > EPS) {
		console.warn(`ldtk-to-layout: ${what} fora da grade em ${px}px — encaixado na célula ${cell}`);
	}
	return cell;
};

/**
 * Canto superior-esquerdo de uma entidade. `px` no LDtk é a posição do PIVÔ, não do canto — se alguém
 * mudar o pivô da entidade no editor, a caixa anda sem o `px` mudar. Derivar o canto (em vez de supor
 * pivô 0,0) mantém o import fiel a onde a caixa realmente está na tela.
 */
const cornerPx = (e: LdtkEntityInstance): [number, number] => [
	e.px[0] - e.width * e.__pivot[0],
	e.px[1] - e.height * e.__pivot[1],
];

/** Célula de uma entidade cuja caixa cobre a célula. */
const cornerCell = (e: LdtkEntityInstance): Cell => {
	const [left, top] = cornerPx(e);
	return { x: snapCell(left, `${e.__identifier}.x`), y: snapCell(top, `${e.__identifier}.y`) };
};

/** Run (parede/vidro) a partir de uma entidade redimensionável: extremos inclusivos. */
const runOf = (e: LdtkEntityInstance): { from: Cell; to: Cell } => {
	const [left, top] = cornerPx(e);
	return {
		from: cornerCell(e),
		to: {
			x: snapCell(left + e.width, `${e.__identifier}.x+w`) - 1,
			y: snapCell(top + e.height, `${e.__identifier}.y+h`) - 1,
		},
	};
};

/** Zona de piso a partir de uma entidade redimensionável. */
const rectOf = (e: LdtkEntityInstance): FloorZone["rect"] => {
	const from = cornerCell(e);
	return {
		x: from.x,
		y: from.y,
		w: snapCell(e.width, `${e.__identifier}.w`),
		h: snapCell(e.height, `${e.__identifier}.h`),
	};
};

/**
 * Peça: o pivô da entidade é a baseline (centro-x / base), igual à cena. Recupera célula + offset
 * fino invertendo `cellBaseline`. O LDtk guarda px inteiro, então o offset volta em múltiplos de 1/64.
 */
const propPlacement = (e: LdtkEntityInstance): Pick<FurnitureInstance, "cell" | "offset"> => {
	const [bx, by] = e.px;
	const cell: Cell = { x: roundCell(bx / CELL - 0.5), y: roundCell(by / CELL - 1) };
	const offset = { x: (bx - (cell.x + 0.5) * CELL) / CELL, y: (by - (cell.y + 1) * CELL) / CELL };
	const moved = Math.abs(offset.x) > EPS || Math.abs(offset.y) > EPS;
	return moved ? { cell, offset } : { cell };
};

const entitiesOf = (project: LdtkProject, layerId: string, entityId: string): LdtkEntityInstance[] => {
	const level = project.levels[0] ?? fail("projeto sem nível");
	const layer = level.layerInstances.find((l) => l.__identifier === layerId) ?? fail(`camada ausente: ${layerId}`);
	return layer.entityInstances.filter((e) => e.__identifier === entityId);
};

/** Converte um projeto LDtk no layout do escritório. */
export const ldtkToLayout = (project: LdtkProject): OfficeLayout => {
	const level = project.levels[0] ?? fail("projeto sem nível");

	const coordinators = entitiesOf(project, LAYER.anchors, ENTITY.coordinator);
	if (coordinators.length !== 1) fail(`esperado exatamente 1 ${ENTITY.coordinator}, achei ${coordinators.length}`);
	const coord = coordinators[0];

	return {
		version: 1,
		grid: { cols: level.pxWid / CELL, rows: level.pxHei / CELL },

		floors: entitiesOf(project, LAYER.structure, ENTITY.floorZone).map((e) => ({
			rect: rectOf(e),
			texture: lookup(LDTK_TO_FLOOR_TEX, fieldValue(e, "texture"), "FloorTex"),
		})),

		walls: entitiesOf(project, LAYER.structure, ENTITY.wall).map(runOf),

		glass: entitiesOf(project, LAYER.structure, ENTITY.glass).map((e) => {
			const frame = lookup(LDTK_TO_GLASS_FRAME, fieldValue(e, "frame"), "GlassFrame");
			// "dark" é o padrão do renderizador — omitimos p/ o preset ficar enxuto.
			return frame === "dark" ? runOf(e) : { ...runOf(e), frame };
		}),

		doors: entitiesOf(project, LAYER.structure, ENTITY.door).map((e) => ({
			cell: cornerCell(e),
			kind: lookup(LDTK_TO_DOOR_KIND, fieldValue(e, "kind"), "DoorKind"),
		})),

		furniture: entitiesOf(project, LAYER.furniture, ENTITY.prop).map((e, i) => {
			const raw = fieldValue(e, "propId");
			const propId = ENUM_TO_PROP_ID.get(String(raw)) ?? fail(`PropId fora do manifesto: ${JSON.stringify(raw)}`);
			const flip = fieldValue(e, "flip") === true;
			const angle = Number(fieldValue(e, "angle") ?? 0);
			return {
				id: `${propId}#${i}`,
				propId,
				...propPlacement(e),
				...(flip ? { flip } : {}),
				...(angle ? { angle } : {}),
			};
		}),

		deskAnchors: entitiesOf(project, LAYER.anchors, ENTITY.deskAnchor).map((e) => {
			const slot = Number(fieldValue(e, "slot"));
			if (!Number.isInteger(slot)) fail(`DeskAnchor com slot inválido: ${JSON.stringify(fieldValue(e, "slot"))}`);
			return {
				id: `desk-${slot}`,
				slot,
				cell: cornerCell(e),
				facing: lookup(LDTK_TO_FACING, fieldValue(e, "facing"), "Facing"),
			};
		}),

		coordinator: {
			cell: cornerCell(coord),
			facing: lookup(LDTK_TO_FACING, fieldValue(coord, "facing"), "Facing"),
		},
	};
};
