/**
 * Lê os tokens de cor do app (CSS vars, hoje hex) e devolve números RGB p/ o Phaser. Assim a cena
 * acompanha tema claro/escuro sem cores cruas. Fallback via canvas cobre tokens não-hex (ex.: oklch).
 */

export type OfficePalette = {
	background: number;
	card: number;
	wallFace: number;
	wallCap: number;
	primary: number;
	warning: number;
	success: number;
	foreground: number;
	glassTint: number;
};

const parseColor = (value: string): number | null => {
	const v = value.trim();
	if (!v) return null;
	if (v.startsWith("#")) {
		const hex = v.slice(1);
		const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
		const n = Number.parseInt(full.slice(0, 6), 16);
		return Number.isNaN(n) ? null : n;
	}
	const ctx = document.createElement("canvas").getContext("2d");
	if (!ctx) return null;
	ctx.fillStyle = "#000";
	ctx.fillStyle = v;
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
	return (r << 16) | (g << 8) | b;
};

/** Mistura dois RGB (0..1). */
const mix = (a: number, b: number, t: number): number => {
	const ar = (a >> 16) & 0xff;
	const ag = (a >> 8) & 0xff;
	const ab = a & 0xff;
	const br = (b >> 16) & 0xff;
	const bg = (b >> 8) & 0xff;
	const bb = b & 0xff;
	const r = Math.round(ar + (br - ar) * t);
	const g = Math.round(ag + (bg - ag) * t);
	const bl = Math.round(ab + (bb - ab) * t);
	return (r << 16) | (g << 8) | bl;
};

export const readPalette = (el: HTMLElement = document.documentElement): OfficePalette => {
	const cs = getComputedStyle(el);
	const c = (name: string, fallback: number): number => parseColor(cs.getPropertyValue(name)) ?? fallback;

	const card = c("--card", 0xffffff);
	const border = c("--border", 0xe5e2d8);
	const background = c("--muted", 0xf2f0e9);
	return {
		background,
		card,
		// Parede cream: face clara (mistura card↔border) e um friso mais escuro no topo.
		wallFace: mix(card, border, 0.35),
		wallCap: mix(border, 0x000000, 0.12),
		primary: c("--primary", 0x4f8ae8),
		warning: c("--warning", 0xb8792a),
		success: c("--success", 0x4f7a52),
		foreground: c("--foreground", 0x26251f),
		glassTint: mix(c("--primary", 0x4f8ae8), background, 0.55),
	};
};
