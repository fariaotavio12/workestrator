// One-shot: mede os PNGs de /public/assets_office_transparente (dimensões nativas + bounding box
// do conteúdo não-transparente) e gera prop-metrics.generated.json, consumido pelo prop-manifest.
// Rode de apps/web: `node scripts/measure-office-props.mjs`. Re-rode quando a arte mudar —
// o asset-manifest.test.ts acusa drift entre manifest e arquivos.
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ASSETS_DIR = path.resolve("public/assets_office_transparente");
const OUT_FILE = path.resolve("src/features/security/squad-detail/office-scene/assets/prop-metrics.generated.json");

// Pixels com alpha acima disso contam como conteúdo (ignora franjas de anti-alias quase invisíveis).
const ALPHA_THRESHOLD = 8;

// Estes PNGs têm um artefato de geração: uma linha 100% opaca de 1px na borda superior e esquerda
// (às vezes direita/inferior). Se contada, o trim vira o canvas inteiro e, pior, tilear os pisos
// repete a linha criando uma grade de riscos. Descartamos linhas/colunas de borda quase totalmente
// opacas (>90%) — no máximo BORDER_STRIP px por lado, para nunca comer conteúdo real (as peças são
// centralizadas com margem folgada).
const ALPHA_THRESHOLD_LINE = 200;
const BORDER_STRIP = 2;
const LINE_FILL = 0.9;

const measure = async (file) => {
	const { data, info } = await sharp(path.join(ASSETS_DIR, file))
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const { width, height, channels } = info;
	const alpha = (x, y) => data[(y * width + x) * channels + 3];

	const rowIsLine = (y) => {
		let n = 0;
		for (let x = 0; x < width; x++) if (alpha(x, y) >= ALPHA_THRESHOLD_LINE) n++;
		return n >= width * LINE_FILL;
	};
	const colIsLine = (x) => {
		let n = 0;
		for (let y = 0; y < height; y++) if (alpha(x, y) >= ALPHA_THRESHOLD_LINE) n++;
		return n >= height * LINE_FILL;
	};

	let x0 = 0;
	let y0 = 0;
	let x1 = width - 1;
	let y1 = height - 1;
	for (let s = 0; s < BORDER_STRIP && y0 < y1 && rowIsLine(y0); s++) y0++;
	for (let s = 0; s < BORDER_STRIP && y1 > y0 && rowIsLine(y1); s++) y1--;
	for (let s = 0; s < BORDER_STRIP && x0 < x1 && colIsLine(x0); s++) x0++;
	for (let s = 0; s < BORDER_STRIP && x1 > x0 && colIsLine(x1); s++) x1--;

	let minX = width;
	let minY = height;
	let maxX = -1;
	let maxY = -1;
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			if (alpha(x, y) > ALPHA_THRESHOLD) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
		}
	}
	const trim =
		maxX >= 0
			? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
			: { x: 0, y: 0, w: width, h: height };
	return { native: { w: width, h: height }, trim };
};

const files = (await readdir(ASSETS_DIR)).filter((f) => f.endsWith(".png")).sort();
const out = {};
for (const file of files) {
	out[file.replace(/\.png$/, "")] = await measure(file);
}
await writeFile(OUT_FILE, `${JSON.stringify(out, null, "\t")}\n`);
console.log(`measured ${files.length} props -> ${path.relative(process.cwd(), OUT_FILE)}`);
