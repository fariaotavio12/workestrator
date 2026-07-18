import { describe, expect, it } from "vitest";
import type { DeskAnchor } from "./office-layout";
import { resolveSeatAnchors, type SeatLike } from "./seat-anchor-resolution";

const anchor = (slot: number): DeskAnchor => ({ id: `a${slot}`, slot, cell: { x: slot, y: 0 }, facing: "right" });

describe("resolveSeatAnchors", () => {
	it("liga assentos por ordem (row, col) às âncoras por slot", () => {
		const seats: SeatLike[] = [
			{ id: "s-c", col: 1, row: 2 },
			{ id: "s-a", col: 1, row: 1 },
			{ id: "s-b", col: 2, row: 1 },
		];
		const anchors = [anchor(2), anchor(0), anchor(1)];
		const { bindings, overflow } = resolveSeatAnchors(seats, anchors);

		expect(overflow).toEqual([]);
		// ordem esperada: (1,1)=s-a → slot0, (2,1)=s-b → slot1, (1,2)=s-c → slot2
		expect(bindings.map((b) => b.seatId)).toEqual(["s-a", "s-b", "s-c"]);
		expect(bindings.map((b) => b.anchor.slot)).toEqual([0, 1, 2]);
	});

	it("manda assentos excedentes para overflow quando faltam âncoras", () => {
		const seats: SeatLike[] = [
			{ id: "s1", col: 1, row: 1 },
			{ id: "s2", col: 2, row: 1 },
			{ id: "s3", col: 3, row: 1 },
		];
		const { bindings, overflow } = resolveSeatAnchors(seats, [anchor(0), anchor(1)]);
		expect(bindings.map((b) => b.seatId)).toEqual(["s1", "s2"]);
		expect(overflow).toEqual(["s3"]);
	});

	it("não muta as entradas e lida com squad vazio", () => {
		const anchors = [anchor(1), anchor(0)];
		expect(resolveSeatAnchors([], anchors)).toEqual({ bindings: [], overflow: [] });
		expect(anchors.map((a) => a.slot)).toEqual([1, 0]);
	});
});
