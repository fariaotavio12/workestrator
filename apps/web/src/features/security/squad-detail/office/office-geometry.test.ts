import { describe, expect, it } from "vitest";
import { COORDINATOR_POINT, poseForStatus, seatToPosition } from "./office-geometry";

describe("seatToPosition", () => {
	it("posiciona as 3 colunas conhecidas em x fixo", () => {
		expect(seatToPosition(1, 1).x).toBe(17);
		expect(seatToPosition(2, 1).x).toBe(34);
		expect(seatToPosition(3, 1).x).toBe(51);
	});

	it("empilha duas linhas de bancadas compactas", () => {
		expect(seatToPosition(1, 1).y).toBe(59);
		expect(seatToPosition(1, 2).y).toBe(78);
		expect(seatToPosition(1, 2).y).toBeGreaterThan(seatToPosition(1, 1).y);
	});

	it("cabe dentro de 0-100% ate 2 linhas de agentes", () => {
		expect(seatToPosition(1, 2).y).toBeLessThanOrEqual(100);
	});

	it("estende colunas alem da terceira em vez de quebrar", () => {
		expect(seatToPosition(4, 1).x).toBeGreaterThan(seatToPosition(3, 1).x);
	});
});

describe("poseForStatus", () => {
	it("mapeia working -> talk, done -> wave, e o resto -> blink", () => {
		expect(poseForStatus("working")).toBe("talk");
		expect(poseForStatus("done")).toBe("wave");
		expect(poseForStatus("idle")).toBe("blink");
		expect(poseForStatus("checkpoint")).toBe("blink");
	});
});

describe("pontos fixos do palco", () => {
	it("coordenador fica na parte superior do escritorio", () => {
		expect(COORDINATOR_POINT.y).toBeLessThan(40);
	});
});
