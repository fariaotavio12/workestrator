/**
 * Gera o atlas de peças usado SÓ pelo editor LDtk (authoring/office-props.png).
 *
 * O LDtk precisa de uma única imagem por tileset, mas nossas peças são 53 PNGs soltos. Aqui cada peça
 * é recortada pelo seu frame trimado (prop-metrics.generated.json), reduzida p/ caber num slot e
 * centralizada nele. O slot é uniforme e alinhado à grade — assim cada valor do enum `PropId` aponta
 * para um `tileRect` limpo e a peça aparece com o sprite real dentro do editor.
 *
 * Este atlas NÃO vai pro runtime (a cena segue carregando os PNGs originais) — por isso mora em
 * apps/web/authoring e não em public/.
 *
 * Rodar: node scripts/generate-ldtk-atlas.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const PROPS_DIR = resolve(here, "../public/assets_office_transparente");
const OUT_DIR = resolve(here, "../authoring");
const METRICS = resolve(here, "../src/features/security/squad-detail/office-scene/assets/prop-metrics.generated.json");

/** Lado do slot no atlas (px). Cabe a maior peça trimada com folga e é múltiplo da grade. */
const SLOT = 256;
const COLS = 8;

const metrics = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(METRICS, "utf8")));
const ids = Object.keys(metrics).sort();
const rows = Math.ceil(ids.length / COLS);
const atlasW = COLS * SLOT;
const atlasH = rows * SLOT;

const composites = [];
/** propId → tileRect do slot (o que o .ldtk referencia). */
const slots = {};

for (const [i, id] of ids.entries()) {
	const { trim } = metrics[id];
	const col = i % COLS;
	const row = Math.floor(i / COLS);
	const slotX = col * SLOT;
	const slotY = row * SLOT;

	// Recorta o conteúdo real e reduz só se estourar o slot (pixel-art: vizinho mais próximo).
	const scale = Math.min(1, SLOT / trim.w, SLOT / trim.h);
	const w = Math.max(1, Math.round(trim.w * scale));
	const h = Math.max(1, Math.round(trim.h * scale));
	let img = sharp(resolve(PROPS_DIR, `${id}.png`)).extract({ left: trim.x, top: trim.y, width: trim.w, height: trim.h });
	if (scale < 1) img = img.resize(w, h, { kernel: "nearest" });

	const left = slotX + Math.floor((SLOT - w) / 2);
	const top = slotY + Math.floor((SLOT - h) / 2);
	composites.push({ input: await img.png().toBuffer(), left, top });
	// tileRect JUSTO na arte, não no slot: o LDtk usa "FitInside", então incluir o padding
	// transparente do slot faria a peça renderizar minúscula dentro da caixa da entidade.
	slots[id] = { x: left, y: top, w, h };
}

mkdirSync(OUT_DIR, { recursive: true });
await sharp({ create: { width: atlasW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
	.composite(composites)
	.png()
	.toFile(resolve(OUT_DIR, "office-props.png"));

writeFileSync(
	resolve(OUT_DIR, "office-props.atlas.json"),
	`${JSON.stringify({ slot: SLOT, cols: COLS, w: atlasW, h: atlasH, slots }, null, "\t")}\n`,
);

console.log(`atlas ${atlasW}x${atlasH} — ${ids.length} peças em slots de ${SLOT}px (${COLS}x${rows})`);
