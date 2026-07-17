/**
 * Subconjunto tipado do JSON do LDtk (formato 1.5.3) + as convenções que ligam o projeto do editor ao
 * nosso `OfficeLayout`. Só modelamos o que lemos/escrevemos — o arquivo real tem muito mais campo.
 *
 * Convenções (fonte única; exportador e importador leem daqui):
 * - 1 nível "Office", grade de 64px (= CELL), tamanho = grid do layout.
 * - 3 camadas de entidade: Structure (piso/parede/vidro/porta), Furniture (peças), Anchors (baias +
 *   coordenador).
 * - Runs (Wall/Glass) e zonas de piso são entidades REDIMENSIONÁVEIS ancoradas no canto (pivot 0,0):
 *   arrastar a alça no editor = mudar `from`/`to`. Peças usam pivot (0.5, 1) = a baseline do sprite,
 *   igual à cena, então a posição no editor é literalmente onde a peça encosta no chão.
 * - `propId` é um enum (não string) para o editor mostrar o sprite real e evitar id inválido.
 */

import type { PropCategory } from "../assets/prop-manifest";

/** Lado da célula em px — espelha CELL de office-layout (o LDtk trabalha em px). */
export const LDTK_GRID = 64;

/** Versão do formato que geramos. O LDtk migra arquivos mais antigos ao abrir. */
export const LDTK_JSON_VERSION = "1.5.3";

/** Identificadores das camadas de entidade. */
export const LAYER = { structure: "Structure", furniture: "Furniture", anchors: "Anchors" } as const;

/** Identificadores das entidades. */
export const ENTITY = {
	floorZone: "FloorZone",
	wall: "Wall",
	glass: "Glass",
	door: "Door",
	prop: "Prop",
	deskAnchor: "DeskAnchor",
	coordinator: "Coordinator",
} as const;

/** Identificadores dos enums. */
export const ENUM = {
	propId: "PropId",
	facing: "Facing",
	floorTex: "FloorTex",
	glassFrame: "GlassFrame",
	doorKind: "DoorKind",
} as const;

/** uids fixos — determinísticos p/ o arquivo não embaralhar entre gerações (diff limpo no git). */
export const UID = {
	tileset: 1,
	enumPropId: 10,
	enumFacing: 11,
	enumFloorTex: 12,
	enumGlassFrame: 13,
	enumDoorKind: 14,
	layerStructure: 20,
	layerFurniture: 21,
	layerAnchors: 22,
	entFloorZone: 30,
	entWall: 31,
	entGlass: 32,
	entDoor: 33,
	entProp: 34,
	entDeskAnchor: 35,
	entCoordinator: 36,
	fieldTexture: 40,
	fieldFrame: 41,
	fieldKind: 42,
	fieldPropId: 43,
	fieldFlip: 44,
	fieldAngle: 45,
	fieldSlot: 46,
	fieldFacingDesk: 47,
	fieldFacingCoord: 48,
	level: 50,
} as const;

/**
 * propId → id de valor de enum. Ids de enum do LDtk não aceitam hífen nem começar com dígito
 * ("01_workstation-desk-l-empty"), então prefixamos e trocamos "-" por "_". Reversível via mapa.
 */
export const propEnumId = (propId: string): string => `P${propId.replace(/-/g, "_")}`;

/** Enums de domínio ↔ valores do LDtk. Mapas explícitos: renomear um lado quebra no type-check. */
export const FACING_TO_LDTK = { left: "Left", right: "Right" } as const;
export const FLOOR_TEX_TO_LDTK = { wood: "Wood", "meeting-carpet": "MeetingCarpet" } as const;
export const GLASS_FRAME_TO_LDTK = { dark: "Dark", cream: "Cream" } as const;
export const DOOR_KIND_TO_LDTK = { "glass-single": "GlassSingle", "glass-double": "GlassDouble" } as const;

/** Inverte um mapa `domínio → LDtk` em `LDtk → domínio`. */
const invert = <K extends string, V extends string>(map: Record<K, V>): Record<V, K> =>
	Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k])) as Record<V, K>;

export const LDTK_TO_FACING = invert(FACING_TO_LDTK);
export const LDTK_TO_FLOOR_TEX = invert(FLOOR_TEX_TO_LDTK);
export const LDTK_TO_GLASS_FRAME = invert(GLASS_FRAME_TO_LDTK);
export const LDTK_TO_DOOR_KIND = invert(DOOR_KIND_TO_LDTK);

/** Cor de referência por categoria — só decora o editor quando a peça não tem tile. */
export const CATEGORY_COLOR: Record<PropCategory, string> = {
	desk: "#B07A45",
	table: "#B07A45",
	chair: "#3E93A3",
	divider: "#3E93A3",
	storage: "#7A6A52",
	tech: "#3F4448",
	plant: "#5B8C4A",
	decor: "#C9873F",
	lounge: "#3E6BA3",
	floor: "#8A5B38",
	wall: "#EAE4D5",
	door: "#6D7376",
	"wall-mounted": "#4F8AE8",
};

export type LdtkTileRect = { tilesetUid: number; x: number; y: number; w: number; h: number };

export type LdtkFieldInstance = {
	__identifier: string;
	__type: string;
	__value: unknown;
	__tile: LdtkTileRect | null;
	defUid: number;
	realEditorValues: unknown[];
};

export type LdtkEntityInstance = {
	__identifier: string;
	__grid: [number, number];
	__pivot: [number, number];
	__tags: string[];
	__tile: LdtkTileRect | null;
	__smartColor: string;
	iid: string;
	width: number;
	height: number;
	defUid: number;
	/** Posição em px do PIVÔ da entidade dentro do nível. */
	px: [number, number];
	fieldInstances: LdtkFieldInstance[];
};

export type LdtkLayerInstance = {
	__identifier: string;
	__type: string;
	__gridSize: number;
	entityInstances: LdtkEntityInstance[];
	[extra: string]: unknown;
};

export type LdtkLevel = {
	identifier: string;
	pxWid: number;
	pxHei: number;
	layerInstances: LdtkLayerInstance[];
	[extra: string]: unknown;
};

/** Projeto LDtk — só os campos que o importador consome; o exportador emite o resto do andaime. */
export type LdtkProject = {
	jsonVersion: string;
	levels: LdtkLevel[];
	[extra: string]: unknown;
};

/** Lê o valor de um campo de uma entidade (undefined se ausente). */
export const fieldValue = (entity: LdtkEntityInstance, identifier: string): unknown =>
	entity.fieldInstances.find((f) => f.__identifier === identifier)?.__value;
