/**
 * Gera as peças de parede do escritório (public/office_walls) em pixel-art, no estilo da imagem de
 * referência: cream com friso/cap cinza e pilares nas pontas, vidro escuro (sala de reunião) e vidro
 * claro com caixilho cream (fachada sul).
 *
 * As peças são LADRILHÁVEIS: um "body" de UMA célula que a cena repete (tileSprite) para qualquer
 * comprimento, mais as pontas (pilar/cap). Antes existia um PNG por comprimento exato de parede — o
 * que fazia qualquer redimensionamento no LDtk derrubar a cena com "sem asset wall_hN". Agora o
 * comprimento é problema do renderizador, não do asset: esticar parede no editor sempre funciona.
 *
 * O body tem meia junta (2px) em cada borda, então ladrilhar produz a junta de 4px na divisa de célula.
 *
 * Determinístico: o ruído usa LCG com seed fixa por arquivo — regerar não suja o git.
 * Rodar: node scripts/generate-office-walls.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/office_walls");
const CELL = 64;
/** Altura da face de paredes horizontais e largura de paredes verticais (world px). */
const WALL_H = 112;
const WALL_W = 48;
/** Sombra de contato: os N px finais da face, que caem no PISO abaixo da base da parede. */
const CONTACT_H = 8;
/** Lado do "pixelão" — tudo alinhado a 4px para a leitura pixel-art casar com o resto da cena. */
const CHUNK = 4;
const PILLAR_W = 24;
/** Altura do cap das pontas de parede vertical. */
const CAP_H = 24;

// Paleta amostrada da imagem de referência.
const P = {
	capTop: [242, 242, 238, 255],
	capFace: [205, 208, 207, 255],
	capEdge: [158, 162, 161, 255],
	face: [234, 228, 213, 255],
	faceShade: [224, 217, 199, 255],
	seam: [216, 209, 192, 255],
	base: [201, 193, 174, 255],
	baseDark: [179, 169, 150, 255],
	contact: [90, 82, 70, 110],
	pilFace: [220, 213, 197, 255],
	pilLight: [243, 239, 227, 255],
	pilDark: [170, 161, 144, 255],
};

// Estilos de vidro: escuro (sala de reunião) e claro com caixilho cream (fachada sul).
const GLASS = {
	dark: {
		railTop: [109, 115, 118, 255],
		rail: [77, 83, 86, 255],
		railDark: [58, 63, 66, 255],
		glass: [62, 147, 163, 205],
		glassDeep: [46, 119, 135, 205],
		streak: [143, 217, 226, 225],
		streakBright: [200, 238, 242, 235],
	},
	cream: {
		railTop: [239, 233, 219, 255],
		rail: [221, 214, 196, 255],
		railDark: [183, 173, 153, 255],
		glass: [142, 203, 220, 150],
		glassDeep: [116, 182, 202, 150],
		streak: [216, 241, 246, 205],
		streakBright: [240, 250, 252, 225],
	},
};

class Img {
	constructor(w, h) {
		this.w = w;
		this.h = h;
		this.data = new Uint8ClampedArray(w * h * 4);
	}
	rect(x, y, w, h, [r, g, b, a]) {
		const x1 = Math.min(this.w, x + w);
		const y1 = Math.min(this.h, y + h);
		for (let py = Math.max(0, y); py < y1; py++) {
			for (let px = Math.max(0, x); px < x1; px++) {
				const i = (py * this.w + px) * 4;
				this.data[i] = r;
				this.data[i + 1] = g;
				this.data[i + 2] = b;
				this.data[i + 3] = a;
			}
		}
	}
}

const makeRng = (seed) => {
	let s = seed >>> 0;
	return () => {
		s = (s * 1664525 + 1013904223) >>> 0;
		return s / 2 ** 32;
	};
};

/** Variação sutil por pixelão para a superfície não ficar chapada. */
const jitter = (rng, [r, g, b, a], amp = 4) => {
	const d = Math.round((rng() - 0.5) * 2 * amp);
	return [r + d, g + d, b + d, a];
};

/** Preenche uma área com pixelões da cor `color` (com ruído). */
const fillChunks = (img, x, y, w, h, color, rng, amp) => {
	for (let cy = y; cy < y + h; cy += CHUNK) {
		for (let cx = x; cx < x + w; cx += CHUNK) {
			img.rect(cx, cy, CHUNK, CHUNK, jitter(rng, color, amp));
		}
	}
};

/** Uma célula de parede cream horizontal: cap cinza, face cream, rodapé e sombra de contato. */
const drawWallBodyH = (rng) => {
	const img = new Img(CELL, WALL_H);
	img.rect(0, 0, CELL, 8, P.capTop);
	img.rect(0, 8, CELL, 16, P.capFace);
	img.rect(0, 24, CELL, 4, P.capEdge);
	fillChunks(img, 0, 28, CELL, 48, P.face, rng, 4);
	fillChunks(img, 0, 76, CELL, 12, P.faceShade, rng, 4);
	// Meia junta em cada borda — ladrilhado, vira a junta inteira na divisa das células.
	img.rect(0, 28, 2, 60, P.seam);
	img.rect(CELL - 2, 28, 2, 60, P.seam);
	img.rect(0, 88, CELL, 8, P.base);
	img.rect(0, 96, CELL, WALL_H - CONTACT_H - 96, P.baseDark);
	img.rect(0, WALL_H - CONTACT_H, CELL, CONTACT_H, P.contact);
	return img;
};

/** Pilar cream das pontas de qualquer parede horizontal. */
const drawPillarH = (rng) => {
	const img = new Img(PILLAR_W, WALL_H);
	img.rect(0, 0, PILLAR_W, 4, P.pilLight);
	fillChunks(img, 0, 4, PILLAR_W, 100, P.pilFace, rng, 3);
	img.rect(0, 4, 4, 100, P.pilLight);
	img.rect(PILLAR_W - 4, 4, 4, 100, P.pilDark);
	img.rect(0, 104, PILLAR_W, 8, P.contact);
	return img;
};

/** Uma célula de vidraça horizontal: trilhos, vidro com brilhos diagonais e montante nas bordas. */
const drawGlassBodyH = (style, rng) => {
	const g = GLASS[style];
	const img = new Img(CELL, WALL_H);
	img.rect(0, 0, CELL, 8, g.railTop);
	img.rect(0, 8, CELL, 12, g.rail);
	img.rect(0, 20, CELL, 8, g.railDark);
	for (let cy = 28; cy < 84; cy += CHUNK) {
		for (let cx = 0; cx < CELL; cx += CHUNK) {
			const diag = (cx + cy) / CHUNK;
			let color = cy >= 64 ? g.glassDeep : g.glass;
			if (diag % 34 < 2) color = g.streakBright;
			else if (diag % 17 < 3) color = g.streak;
			img.rect(cx, cy, CHUNK, CHUNK, jitter(rng, color, 3));
		}
	}
	img.rect(0, 24, 2, 64, g.railDark);
	img.rect(CELL - 2, 24, 2, 64, g.railDark);
	img.rect(0, 84, CELL, 8, g.railDark);
	img.rect(0, 92, CELL, 12, g.rail);
	img.rect(0, 104, CELL, 8, P.contact);
	return img;
};

/** Uma célula de parede cream vertical: borda externa cinza + face. */
const drawWallBodyV = (rng) => {
	const img = new Img(WALL_W, CELL);
	const faceW = WALL_W - 16;
	img.rect(0, 0, 8, CELL, P.capFace);
	img.rect(8, 0, 4, CELL, P.capEdge);
	fillChunks(img, 12, 0, faceW, CELL, P.face, rng, 4);
	img.rect(12, 0, faceW, 2, P.seam);
	img.rect(12, CELL - 2, faceW, 2, P.seam);
	img.rect(WALL_W - 4, 0, 4, CELL, P.base);
	return img;
};

/** Cap das pontas de parede vertical. */
const drawWallCapV = () => {
	const img = new Img(WALL_W, CAP_H);
	img.rect(0, 0, WALL_W, 4, P.pilLight);
	img.rect(0, 4, WALL_W, 16, P.pilFace);
	img.rect(0, 20, WALL_W, 4, P.pilDark);
	return img;
};

/** Uma célula de vidraça vertical (coluna). */
const drawGlassBodyV = (style, rng) => {
	const g = GLASS[style];
	const img = new Img(WALL_W, CELL);
	img.rect(0, 0, 8, CELL, g.rail);
	img.rect(8, 0, 4, CELL, g.railDark);
	for (let cy = 0; cy < CELL; cy += CHUNK) {
		for (let cx = 12; cx < WALL_W - 4; cx += CHUNK) {
			const diag = (cx + cy) / CHUNK;
			let color = g.glass;
			if (diag % 34 < 2) color = g.streakBright;
			else if (diag % 17 < 3) color = g.streak;
			img.rect(cx, cy, CHUNK, CHUNK, jitter(rng, color, 3));
		}
	}
	img.rect(8, 0, WALL_W - 8, 2, g.rail);
	img.rect(8, CELL - 2, WALL_W - 8, 2, g.rail);
	img.rect(WALL_W - 4, 0, 4, CELL, g.railDark);
	return img;
};

// id → desenho. Mantenha em sincronia com WALL_ASSETS (wall-manifest.ts).
const FILES = [
	["wall_h_body", (rng) => drawWallBodyH(rng)],
	["wall_h_pillar", (rng) => drawPillarH(rng)],
	["wall_v_body", (rng) => drawWallBodyV(rng)],
	["wall_v_cap", () => drawWallCapV()],
	["glass_dark_h_body", (rng) => drawGlassBodyH("dark", rng)],
	["glass_cream_h_body", (rng) => drawGlassBodyH("cream", rng)],
	["glass_dark_v_body", (rng) => drawGlassBodyV("dark", rng)],
	["glass_cream_v_body", (rng) => drawGlassBodyV("cream", rng)],
];

mkdirSync(OUT_DIR, { recursive: true });
for (const [id, draw] of FILES) {
	const seed = [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
	const img = draw(makeRng(seed));
	await sharp(Buffer.from(img.data.buffer), { raw: { width: img.w, height: img.h, channels: 4 } })
		.png()
		.toFile(resolve(OUT_DIR, `${id}.png`));
	console.log(`ok ${id}.png ${img.w}x${img.h}`);
}
