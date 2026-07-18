import metrics from "./prop-metrics.generated.json";

/**
 * Manifesto das 53 peças de mobília/decoração (/public/assets_office_transparente). Junta as métricas
 * medidas (native + trim de conteúdo, ver measure-office-props.mjs) com metadados de render: categoria,
 * tamanho de exibição, origem (baseline), e flags de parede. Os PNGs têm margem transparente generosa
 * e um artefato de 1px na borda — por isso renderizamos sempre o FRAME TRIMADO, nunca o canvas cheio.
 *
 * Adicionar/ajustar uma peça: rode o script de medição e, se precisar, adicione um override em OVERRIDES.
 */

// `?? "/"` cobre os scripts de autoria, que importam este módulo fora do Vite (sem import.meta.env).
const base = () => import.meta.env?.BASE_URL ?? "/";

export type PropCategory =
	| "desk"
	| "table"
	| "chair"
	| "divider"
	| "storage"
	| "tech"
	| "plant"
	| "decor"
	| "lounge"
	| "floor"
	| "wall"
	| "door"
	| "wall-mounted";

type PropMetric = { native: { w: number; h: number }; trim: { x: number; y: number; w: number; h: number } };

export type PropSpec = {
	id: string;
	/** URL para o loader do Phaser (via BASE_URL — build Electron roda em file://). */
	url: string;
	native: { w: number; h: number };
	/** Retângulo do conteúdo dentro do canvas nativo (registrado como frame no Phaser). */
	trim: { x: number; y: number; w: number; h: number };
	/** Largura de exibição em world px (altura sai do aspect do trim). Default = trim.w (1:1). */
	displayW: number;
	/** Origem 0..1 do frame trimado. Default baseline (0.5, 1). */
	origin: { x: number; y: number };
	category: PropCategory;
	/** Pendurado na parede: posicionado no Y da parede, sem y-sort por baseline. */
	wallMounted?: boolean;
	/** Viés de profundidade sobre o depth base por Y (ex.: tapetes ficam logo acima do piso). */
	depthOffset?: number;
	allowFlip?: boolean;
};

type Override = Partial<Pick<PropSpec, "displayW" | "origin" | "wallMounted" | "depthOffset" | "allowFlip">> & {
	category: PropCategory;
};

// Categoria (sempre) + ajustes finos (opcionais) por peça. displayW omitido = trim.w.
const OVERRIDES: Record<string, Override> = {
	"01_workstation-desk-l-empty": { category: "desk", displayW: 150, allowFlip: true },
	"02_conference-table-empty": { category: "table", displayW: 150 },
	"03_manager-desk-empty": { category: "desk", displayW: 150 },
	"04_coffee-table-empty": { category: "table", displayW: 96 },
	"05_snack-storage-cabinet-empty": { category: "storage", displayW: 110 },
	"06_filing-shelf-empty": { category: "storage", displayW: 120 },
	"07_office-chair-teal": { category: "chair", displayW: 74, allowFlip: true },
	"08_computer-monitor-black": { category: "tech", displayW: 82 },
	"09_keyboard-black": { category: "tech", displayW: 60 },
	"10_mouse-black": { category: "tech", displayW: 22 },
	"11_acoustic-divider-teal": { category: "divider", displayW: 34, allowFlip: true },
	"12_drawer-pedestal-gray": { category: "storage", displayW: 60, allowFlip: true },
	"13_desk-plant-small": { category: "plant", displayW: 34 },
	"14_office-waste-bin": { category: "decor", displayW: 34 },
	"15_conference-chair-teal": { category: "chair", displayW: 60, allowFlip: true },
	"16_conference-centerpiece": { category: "decor", displayW: 60 },
	"17_table-control-device": { category: "tech", displayW: 40 },
	"18_manager-chair-teal": { category: "chair", displayW: 68, allowFlip: true },
	"19_bookcase-filled-variant": { category: "storage", displayW: 120 },
	"20_manager-monitor-left": { category: "tech", displayW: 60 },
	"21_manager-monitor-right": { category: "tech", displayW: 60 },
	"22_wall-analytics-dashboard": { category: "wall-mounted", displayW: 120, origin: { x: 0.5, y: 0.5 }, wallMounted: true },
	"23_sofa-blue": { category: "lounge", displayW: 126, allowFlip: true },
	"24_lounge-armchair-teal": { category: "lounge", displayW: 82, allowFlip: true },
	"25_office-magazine": { category: "decor", displayW: 40 },
	"26_water-dispenser": { category: "decor", displayW: 44 },
	"27_multifunction-printer": { category: "tech", displayW: 90 },
	"28_filing-cabinet-filled-variant": { category: "storage", displayW: 96 },
	"29_noticeboard-notes": { category: "wall-mounted", displayW: 96, origin: { x: 0.5, y: 0.5 }, wallMounted: true },
	"30_floor-plant-large": { category: "plant", displayW: 64 },
	"31_floor-plant-small": { category: "plant", displayW: 48 },
	"32_recycling-bin-blue": { category: "decor", displayW: 44 },
	"33_microwave-black": { category: "decor", displayW: 60 },
	"34_coffee-machine": { category: "decor", displayW: 52 },
	"35_snack-bowl": { category: "decor", displayW: 34 },
	"36_snack-bag": { category: "decor", displayW: 30 },
	"37_sofa-cushion-orange": { category: "decor", displayW: 34 },
	"38_sofa-cushion-teal": { category: "decor", displayW: 34 },
	"39_office-binder-single": { category: "decor", displayW: 26 },
	"40_storage-box-small": { category: "storage", displayW: 44 },
	"41_bookcase-tall-empty": { category: "storage", displayW: 110 },
	"42_wood-floor-tile": { category: "floor", origin: { x: 0.5, y: 0.5 } },
	"43_meeting-carpet-tile": { category: "floor", origin: { x: 0.5, y: 0.5 } },
	"44_lounge-rug-orange": { category: "floor", displayW: 240, origin: { x: 0.5, y: 0.5 }, depthOffset: 40 },
	"45_glass-wall-panel": { category: "wall", origin: { x: 0.5, y: 1 } },
	"46_glass-meeting-door": { category: "door", origin: { x: 0.5, y: 1 } },
	"47_glass-entrance-double-door": { category: "door", origin: { x: 0.5, y: 1 } },
	"48_wall-sconce-cream": { category: "wall-mounted", displayW: 34, origin: { x: 0.5, y: 0.5 }, wallMounted: true },
	"49_framed-city-picture": { category: "wall-mounted", displayW: 80, origin: { x: 0.5, y: 0.5 }, wallMounted: true },
	"50_access-control-terminal": { category: "wall-mounted", displayW: 34, origin: { x: 0.5, y: 0.5 }, wallMounted: true },
	"51_indoor-planter-box": { category: "plant", displayW: 64 },
	"52_exterior-flower-planter": { category: "plant", displayW: 64 },
	"53_low-side-cabinet": { category: "storage", displayW: 96 },
};

const metricsMap = metrics as Record<string, PropMetric>;

const buildSpec = (id: string): PropSpec => {
	const metric = metricsMap[id];
	const override = OVERRIDES[id];
	if (!metric) throw new Error(`prop-manifest: sem métricas para "${id}" — rode measure-office-props.mjs`);
	if (!override) throw new Error(`prop-manifest: sem override/categoria para "${id}"`);
	return {
		id,
		url: `${base()}assets_office_transparente/${id}.png`,
		native: metric.native,
		trim: metric.trim,
		displayW: override.displayW ?? metric.trim.w,
		origin: override.origin ?? { x: 0.5, y: 1 },
		category: override.category,
		wallMounted: override.wallMounted,
		depthOffset: override.depthOffset,
		allowFlip: override.allowFlip,
	};
};

export const PROP_MANIFEST: Record<string, PropSpec> = Object.fromEntries(
	Object.keys(OVERRIDES).map((id) => [id, buildSpec(id)]),
);

export const PROP_IDS = Object.keys(PROP_MANIFEST);

/** Altura de exibição derivada do aspect do trim. */
export const propDisplayHeight = (spec: PropSpec): number => (spec.displayW * spec.trim.h) / spec.trim.w;

export const getProp = (id: string): PropSpec => {
	const spec = PROP_MANIFEST[id];
	if (!spec) throw new Error(`prop-manifest: peça desconhecida "${id}"`);
	return spec;
};
