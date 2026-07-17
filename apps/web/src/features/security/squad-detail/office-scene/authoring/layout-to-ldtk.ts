/**
 * Exportador: `OfficeLayout` → projeto LDtk. É o caminho INVERSO do fluxo normal (hoje o .ldtk é a
 * fonte e só o importador roda), e por isso NÃO tem script: rodá-lo por engano sobrescreveria o que
 * você desenhou no editor. Ele existe por dois motivos:
 *
 * 1. o teste de round-trip (exportar → importar = mesmo layout) prova que o importador está certo;
 * 2. se o .ldtk se perder, dá pra semear um novo a partir do layout atual.
 *
 * O andaime (chaves e valores fora do nosso domínio) é espelhado dos projetos de exemplo do LDtk 1.5.3
 * que vêm com o app — os conjuntos de chaves são conferidos contra um sample real no teste.
 */

import { CELL, type OfficeLayout } from "../layout/office-layout";
import { getProp, PROP_IDS, propDisplayHeight } from "../assets/prop-manifest";
import {
	CATEGORY_COLOR,
	DOOR_KIND_TO_LDTK,
	ENTITY,
	ENUM,
	FACING_TO_LDTK,
	FLOOR_TEX_TO_LDTK,
	GLASS_FRAME_TO_LDTK,
	LAYER,
	LDTK_GRID,
	LDTK_JSON_VERSION,
	propEnumId,
	UID,
	type LdtkEntityInstance,
	type LdtkFieldInstance,
	type LdtkTileRect,
} from "./ldtk-schema";

/** Caminho do atlas relativo ao .ldtk (ambos moram em apps/web/authoring). */
const ATLAS_REL_PATH = "office-props.png";

/** Saída de generate-ldtk-atlas.mjs (authoring/office-props.atlas.json). */
export type PropAtlas = {
	slot: number;
	cols: number;
	w: number;
	h: number;
	slots: Record<string, { x: number; y: number; w: number; h: number }>;
};

/** iid determinístico (o LDtk quer UUID): mesmo layout ⇒ mesmo arquivo ⇒ diff limpo no git. */
let iidSeq = 0;
const iid = (): string => `00000000-0000-4000-8000-${(++iidSeq).toString(16).padStart(12, "0")}`;

const tileRectOf = (atlas: PropAtlas, propId: string): LdtkTileRect => {
	const slot = atlas.slots[propId];
	if (!slot) throw new Error(`layout-to-ldtk: peça sem slot no atlas: ${propId} — rode generate-ldtk-atlas.mjs`);
	return { tilesetUid: UID.tileset, ...slot };
};

// --- Fábricas de "def" (conjuntos de chaves idênticos aos do LDtk real) ---

type FieldKind = { type: string; __type: string };
const F_INT: FieldKind = { type: "F_Int", __type: "Int" };
const F_BOOL: FieldKind = { type: "F_Bool", __type: "Bool" };
const fEnum = (uid: number, name: string): FieldKind => ({ type: `F_Enum(${uid})`, __type: `LocalEnum.${name}` });

const fieldDef = (identifier: string, uid: number, kind: FieldKind, displayMode = "NameAndValue") => ({
	identifier,
	doc: null,
	__type: kind.__type,
	uid,
	type: kind.type,
	isArray: false,
	canBeNull: false,
	arrayMinLength: null,
	arrayMaxLength: null,
	editorDisplayMode: displayMode,
	editorDisplayScale: 1,
	editorDisplayPos: "Above",
	editorLinkStyle: "CurvedArrow",
	editorDisplayColor: null,
	editorAlwaysShow: false,
	editorShowInWorld: true,
	editorCutLongValues: true,
	editorTextSuffix: null,
	editorTextPrefix: null,
	useForSmartColor: false,
	exportToToc: false,
	searchable: false,
	min: null,
	max: null,
	regex: null,
	acceptFileTypes: null,
	defaultOverride: null,
	textLanguageMode: null,
	symmetricalRef: false,
	autoChainRef: false,
	allowOutOfLevelRef: true,
	allowedRefs: "OnlySame",
	allowedRefsEntityUid: null,
	allowedRefTags: [],
	tilesetUid: null,
});

type EntityDefOpts = {
	resizable?: boolean;
	pivot?: [number, number];
	size?: [number, number];
	color: string;
	/** Presente = a entidade renderiza como tile (peça); ausente = retângulo colorido. */
	tile?: LdtkTileRect;
	fields?: ReturnType<typeof fieldDef>[];
};

const entityDef = (identifier: string, uid: number, o: EntityDefOpts) => ({
	identifier,
	uid,
	tags: [],
	exportToToc: false,
	allowOutOfBounds: false,
	doc: null,
	width: o.size?.[0] ?? LDTK_GRID,
	height: o.size?.[1] ?? LDTK_GRID,
	resizableX: o.resizable ?? false,
	resizableY: o.resizable ?? false,
	minWidth: null,
	maxWidth: null,
	minHeight: null,
	maxHeight: null,
	keepAspectRatio: false,
	tileOpacity: 1,
	fillOpacity: o.tile ? 0.08 : 0.35,
	lineOpacity: 1,
	hollow: false,
	color: o.color,
	renderMode: o.tile ? "Tile" : "Rectangle",
	showName: !o.tile,
	tilesetId: o.tile ? UID.tileset : null,
	tileRenderMode: "FitInside",
	tileRect: o.tile ?? null,
	uiTileRect: null,
	nineSliceBorders: [],
	maxCount: 0,
	limitScope: "PerLevel",
	limitBehavior: "MoveLastOne",
	pivotX: o.pivot?.[0] ?? 0,
	pivotY: o.pivot?.[1] ?? 0,
	fieldDefs: o.fields ?? [],
});

const layerDef = (identifier: string, uid: number, uiColor: string) => ({
	__type: "Entities",
	identifier,
	type: "Entities",
	uid,
	doc: null,
	uiColor,
	gridSize: LDTK_GRID,
	guideGridWid: 0,
	guideGridHei: 0,
	displayOpacity: 1,
	inactiveOpacity: 0.45,
	hideInList: false,
	hideFieldsWhenInactive: true,
	canSelectWhenInactive: true,
	renderInWorldView: true,
	pxOffsetX: 0,
	pxOffsetY: 0,
	parallaxFactorX: 0,
	parallaxFactorY: 0,
	parallaxScaling: true,
	requiredTags: [],
	excludedTags: [],
	autoTilesKilledByOtherLayerUid: null,
	uiFilterTags: [],
	useAsyncRender: false,
	intGridValues: [],
	intGridValuesGroups: [],
	autoRuleGroups: [],
	autoSourceLayerDefUid: null,
	tilesetDefUid: null,
	tilePivotX: 0,
	tilePivotY: 0,
	biomeFieldUid: null,
});

const enumDef = (identifier: string, uid: number, values: { id: string; tileRect?: LdtkTileRect }[]) => ({
	identifier,
	uid,
	values: values.map((v) => ({ id: v.id, tileRect: v.tileRect ?? null, color: 0 })),
	iconTilesetUid: values.some((v) => v.tileRect) ? UID.tileset : null,
	externalRelPath: null,
	externalFileChecksum: null,
	tags: [],
});

// --- Fábricas de instância ---

const field = (identifier: string, defUid: number, kind: FieldKind, value: unknown): LdtkFieldInstance => {
	const editorId = kind === F_BOOL ? "V_Bool" : kind === F_INT ? "V_Int" : "V_String";
	return {
		__identifier: identifier,
		__type: kind.__type,
		__value: value,
		__tile: null,
		defUid,
		realEditorValues: [{ id: editorId, params: [value] }],
	};
};

type EntityOpts = {
	px: [number, number];
	size: [number, number];
	pivot: [number, number];
	color: string;
	tile?: LdtkTileRect | null;
	fields?: LdtkFieldInstance[];
};

const entity = (identifier: string, defUid: number, o: EntityOpts): LdtkEntityInstance => ({
	__identifier: identifier,
	__grid: [Math.floor(o.px[0] / LDTK_GRID), Math.floor(o.px[1] / LDTK_GRID)],
	__pivot: o.pivot,
	__tags: [],
	__tile: o.tile ?? null,
	__smartColor: o.color,
	iid: iid(),
	width: o.size[0],
	height: o.size[1],
	defUid,
	px: o.px,
	fieldInstances: o.fields ?? [],
});

/** Entidade de canto (pivot 0,0) cobrindo um retângulo de células. */
const boxEntity = (
	identifier: string,
	defUid: number,
	cells: { x: number; y: number; w: number; h: number },
	color: string,
	fields?: LdtkFieldInstance[],
): LdtkEntityInstance =>
	entity(identifier, defUid, {
		px: [cells.x * CELL, cells.y * CELL],
		size: [cells.w * CELL, cells.h * CELL],
		pivot: [0, 0],
		color,
		fields,
	});

/** Converte o layout num projeto LDtk pronto pra abrir no editor. */
export const layoutToLdtk = (layout: OfficeLayout, atlas: PropAtlas): Record<string, unknown> => {
	iidSeq = 0;
	const world = { w: layout.grid.cols * CELL, h: layout.grid.rows * CELL };
	const tileRect = (propId: string): LdtkTileRect => tileRectOf(atlas, propId);

	const structure: LdtkEntityInstance[] = [
		...layout.floors.map((z) =>
			boxEntity(ENTITY.floorZone, UID.entFloorZone, z.rect, CATEGORY_COLOR.floor, [
				field("texture", UID.fieldTexture, fEnum(UID.enumFloorTex, ENUM.floorTex), FLOOR_TEX_TO_LDTK[z.texture]),
			]),
		),
		...layout.walls.map((r) =>
			boxEntity(
				ENTITY.wall,
				UID.entWall,
				{ x: r.from.x, y: r.from.y, w: r.to.x - r.from.x + 1, h: r.to.y - r.from.y + 1 },
				CATEGORY_COLOR.wall,
			),
		),
		...layout.glass.map((r) =>
			boxEntity(
				ENTITY.glass,
				UID.entGlass,
				{ x: r.from.x, y: r.from.y, w: r.to.x - r.from.x + 1, h: r.to.y - r.from.y + 1 },
				"#3E93A3",
				[field("frame", UID.fieldFrame, fEnum(UID.enumGlassFrame, ENUM.glassFrame), GLASS_FRAME_TO_LDTK[r.frame ?? "dark"])],
			),
		),
		...layout.doors.map((d) =>
			boxEntity(ENTITY.door, UID.entDoor, { x: d.cell.x, y: d.cell.y, w: 1, h: 1 }, CATEGORY_COLOR.door, [
				field("kind", UID.fieldKind, fEnum(UID.enumDoorKind, ENUM.doorKind), DOOR_KIND_TO_LDTK[d.kind]),
			]),
		),
	];

	const furniture = layout.furniture.map((item) => {
		const spec = getProp(item.propId);
		// px = a baseline da peça (mesmo ponto que a cena usa) — inteiro, que é o que o LDtk guarda.
		const bx = Math.round((item.cell.x + 0.5) * CELL + (item.offset?.x ?? 0) * CELL);
		const by = Math.round((item.cell.y + 1) * CELL + (item.offset?.y ?? 0) * CELL);
		return entity(ENTITY.prop, UID.entProp, {
			px: [bx, by],
			size: [Math.round(spec.displayW), Math.round(propDisplayHeight(spec))],
			pivot: [0.5, 1],
			color: CATEGORY_COLOR[spec.category],
			tile: tileRect(item.propId),
			fields: [
				field("propId", UID.fieldPropId, fEnum(UID.enumPropId, ENUM.propId), propEnumId(item.propId)),
				field("flip", UID.fieldFlip, F_BOOL, item.flip ?? false),
				field("angle", UID.fieldAngle, F_INT, item.angle ?? 0),
			],
		});
	});

	const anchors: LdtkEntityInstance[] = [
		...layout.deskAnchors.map((a) =>
			boxEntity(ENTITY.deskAnchor, UID.entDeskAnchor, { x: a.cell.x, y: a.cell.y, w: 1, h: 1 }, "#4F8AE8", [
				field("slot", UID.fieldSlot, F_INT, a.slot),
				field("facing", UID.fieldFacingDesk, fEnum(UID.enumFacing, ENUM.facing), FACING_TO_LDTK[a.facing]),
			]),
		),
		boxEntity(
			ENTITY.coordinator,
			UID.entCoordinator,
			{ x: layout.coordinator.cell.x, y: layout.coordinator.cell.y, w: 1, h: 1 },
			"#B8792A",
			[field("facing", UID.fieldFacingCoord, fEnum(UID.enumFacing, ENUM.facing), FACING_TO_LDTK[layout.coordinator.facing])],
		),
	];

	const layerInstance = (identifier: string, defUid: number, entityInstances: LdtkEntityInstance[]) => ({
		__identifier: identifier,
		__type: "Entities",
		__cWid: layout.grid.cols,
		__cHei: layout.grid.rows,
		__gridSize: LDTK_GRID,
		__opacity: 1,
		__pxTotalOffsetX: 0,
		__pxTotalOffsetY: 0,
		__tilesetDefUid: null,
		__tilesetRelPath: null,
		iid: iid(),
		levelId: UID.level,
		layerDefUid: defUid,
		pxOffsetX: 0,
		pxOffsetY: 0,
		visible: true,
		optionalRules: [],
		intGridCsv: [],
		autoLayerTiles: [],
		seed: 1,
		overrideTilesetUid: null,
		gridTiles: [],
		entityInstances,
	});

	return {
		__header__: {
			fileType: "LDtk Project JSON",
			app: "LDtk",
			doc: "https://ldtk.io/json",
			schema: "https://ldtk.io/files/JSON_SCHEMA.json",
			appAuthor: "Sebastien 'deepnight' Benard",
			appVersion: LDTK_JSON_VERSION,
			url: "https://ldtk.io",
		},
		iid: "00000000-0000-4000-8000-ffffffffff00",
		jsonVersion: LDTK_JSON_VERSION,
		appBuildId: 473702,
		nextUid: 1000,
		// "Free": nossos ids de peça (P01_...) não seguem o estilo Capitalize e não podem ser renomeados.
		identifierStyle: "Free",
		toc: [],
		worldLayout: "Free",
		worldGridWidth: world.w,
		worldGridHeight: world.h,
		defaultLevelWidth: world.w,
		defaultLevelHeight: world.h,
		defaultPivotX: 0.5,
		defaultPivotY: 1,
		defaultGridSize: LDTK_GRID,
		defaultEntityWidth: LDTK_GRID,
		defaultEntityHeight: LDTK_GRID,
		bgColor: "#40465B",
		defaultLevelBgColor: "#5A4632",
		minifyJson: false,
		externalLevels: false,
		exportTiled: false,
		simplifiedExport: false,
		imageExportMode: "None",
		exportLevelBg: true,
		pngFilePattern: null,
		backupOnSave: false,
		backupLimit: 10,
		backupRelPath: null,
		levelNamePattern: "%world_Level_%idx",
		tutorialDesc: null,
		customCommands: [],
		flags: [],
		defs: {
			layers: [
				layerDef(LAYER.furniture, UID.layerFurniture, "#E5A44D"),
				layerDef(LAYER.anchors, UID.layerAnchors, "#4F8AE8"),
				layerDef(LAYER.structure, UID.layerStructure, "#94A0B2"),
			],
			entities: [
				entityDef(ENTITY.prop, UID.entProp, {
					pivot: [0.5, 1],
					color: CATEGORY_COLOR.decor,
					tile: tileRect(PROP_IDS[0]),
					fields: [
						// EntityTile = a peça aparece no editor com o sprite do valor escolhido.
						fieldDef("propId", UID.fieldPropId, fEnum(UID.enumPropId, ENUM.propId), "EntityTile"),
						// "Hidden" = sem rótulo flutuante no mundo (com ~40 peças vira poluição);
						// continuam editáveis no painel da entidade selecionada.
						fieldDef("flip", UID.fieldFlip, F_BOOL, "Hidden"),
						fieldDef("angle", UID.fieldAngle, F_INT, "Hidden"),
					],
				}),
				entityDef(ENTITY.floorZone, UID.entFloorZone, {
					resizable: true,
					color: CATEGORY_COLOR.floor,
					fields: [fieldDef("texture", UID.fieldTexture, fEnum(UID.enumFloorTex, ENUM.floorTex))],
				}),
				entityDef(ENTITY.wall, UID.entWall, { resizable: true, color: CATEGORY_COLOR.wall }),
				entityDef(ENTITY.glass, UID.entGlass, {
					resizable: true,
					color: "#3E93A3",
					fields: [fieldDef("frame", UID.fieldFrame, fEnum(UID.enumGlassFrame, ENUM.glassFrame))],
				}),
				entityDef(ENTITY.door, UID.entDoor, {
					color: CATEGORY_COLOR.door,
					fields: [fieldDef("kind", UID.fieldKind, fEnum(UID.enumDoorKind, ENUM.doorKind))],
				}),
				entityDef(ENTITY.deskAnchor, UID.entDeskAnchor, {
					color: "#4F8AE8",
					fields: [
						fieldDef("slot", UID.fieldSlot, F_INT, "ValueOnly"),
						fieldDef("facing", UID.fieldFacingDesk, fEnum(UID.enumFacing, ENUM.facing)),
					],
				}),
				entityDef(ENTITY.coordinator, UID.entCoordinator, {
					color: "#B8792A",
					fields: [fieldDef("facing", UID.fieldFacingCoord, fEnum(UID.enumFacing, ENUM.facing))],
				}),
			],
			tilesets: [
				{
					__cWid: atlas.w / atlas.slot,
					__cHei: atlas.h / atlas.slot,
					identifier: "OfficeProps",
					uid: UID.tileset,
					relPath: ATLAS_REL_PATH,
					embedAtlas: null,
					pxWid: atlas.w,
					pxHei: atlas.h,
					tileGridSize: atlas.slot,
					spacing: 0,
					padding: 0,
					tags: [],
					tagsSourceEnumUid: null,
					enumTags: [],
					customData: [],
					savedSelections: [],
					cachedPixelData: {},
				},
			],
			enums: [
				enumDef(
					ENUM.propId,
					UID.enumPropId,
					PROP_IDS.map((id) => ({ id: propEnumId(id), tileRect: tileRect(id) })),
				),
				enumDef(ENUM.facing, UID.enumFacing, [{ id: "Left" }, { id: "Right" }]),
				enumDef(ENUM.floorTex, UID.enumFloorTex, [{ id: "Wood" }, { id: "MeetingCarpet" }]),
				enumDef(ENUM.glassFrame, UID.enumGlassFrame, [{ id: "Dark" }, { id: "Cream" }]),
				enumDef(ENUM.doorKind, UID.enumDoorKind, [{ id: "GlassSingle" }, { id: "GlassDouble" }]),
			],
			externalEnums: [],
			levelFields: [],
		},
		levels: [
			{
				identifier: "Office",
				iid: "00000000-0000-4000-8000-ffffffffff01",
				uid: UID.level,
				worldX: 0,
				worldY: 0,
				worldDepth: 0,
				pxWid: world.w,
				pxHei: world.h,
				__bgColor: "#5A4632",
				bgColor: null,
				useAutoIdentifier: false,
				bgRelPath: null,
				bgPos: null,
				bgPivotX: 0.5,
				bgPivotY: 0.5,
				__smartColor: "#8A8A94",
				__bgPos: null,
				externalRelPath: null,
				fieldInstances: [],
				layerInstances: [
					layerInstance(LAYER.furniture, UID.layerFurniture, furniture),
					layerInstance(LAYER.anchors, UID.layerAnchors, anchors),
					layerInstance(LAYER.structure, UID.layerStructure, structure),
				],
				__neighbours: [],
			},
		],
		worlds: [],
		dummyWorldIid: "00000000-0000-4000-8000-ffffffffff02",
	};
};
