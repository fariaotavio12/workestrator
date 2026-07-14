import { describe, expect, it } from "vitest";
import { ACTION_POINT, COORDINATOR_POINT, poseForStatus, seatToPosition } from "./office-geometry";

describe("seatToPosition", () => {
	it("posiciona as 3 colunas conhecidas em x fixo", () => {
		expect(seatToPosition(1, 1).x).toBe(15);
		expect(seatToPosition(2, 1).x).toBe(50);
		expect(seatToPosition(3, 1).x).toBe(85);
	});

	it("empilha as linhas verticalmente abaixo da estação do coordenador", () => {
		expect(seatToPosition(1, 1).y).toBe(60);
		expect(seatToPosition(1, 2).y).toBe(81);
		expect(seatToPosition(1, 2).y).toBeGreaterThan(seatToPosition(1, 1).y);
	});

	it("cabe dentro de 0-100% até 2 linhas de agentes (caso comum, ≤ 6 assentos)", () => {
		expect(seatToPosition(1, 2).y).toBeLessThanOrEqual(100);
	});

	it("estende colunas além da 3 em vez de quebrar", () => {
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
	it("coordenador fica acima do ponto de ação", () => {
		expect(COORDINATOR_POINT.y).toBeLessThan(ACTION_POINT.y);
	});
});
