/**
 * Manifesto das peças de parede (/public/office_walls) — PNGs pixel-art gerados por
 * scripts/generate-office-walls.mjs.
 *
 * As peças são LADRILHÁVEIS: um `body` de UMA célula que a cena repete para qualquer comprimento,
 * mais as pontas (pilar nas horizontais, cap nas verticais). Comprimento não é mais problema de
 * asset — esticar uma parede no LDtk sempre funciona.
 */

// `?? "/"` cobre os scripts de autoria, que importam este módulo fora do Vite (sem import.meta.env).
const base = () => import.meta.env?.BASE_URL ?? "/";

/** Altura total da arte da face de uma parede horizontal (world px). */
export const WALL_FACE_H = 112;
/**
 * Sombra de contato: os px finais da arte, semitransparentes, que caem no PISO abaixo da parede.
 * A base real da parede é `WALL_FACE_H - WALL_CONTACT_H` — ancorar pela arte a subiria 8px.
 */
export const WALL_CONTACT_H = 8;
/** Altura do corpo sólido: da borda superior da arte até a base que encosta no chão. */
export const WALL_SOLID_H = WALL_FACE_H - WALL_CONTACT_H;
/** Largura de paredes verticais (world px). */
export const WALL_SIDE_W = 48;
/** Largura do pilar das pontas de parede horizontal. */
export const WALL_PILLAR_W = 24;
/** Altura do cap das pontas de parede vertical. */
export const WALL_CAP_H = 24;

export type WallKind = "wall" | "glass_dark" | "glass_cream";

export type WallAsset = {
	id: string;
	url: string;
	/** Dimensões exatas do PNG (sem margens — dispensa trim). */
	w: number;
	h: number;
};

const asset = (id: string, w: number, h: number): WallAsset => ({
	id,
	url: `${base()}office_walls/${id}.png`,
	w,
	h,
});

/** Id do ladrilho de 1 célula de um trecho. */
export const wallBodyId = (kind: WallKind, horizontal: boolean): string => `${kind}_${horizontal ? "h" : "v"}_body`;

/** Pontas — cream para qualquer tipo de trecho (inclusive vidro), como na imagem de referência. */
export const WALL_PILLAR_ID = "wall_h_pillar";
export const WALL_CAP_ID = "wall_v_cap";

export const WALL_ASSETS: Record<string, WallAsset> = {
	wall_h_body: asset("wall_h_body", 64, WALL_FACE_H),
	wall_h_pillar: asset("wall_h_pillar", WALL_PILLAR_W, WALL_FACE_H),
	wall_v_body: asset("wall_v_body", WALL_SIDE_W, 64),
	wall_v_cap: asset("wall_v_cap", WALL_SIDE_W, WALL_CAP_H),
	glass_dark_h_body: asset("glass_dark_h_body", 64, WALL_FACE_H),
	glass_cream_h_body: asset("glass_cream_h_body", 64, WALL_FACE_H),
	glass_dark_v_body: asset("glass_dark_v_body", WALL_SIDE_W, 64),
	glass_cream_v_body: asset("glass_cream_v_body", WALL_SIDE_W, 64),
	// (dimensões conferidas contra os PNGs em asset-manifest.test.ts)
};

/** Chave de textura de uma peça de parede no cache do Phaser. */
export const wallTexKey = (id: string): string => `wall:${id}`;
