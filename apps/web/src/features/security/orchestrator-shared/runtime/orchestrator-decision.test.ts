import { describe, expect, it } from "vitest";
import { parseCoordinatorDecision } from "./orchestrator-decision";

describe("parseCoordinatorDecision", () => {
	it("parses a clean JSON decision", () => {
		expect(parseCoordinatorDecision('{"next": "seat-1", "reason": "precisa pesquisar primeiro"}')).toEqual({
			next: "seat-1",
			reason: "precisa pesquisar primeiro",
		});
	});

	it("parses JSON embedded in prose (o CLI costuma devolver texto ao redor)", () => {
		const result = parseCoordinatorDecision(
			'Vou escolher o próximo passo.\n{"next": "seat-2", "reason": "revisão"}\nFim.',
		);
		expect(result).toEqual({ next: "seat-2", reason: "revisão" });
	});

	it('recognizes "done" como decisão válida', () => {
		expect(parseCoordinatorDecision('{"next": "done", "reason": "tarefa completa"}')).toEqual({
			next: "done",
			reason: "tarefa completa",
		});
	});

	it("cai em done quando não há JSON na resposta", () => {
		const result = parseCoordinatorDecision("Não sei o que fazer.");
		expect(result.next).toBe("done");
		expect(result.reason).toBeTruthy();
	});

	it("cai em done quando o JSON está malformado E não há next extraível", () => {
		expect(parseCoordinatorDecision('{"next": , "reason": }').next).toBe("done");
		expect(parseCoordinatorDecision("{ next: seat-1 }").next).toBe("done");
	});

	it("recupera next de JSON malformado quando a intenção é clara (reason incompleto)", () => {
		expect(parseCoordinatorDecision('{"next": "seat-1", "reason": }').next).toBe("seat-1");
	});

	it('cai em done quando falta "next" ou não é string', () => {
		expect(parseCoordinatorDecision('{"reason": "sem next"}').next).toBe("done");
		expect(parseCoordinatorDecision('{"next": 123}').next).toBe("done");
	});

	it("usa a última decisão válida quando o modelo ecoa o exemplo de formato do prompt antes de responder", () => {
		const raw =
			'Devo responder no formato {"next": "<seatId>", "reason": "..."}.\n' +
			'{"next": "seat-2", "reason": "revisão"}';
		expect(parseCoordinatorDecision(raw)).toEqual({ next: "seat-2", reason: "revisão" });
	});

	it("não deixa uma chave dentro de uma string (ex.: no reason) quebrar a extração do bloco", () => {
		const result = parseCoordinatorDecision('{"next": "seat-1", "reason": "ele disse {oi} no chat"}');
		expect(result).toEqual({ next: "seat-1", reason: "ele disse {oi} no chat" });
	});

	it("ignora um bloco anterior inválido e usa o próximo bloco válido", () => {
		const raw = '{"reason": "sem next aqui"}\n{"next": "seat-3"}';
		expect(parseCoordinatorDecision(raw).next).toBe("seat-3");
	});

	it("recupera decisão com quebra de linha literal dentro do reason (JSON estrito rejeita, LLM produz o tempo todo)", () => {
		const raw = '{"next": "seat-1", "reason": "primeiro pesquisar\nporque falta contexto"}';
		const result = parseCoordinatorDecision(raw);
		expect(result.next).toBe("seat-1");
		expect(result.reason).toContain("primeiro pesquisar");
	});

	it("recupera decisão com vírgula sobrando (trailing comma)", () => {
		expect(parseCoordinatorDecision('{"next": "seat-2", "reason": "ok",}').next).toBe("seat-2");
	});

	it("usa a última ocorrência de next no fallback por regex (ambos os blocos malformados)", () => {
		const raw = '{"next": "first\nbad"}\n{"next": "seat-5", "reason": "vai\naqui"}';
		expect(parseCoordinatorDecision(raw).next).toBe("seat-5");
	});

	it("recupera done com reason multi-linha", () => {
		const result = parseCoordinatorDecision('{"next": "done", "reason": "tudo pronto\ne publicado"}');
		expect(result.next).toBe("done");
		expect(result.reason).toContain("tudo pronto");
	});

	it("extrai context_steps quando presente", () => {
		expect(parseCoordinatorDecision('{"next": "seat-1", "context_steps": [2, 4], "reason": "revisar"}')).toEqual({
			next: "seat-1",
			reason: "revisar",
			contextSteps: [2, 4],
		});
	});

	it("context_steps ausente vira undefined (não quebra a decisão)", () => {
		expect(parseCoordinatorDecision('{"next": "seat-1"}').contextSteps).toBeUndefined();
	});

	it("normaliza context_steps: descarta não-inteiros/negativos e deduplica", () => {
		const result = parseCoordinatorDecision('{"next": "seat-1", "context_steps": [2, 2, -1, 3.5, "4", 0]}');
		expect(result.contextSteps).toEqual([2, 4]);
	});

	it("context_steps não-array é ignorado", () => {
		expect(parseCoordinatorDecision('{"next": "seat-1", "context_steps": "2,4"}').contextSteps).toBeUndefined();
		expect(parseCoordinatorDecision('{"next": "seat-1", "context_steps": []}').contextSteps).toBeUndefined();
	});
});

describe("guardrail do loop orquestrado (maxSteps / done)", () => {
	/** Mesma condição de parada usada em advanceOrchestrated: maxSteps atingido OU coordenador diz "done". */
	const runLoop = (decisions: string[], maxSteps: number): number => {
		let currentStep = 0;
		for (const raw of decisions) {
			if (currentStep >= maxSteps) break;
			const decision = parseCoordinatorDecision(raw);
			currentStep += 1;
			if (decision.next === "done") break;
		}
		return currentStep;
	};

	it("para no limite de maxSteps mesmo se o coordenador nunca diz done", () => {
		const decisions = ['{"next":"seat-1"}', '{"next":"seat-2"}', '{"next":"seat-1"}', '{"next":"seat-2"}'];
		expect(runLoop(decisions, 3)).toBe(3);
	});

	it('para assim que o coordenador responde "done", antes do maxSteps', () => {
		const decisions = ['{"next":"seat-1"}', '{"next":"done","reason":"pronto"}', '{"next":"seat-2"}'];
		expect(runLoop(decisions, 8)).toBe(2);
	});
});
