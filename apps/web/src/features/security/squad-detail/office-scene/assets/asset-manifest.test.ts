import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CHARACTER_SHEETS, FALLBACK_POSES, PERSON_KEYS, staticPoseUrl } from "./character-manifest";
import { PROP_MANIFEST } from "./prop-manifest";

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../../public");
const propsDir = resolve(publicDir, "assets_office_transparente");
const sheetsDir = resolve(publicDir, "assets/avatares_animados");
const bonecosDir = resolve(publicDir, "bonecos_transparentes");

/** Lê largura/altura do chunk IHDR do PNG (bytes 16..23, big-endian). */
const pngSize = (file: string): { w: number; h: number } => {
	const buf = readFileSync(file);
	return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
};

describe("prop manifest ↔ arquivos", () => {
	it("toda peça do manifesto tem arquivo e dimensões nativas batem", () => {
		for (const spec of Object.values(PROP_MANIFEST)) {
			const file = resolve(propsDir, `${spec.id}.png`);
			expect(existsSync(file), `faltando: ${spec.id}.png`).toBe(true);
			expect(pngSize(file), `dims divergentes: ${spec.id}`).toEqual(spec.native);
		}
	});

	it("todo PNG da pasta de props está no manifesto (sem drift)", () => {
		const onDisk = readdirSync(propsDir)
			.filter((f) => f.endsWith(".png"))
			.map((f) => f.replace(/\.png$/, ""));
		for (const id of onDisk) expect(PROP_MANIFEST[id], `prop no disco fora do manifesto: ${id}`).toBeDefined();
		expect(Object.keys(PROP_MANIFEST).length).toBe(onDisk.length);
	});
});

describe("sheets de personagem ↔ arquivos", () => {
	it("todo sheet mapeado existe e casa com cols×frameW / rows×frameH", () => {
		for (const anims of Object.values(CHARACTER_SHEETS)) {
			for (const spec of Object.values(anims ?? {})) {
				const file = resolve(sheetsDir, spec.file);
				expect(existsSync(file), `faltando sheet: ${spec.file}`).toBe(true);
				expect(pngSize(file), `dims do sheet ${spec.file}`).toEqual({
					w: spec.cols * spec.frameW,
					h: spec.rows * spec.frameH,
				});
				expect(spec.frames.start).toBeGreaterThanOrEqual(0);
				expect(spec.frames.end).toBeLessThan(spec.cols * spec.rows);
			}
		}
	});
});

describe("poses estáticas de fallback ↔ arquivos", () => {
	it("existe PNG para cada personagem × pose de fallback", () => {
		for (const key of PERSON_KEYS) {
			for (const pose of FALLBACK_POSES) {
				// staticPoseUrl usa BASE_URL ("/" em teste) — derivamos o caminho de disco pelo nome.
				expect(staticPoseUrl(key, pose)).toContain(`${key}_${pose}.png`);
				const file = resolve(bonecosDir, `${key}_${pose}.png`);
				expect(existsSync(file), `faltando boneco: ${key}_${pose}.png`).toBe(true);
			}
		}
	});
});
