import { describe, expect, it } from "vitest";
import { MAX_SEATS } from "@/features/security/orchestrator-shared/data/constants";
import { PROP_MANIFEST } from "../assets/prop-manifest";
import type { Cell } from "./office-layout";
import { PRESET_CLASSIC_OFFICE as P } from "./preset-classic-office";

const within = (cell: Cell): boolean =>
	cell.x >= 0 && cell.x < P.grid.cols && cell.y >= 0 && cell.y < P.grid.rows;

describe("PRESET_CLASSIC_OFFICE", () => {
	it("tem versão e grade coerentes", () => {
		expect(P.version).toBe(1);
		expect(P.grid.cols).toBeGreaterThan(0);
		expect(P.grid.rows).toBeGreaterThan(0);
	});

	it("só referencia propIds existentes no manifesto", () => {
		for (const item of P.furniture) {
			expect(PROP_MANIFEST[item.propId], `prop desconhecido: ${item.propId}`).toBeDefined();
		}
	});

	it("mantém toda peça e âncora dentro da grade", () => {
		for (const item of P.furniture) expect(within(item.cell), `fora da grade: ${item.id}`).toBe(true);
		for (const a of P.deskAnchors) expect(within(a.cell), `âncora fora da grade: ${a.id}`).toBe(true);
		expect(within(P.coordinator.cell)).toBe(true);
	});

	it("tem no máximo MAX_SEATS âncoras com slots únicos e contíguos", () => {
		expect(P.deskAnchors.length).toBeLessThanOrEqual(MAX_SEATS);
		const slots = P.deskAnchors.map((a) => a.slot).sort((x, y) => x - y);
		expect(new Set(slots).size).toBe(slots.length);
		expect(slots).toEqual(Array.from({ length: slots.length }, (_, i) => i));
	});

	it("usa ids de instância de mobília únicos", () => {
		const ids = P.furniture.map((i) => i.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("referencia texturas de piso que existem no manifesto", () => {
		const floorProps: Record<string, string> = { wood: "42_wood-floor-tile", "meeting-carpet": "43_meeting-carpet-tile" };
		for (const zone of P.floors) {
			expect(PROP_MANIFEST[floorProps[zone.texture]], `piso sem prop: ${zone.texture}`).toBeDefined();
		}
	});
});
