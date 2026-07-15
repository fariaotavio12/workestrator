/**
 * Formato do layout do escritório — tipos TS puros, SEM zod: hoje nada é persistido nem autorado
 * pelo usuário (só o preset embutido). Quando o "criador de escritório" existir, este formato ganha
 * schema zod + versionamento de migração; o campo `version` já reserva esse caminho.
 */

/** Célula lógica da grade (0-based). */
export type Cell = { x: number; y: number };

/** Retângulo em células (inclusivo em `x..x+w-1` / `y..y+h-1`). */
export type CellRect = { x: number; y: number; w: number; h: number };

export type FloorTexture = "wood" | "meeting-carpet";

export type Facing = "left" | "right";

/** Zona de piso — a primeira zona por convenção é o preenchimento base (madeira). */
export type FloorZone = { rect: CellRect; texture: FloorTexture };

/** Trecho de parede sólida, alinhado a um eixo (extremos inclusivos, em células). */
export type WallRun = { from: Cell; to: Cell };

/** Trecho de parede de vidro — renderizado repetindo o painel de vidro ao longo do eixo. */
export type GlassRun = { from: Cell; to: Cell };

export type Door = { cell: Cell; kind: "glass-single" | "glass-double" };

export type FurnitureInstance = {
	/** Id estável da instância (futuro editor: seleção/undo). */
	id: string;
	/** Chave no PROP_MANIFEST (nome do arquivo sem extensão). */
	propId: string;
	/** Célula âncora — a baseline (bottom-center) da peça cai no centro-x/base da célula. */
	cell: Cell;
	flip?: boolean;
	/** Ajuste fino em frações de célula (composições encostadas, ex.: almofadas no sofá). */
	offset?: { x: number; y: number };
};

/** Âncora de baia: onde uma cadeira (Seat) materializa uma estação de trabalho completa. */
export type DeskAnchor = {
	id: string;
	/** Ordem de ligação com os Seats (0-based, único) — ver seat-anchor-resolution. */
	slot: number;
	/** Célula da cadeira/pessoa da baia. */
	cell: Cell;
	/** Para onde a pessoa sentada olha (sheets sentados olham para a direita; left = flipX). */
	facing: Facing;
};

export type CoordinatorAnchor = { cell: Cell; facing: Facing };

export type OfficeLayout = {
	version: 1;
	grid: { cols: number; rows: number };
	floors: FloorZone[];
	walls: WallRun[];
	glass: GlassRun[];
	doors: Door[];
	furniture: FurnitureInstance[];
	deskAnchors: DeskAnchor[];
	coordinator: CoordinatorAnchor;
};

/** Lado de uma célula em world px. 256px de frame de personagem em escala 0.25 = 1 célula. */
export const CELL = 64;

/** Tamanho do mundo em px para um grid. */
export const worldSize = (grid: OfficeLayout["grid"]): { w: number; h: number } => ({
	w: grid.cols * CELL,
	h: grid.rows * CELL,
});

/** Centro-x / base (baseline) de uma célula em world px — âncora padrão das peças. */
export const cellBaseline = (cell: Cell): { x: number; y: number } => ({
	x: (cell.x + 0.5) * CELL,
	y: (cell.y + 1) * CELL,
});

/** Centro geométrico de uma célula em world px. */
export const cellCenter = (cell: Cell): { x: number; y: number } => ({
	x: (cell.x + 0.5) * CELL,
	y: (cell.y + 0.5) * CELL,
});

/** Baseline com ajuste fino opcional (frações de célula) de uma FurnitureInstance. */
export const furnitureBaseline = (item: FurnitureInstance): { x: number; y: number } => {
	const base = cellBaseline(item.cell);
	return {
		x: base.x + (item.offset?.x ?? 0) * CELL,
		y: base.y + (item.offset?.y ?? 0) * CELL,
	};
};
