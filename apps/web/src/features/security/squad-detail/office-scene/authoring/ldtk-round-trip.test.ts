import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CELL, type OfficeLayout } from "../layout/office-layout";
import { PRESET_CLASSIC_OFFICE } from "../layout/preset-classic-office";
import { layoutToLdtk, type PropAtlas } from "./layout-to-ldtk";
import { ldtkToLayout } from "./ldtk-to-layout";
import type { LdtkProject } from "./ldtk-schema";

const atlasPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../../authoring/office-props.atlas.json");
const atlas = JSON.parse(readFileSync(atlasPath, "utf8")) as PropAtlas;

/**
 * O LDtk guarda posição em px INTEIRO, então um offset de 0.2 célula (12.8px) volta como 13/64.
 * Normalizamos os dois lados na mesma precisão: o que importa é a peça cair no mesmo pixel.
 */
const snapToPixel = (layout: OfficeLayout): OfficeLayout => ({
	...layout,
	furniture: layout.furniture.map((item) => {
		if (!item.offset) return item;
		const x = Math.round(item.offset.x * CELL) / CELL;
		const y = Math.round(item.offset.y * CELL) / CELL;
		if (x === 0 && y === 0) {
			const { offset: _drop, ...rest } = item;
			return rest;
		}
		return { ...item, offset: { x, y } };
	}),
});

const roundTrip = (layout: OfficeLayout): OfficeLayout =>
	ldtkToLayout(layoutToLdtk(layout, atlas) as unknown as LdtkProject);

describe("round-trip OfficeLayout ↔ LDtk", () => {
	it("preserva o escritório inteiro (exportar → importar = o mesmo layout)", () => {
		expect(roundTrip(PRESET_CLASSIC_OFFICE)).toEqual(snapToPixel(PRESET_CLASSIC_OFFICE));
	});

	it("é idempotente: um segundo ciclo não muda mais nada", () => {
		const once = roundTrip(PRESET_CLASSIC_OFFICE);
		expect(roundTrip(once)).toEqual(once);
	});

	it("mantém a baseline de cada peça dentro de 1px do original", () => {
		const back = roundTrip(PRESET_CLASSIC_OFFICE);
		const baseline = (l: OfficeLayout, i: number) => {
			const item = l.furniture[i];
			return {
				x: (item.cell.x + 0.5) * CELL + (item.offset?.x ?? 0) * CELL,
				y: (item.cell.y + 1) * CELL + (item.offset?.y ?? 0) * CELL,
			};
		};
		expect(back.furniture).toHaveLength(PRESET_CLASSIC_OFFICE.furniture.length);
		PRESET_CLASSIC_OFFICE.furniture.forEach((item, i) => {
			const a = baseline(PRESET_CLASSIC_OFFICE, i);
			const b = baseline(back, i);
			expect(Math.abs(a.x - b.x), `${item.id} x`).toBeLessThanOrEqual(0.5);
			expect(Math.abs(a.y - b.y), `${item.id} y`).toBeLessThanOrEqual(0.5);
		});
	});

	it("gera um arquivo determinístico (mesmo layout ⇒ mesmo JSON)", () => {
		const a = JSON.stringify(layoutToLdtk(PRESET_CLASSIC_OFFICE, atlas));
		const b = JSON.stringify(layoutToLdtk(PRESET_CLASSIC_OFFICE, atlas));
		expect(a).toBe(b);
	});
});

/**
 * Confere o ANDAIME contra um projeto real do LDtk instalado: se o nosso "def" tiver chave a menos
 * (ou inventada), o editor pode rejeitar/normalizar o arquivo. Só roda em máquina com o LDtk 1.5.3.
 */
const SAMPLE = resolve(
	process.env.LOCALAPPDATA ?? "",
	"Programs/LDtk/extraFiles/samples/Entities.ldtk",
);

describe.skipIf(!existsSync(SAMPLE))("andaime bate com o LDtk instalado", () => {
	const sample: unknown = JSON.parse(readFileSync(SAMPLE, "utf8"));
	const project: unknown = layoutToLdtk(PRESET_CLASSIC_OFFICE, atlas);

	/** Navega por caminho ("defs.entities.0") sem precisar tipar o JSON gigante do LDtk. */
	const at = (root: unknown, path: string): unknown =>
		path.split(".").reduce<unknown>((v, k) => (v as Record<string, unknown> | undefined)?.[k], root);
	const keys = (o: unknown): string[] => Object.keys((o ?? {}) as object).sort();
	/** Primeira camada de entidades (o sample tem camadas de vários tipos). */
	const entLayer = (root: unknown, path: string): unknown =>
		(at(root, path) as { __type?: string }[]).find((l) => l.__type === "Entities");

	it("usa a mesma versão de formato", () => {
		expect(at(project, "jsonVersion")).toBe(at(sample, "jsonVersion"));
	});

	it("tem as mesmas chaves de topo e de defs", () => {
		expect(keys(project)).toEqual(keys(sample));
		expect(keys(at(project, "defs"))).toEqual(keys(at(sample, "defs")));
	});

	it("tem as mesmas chaves em layer/entity/field/tileset/enum def", () => {
		expect(keys(entLayer(project, "defs.layers"))).toEqual(keys(entLayer(sample, "defs.layers")));
		expect(keys(at(project, "defs.entities.0"))).toEqual(keys(at(sample, "defs.entities.0")));
		expect(keys(at(project, "defs.entities.0.fieldDefs.0"))).toEqual(keys(at(sample, "defs.entities.0.fieldDefs.0")));
		expect(keys(at(project, "defs.tilesets.0"))).toEqual(keys(at(sample, "defs.tilesets.0")));
		expect(keys(at(project, "defs.enums.0"))).toEqual(keys(at(sample, "defs.enums.0")));
	});

	it("tem as mesmas chaves em level / layerInstance / entityInstance / fieldInstance", () => {
		const pLayer = entLayer(project, "levels.0.layerInstances");
		const sLayer = entLayer(sample, "levels.0.layerInstances");
		expect(keys(at(project, "levels.0"))).toEqual(keys(at(sample, "levels.0")));
		expect(keys(pLayer)).toEqual(keys(sLayer));
		expect(keys(at(pLayer, "entityInstances.0"))).toEqual(keys(at(sLayer, "entityInstances.0")));
		expect(keys(at(pLayer, "entityInstances.0.fieldInstances.0"))).toEqual(
			keys(at(sLayer, "entityInstances.0.fieldInstances.0")),
		);
	});
});
