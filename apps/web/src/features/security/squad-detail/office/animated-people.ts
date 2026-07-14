import type { PersonKey, PersonPose } from "./office-assets";

/**
 * Assets de sprite animados (pixel-art) em /public/assets/avatares_animados. Usa `BASE_URL` (não
 * string crua com "/") porque no build Electron o app é servido via `file://` — ver `office-assets.ts`.
 */
const base = () => import.meta.env.BASE_URL;

export type AnimName = "walk" | "idle";

export type SpriteSheet = {
	src: string;
	tileW: number;
	tileH: number;
	frames: number;
	durationMs: number;
};

const TILE_H = 90;

const DURATION_MS: Record<AnimName, number> = { walk: 550, idle: 1400 };

type ComboKey = `${PersonPose}_${AnimName}`;
type ComboSpec = { tileW: number; frames: number };

/**
 * Só os 3 personagens com folha de sprite pronta (os demais ficam estáticos até serem animados).
 * Dimensões medidas diretamente nos arquivos (largura ÷ tileW) — a tabela de spec original estava
 * errada no `seated_idle` (dizia 6 frames, os arquivos reais têm 4).
 * Combos existentes por pose: front (idle + walk), back (só walk), side (idle + walk), seated (só idle).
 */
const ANIMATED_SHEETS: Partial<Record<PersonKey, Partial<Record<ComboKey, ComboSpec>>>> = {
	"01_manager-navy": {
		seated_idle: { tileW: 49, frames: 4 },
		front_idle: { tileW: 40, frames: 6 },
		front_walk: { tileW: 40, frames: 4 },
		back_walk: { tileW: 40, frames: 4 },
		side_idle: { tileW: 42, frames: 6 },
		side_walk: { tileW: 42, frames: 4 },
	},
	"02_orange-yellow": {
		seated_idle: { tileW: 56, frames: 4 },
		front_idle: { tileW: 38, frames: 6 },
		front_walk: { tileW: 38, frames: 4 },
		back_walk: { tileW: 37, frames: 4 },
		side_idle: { tileW: 42, frames: 6 },
		side_walk: { tileW: 42, frames: 4 },
	},
	"03_dark-purple": {
		seated_idle: { tileW: 51, frames: 4 },
		front_idle: { tileW: 40, frames: 6 },
		front_walk: { tileW: 40, frames: 4 },
		back_walk: { tileW: 40, frames: 4 },
		side_idle: { tileW: 42, frames: 6 },
		side_walk: { tileW: 42, frames: 4 },
	},
};

/** Folha animada de `key`/`pose`/`anim`, ou `null` quando o personagem ou o combo não tem sprite pronto. */
export const getAnimatedSheet = (key: PersonKey, pose: PersonPose, anim: AnimName): SpriteSheet | null => {
	const spec = ANIMATED_SHEETS[key]?.[`${pose}_${anim}`];
	if (!spec) return null;
	return {
		src: `${base()}assets/avatares_animados/${key}_${pose}_${anim}.png`,
		tileW: spec.tileW,
		tileH: TILE_H,
		frames: spec.frames,
		durationMs: DURATION_MS[anim],
	};
};

/** Se `key` tem ao menos uma folha animada registrada. */
export const hasAnimated = (key: PersonKey): boolean => Boolean(ANIMATED_SHEETS[key]);
