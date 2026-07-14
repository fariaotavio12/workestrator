import { describe, expect, it } from "vitest";
import type { Artifact, RunRecord } from "../types";
import { buildCoordinatorHistory } from "./orchestrator-runtime";

const ISO = "2026-01-01T00:00:00.000Z";

const artifact = (content: string): Artifact => ({ stepId: "s", kind: "text", content, createdAt: ISO });

const step = (content: string | null, index: number): RunRecord["steps"][number] => ({
	stepId: `step-${index}`,
	artifact: content === null ? null : artifact(content),
});

describe("buildCoordinatorHistory", () => {
	it("returns an empty string when there are no steps", () => {
		expect(buildCoordinatorHistory([])).toBe("");
	});

	it("skips steps without an artifact", () => {
		const steps = [step(null, 0), step("Passo real", 1)];
		expect(buildCoordinatorHistory(steps)).toBe("Passo 2:\nPasso real");
	});

	it("includes every step in order when everything fits the budget", () => {
		const steps = [step("um", 0), step("dois", 1), step("três", 2)];
		expect(buildCoordinatorHistory(steps)).toBe("Passo 1:\num\n\nPasso 2:\ndois\n\nPasso 3:\ntrês");
	});

	it("never fully drops history — a single huge step is truncated instead of omitted", () => {
		const huge = "x".repeat(10_000);
		const result = buildCoordinatorHistory([step(huge, 0)]);
		expect(result).toContain("[conteúdo truncado por espaço]");
		expect(result.length).toBeLessThan(huge.length);
	});

	it("keeps the most recent steps and omits older ones once the budget is exceeded, with an explicit note", () => {
		// Cada passo perto do teto de orçamento (4000) força a omissão dos mais antigos.
		const steps = Array.from({ length: 5 }, (_, i) => step("x".repeat(1500), i));
		const result = buildCoordinatorHistory(steps);

		expect(result).toContain("passo(s) mais antigo(s) omitido(s) por espaço");
		expect(result).toContain("Passo 5:\n");
		expect(result).not.toContain("Passo 1:\n");
		expect(result.length).toBeLessThan(1500 * 5);
	});

	it("keeps the result well within a safe command-line budget even for a long run", () => {
		const steps = Array.from({ length: 50 }, (_, i) => step("Conteúdo do passo com bastante texto. ".repeat(50), i));
		const result = buildCoordinatorHistory(steps);
		expect(result.length).toBeLessThan(6000);
	});
});
