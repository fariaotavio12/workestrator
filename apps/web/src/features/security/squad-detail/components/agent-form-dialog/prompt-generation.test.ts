import { describe, expect, it } from "vitest";
import {
	buildFinalSystemPrompt,
	buildFinalUserPrompt,
	buildQuestionsUserPrompt,
	MAX_CLARIFYING_QUESTIONS,
	parseClarifyingQuestions,
	type PromptGenerationInput,
	type QuestionAnswer,
} from "./prompt-generation";

const input: PromptGenerationInput = {
	name: "Revisor",
	role: "Editor de textos",
	brief: "revisa textos de marketing e aponta erros de tom",
};

describe("parseClarifyingQuestions", () => {
	it("parseia um JSON valido", () => {
		const raw = '{"questions":[{"id":"q1","question":"Qual o tom desejado?","hint":"Ex.: formal"}]}';
		expect(parseClarifyingQuestions(raw)).toEqual([
			{ id: "q1", question: "Qual o tom desejado?", hint: "Ex.: formal" },
		]);
	});

	it("extrai o JSON mesmo com cercas de código e prosa ao redor", () => {
		const raw =
			'Aqui estao as perguntas:\n```json\n{"questions":[{"id":"x","question":"Existe um guia de estilo?"}]}\n```\nEspero que ajude!';
		expect(parseClarifyingQuestions(raw)).toEqual([{ id: "q1", question: "Existe um guia de estilo?" }]);
	});

	it("retorna null para lixo sem JSON", () => {
		expect(parseClarifyingQuestions("desculpe, não consigo ajudar com isso")).toBeNull();
	});

	it("retorna null quando a lista de perguntas esta vazia", () => {
		expect(parseClarifyingQuestions('{"questions":[]}')).toBeNull();
	});

	it("limita a MAX_CLARIFYING_QUESTIONS itens e re-gera os ids em sequencia", () => {
		const questions = Array.from({ length: 9 }, (_, index) => ({
			id: `original-${index}`,
			question: `Pergunta numero ${index}?`,
		}));
		const result = parseClarifyingQuestions(JSON.stringify({ questions }));
		expect(result?.length).toBe(MAX_CLARIFYING_QUESTIONS);
		expect(result?.map((question) => question.id)).toEqual(["q1", "q2", "q3", "q4", "q5", "q6"]);
	});

	it("rejeita uma pergunta em branco", () => {
		expect(parseClarifyingQuestions('{"questions":[{"id":"q1","question":"   "}]}')).toBeNull();
	});
});

describe("buildFinalUserPrompt", () => {
	it("renderiza somente os pares de pergunta e resposta respondidos", () => {
		const answers: QuestionAnswer[] = [
			{ question: "Qual o tom?", answer: "Formal" },
			{ question: "Tem exemplos?", answer: "   " },
		];
		const prompt = buildFinalUserPrompt(input, answers);
		expect(prompt).toContain("- Q: Qual o tom?\n  A: Formal");
		expect(prompt).not.toContain("Tem exemplos?");
	});

	it("usa o texto padrao quando nenhuma pergunta foi respondida", () => {
		expect(buildFinalUserPrompt(input, [])).toContain(
			"No additional clarifications were provided. Write the best possible prompt using only the information above, skipping sections without information.",
		);
	});
});

describe("buildFinalSystemPrompt", () => {
	it("instrui a saida em ingles quando o idioma e 'en'", () => {
		expect(buildFinalSystemPrompt("en")).toContain("Write the ENTIRE prompt text in English");
	});

	it("instrui a saida em portugues quando o idioma e 'pt-BR'", () => {
		expect(buildFinalSystemPrompt("pt-BR")).toContain("Write the ENTIRE prompt text in Brazilian Portuguese");
	});

	it("sempre inclui a regra obrigatoria de perguntar sobre ambiguidades", () => {
		expect(buildFinalSystemPrompt("pt-BR")).toContain(
			"the agent must ask clarifying questions when a request is ambiguous or information is missing",
		);
	});
});

describe("buildQuestionsUserPrompt", () => {
	it("inclui nome, papel e brief no prompt", () => {
		const prompt = buildQuestionsUserPrompt(input, "pt-BR");
		expect(prompt).toContain('Agent name: "Revisor"');
		expect(prompt).toContain('Role: "Editor de textos"');
		expect(prompt).toContain("revisa textos de marketing e aponta erros de tom");
	});

	it("usa 'not provided' quando nome e papel estao vazios", () => {
		const prompt = buildQuestionsUserPrompt({ name: "", role: "  ", brief: "faz coisas" }, "pt-BR");
		expect(prompt).toContain('Agent name: "not provided"');
		expect(prompt).toContain('Role: "not provided"');
	});

	it("aponta o idioma final correto na nota final, mantendo as perguntas em portugues", () => {
		expect(buildQuestionsUserPrompt(input, "en")).toContain("will be written in English later");
		expect(buildQuestionsUserPrompt(input, "pt-BR")).toContain("will be written in Brazilian Portuguese later");
	});
});
