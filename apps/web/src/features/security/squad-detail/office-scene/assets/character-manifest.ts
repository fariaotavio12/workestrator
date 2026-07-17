import type { PersonKey, PersonPose } from "../../office/office-assets";

/**
 * Manifesto de personagens para a cena Phaser. Cada sheet é 1280×1280 = grade 5×5 de 25 frames de
 * 256×256 (pixel-art, fundo transparente, estilo da imagem de referência). Adicionar um sheet novo
 * que o usuário gerar = UMA entrada aqui — o BootScene carrega só o que a cena pede.
 *
 * Hoje só `seated_idle` é usado (agentes ficam parados). Os sheets de caminhada do manager já existem
 * no disco e estão mapeados, mas a cena ainda não os carrega — movimento entra quando houver walk para
 * todos os personagens (ver plano). Personagem/animação sem sheet cai numa pose estática de
 * /public/bonecos_transparentes.
 */

const base = () => import.meta.env.BASE_URL;

/** Os 7 personagens pixel-art (prefixo do arquivo em /public/bonecos_transparentes). */
export const PERSON_KEYS: PersonKey[] = [
	"01_manager-navy",
	"02_orange-yellow",
	"03_dark-purple",
	"04_brown-green",
	"05_black-charcoal",
	"06_blond-blue",
	"07_brown-red",
];

/** Poses estáticas que servem de fallback (existe PNG para cada personagem × pose). */
export const FALLBACK_POSES: PersonPose[] = ["seated", "front", "back", "side"];

export type OfficeAnim = "seated_idle" | "walk_down" | "walk_up" | "walk_side" | "stand_idle";

/**
 * Região do boneco dentro do frame (frames de IA têm muita margem transparente). Normalizado 0..1:
 * `cx` = centro-x do conteúdo, `feetY` = base (pés), `hFrac` = altura do conteúdo / altura do frame.
 * Usado para ancorar/escalar o sprite pelo boneco real (medido com sharp nos 25 frames).
 */
export type SheetContent = { cx: number; feetY: number; hFrac: number };

export type SheetSpec = {
	/** Nome do arquivo em /public/assets/avatares_animados (sem diretório). */
	file: string;
	frameW: number;
	frameH: number;
	/** Grade do sheet (colunas × linhas) — usado para validar dimensões e recortar frames. */
	cols: number;
	rows: number;
	/** Subconjunto de frames [start, end] inclusivo, quando alguns frames da IA saem ruins. */
	frames: { start: number; end: number };
	fps: number;
	loop: boolean;
	content: SheetContent;
};

const GRID = { frameW: 256, frameH: 256, cols: 5, rows: 5, frames: { start: 0, end: 24 } };
// Bbox medido nos 25 frames sentados (sharp) — todos os personagens sentados compartilham o estilo.
const SEATED: Omit<SheetSpec, "file" | "fps" | "loop"> = { ...GRID, content: { cx: 0.494, feetY: 0.852, hFrac: 0.71 } };
// Boneco em pé ocupa mais alto no frame (estimativa até haver sheets de caminhada para medir).
const WALK: Omit<SheetSpec, "file" | "fps" | "loop"> = { ...GRID, content: { cx: 0.5, feetY: 0.95, hFrac: 0.86 } };

/**
 * Sheets existentes por personagem. Só `seated_idle` de 01/02/03 e walk do manager estão prontos hoje.
 * O resto dos combos cai no fallback estático até o usuário gerar os sheets.
 */
export const CHARACTER_SHEETS: Partial<Record<PersonKey, Partial<Record<OfficeAnim, SheetSpec>>>> = {
	"01_manager-navy": {
		seated_idle: { ...SEATED, file: "01_manager-navy_seated_idle.png", fps: 8, loop: true },
		walk_down: { ...WALK, file: "01_manager-navy_walk_down.png", fps: 12, loop: true },
		walk_up: { ...WALK, file: "01_manager-navy_walk_up.png", fps: 12, loop: true },
	},
	"02_orange-yellow": {
		seated_idle: { ...SEATED, file: "02_orange-yellow_seated_idle.png", fps: 8, loop: true },
	},
	"03_dark-purple": {
		seated_idle: { ...SEATED, file: "03_dark-purple_seated_idle.png", fps: 8, loop: true },
	},
};

export const sheetUrl = (spec: SheetSpec): string => `${base()}assets/avatares_animados/${spec.file}`;

/** Chave de textura/animação estável no Phaser para um sheet. */
export const sheetKey = (key: PersonKey, anim: OfficeAnim): string => `${key}:${anim}`;

/** Pose estática usada quando não há sheet para o combo personagem/animação. */
const FALLBACK_POSE: Record<OfficeAnim, { pose: PersonPose; flipX?: boolean }> = {
	seated_idle: { pose: "seated" },
	stand_idle: { pose: "front" },
	walk_down: { pose: "front" },
	walk_up: { pose: "back" },
	walk_side: { pose: "side" },
};

export const staticPoseUrl = (key: PersonKey, pose: PersonPose): string =>
	`${base()}bonecos_transparentes/${key}_${pose}.png`;

/** Chave de textura estável para uma pose estática. */
export const staticPoseKey = (key: PersonKey, pose: PersonPose): string => `${key}:static:${pose}`;

export type CharacterVisual =
	| { kind: "sheet"; spec: SheetSpec; animKey: string; textureKey: string; url: string; flipX?: boolean }
	| { kind: "static"; pose: PersonPose; textureKey: string; url: string; flipX?: boolean };

export const getSheet = (key: PersonKey, anim: OfficeAnim): SheetSpec | undefined => CHARACTER_SHEETS[key]?.[anim];

/**
 * Resolve como desenhar `key` na animação `anim`: sheet animado se existir, senão pose estática
 * equivalente (com flipX quando a pose base precisa espelhar).
 */
export const resolveCharacterVisual = (key: PersonKey, anim: OfficeAnim): CharacterVisual => {
	const spec = getSheet(key, anim);
	if (spec) {
		return { kind: "sheet", spec, animKey: sheetKey(key, anim), textureKey: sheetKey(key, anim), url: sheetUrl(spec) };
	}
	const fallback = FALLBACK_POSE[anim];
	return {
		kind: "static",
		pose: fallback.pose,
		textureKey: staticPoseKey(key, fallback.pose),
		url: staticPoseUrl(key, fallback.pose),
		flipX: fallback.flipX,
	};
};
