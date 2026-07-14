import { describe, expect, it } from "vitest";
import { parseAgentTurn } from "./agent-turn";

describe("parseAgentTurn", () => {
	it("reconhece uma pergunta limpa com opções", () => {
		expect(
			parseAgentTurn('{"type":"question","question":"Qual tom usar?","options":["Formal","Descontraído"]}'),
		).toEqual({
			kind: "question",
			question: "Qual tom usar?",
			options: ["Formal", "Descontraído"],
		});
	});

	it("reconhece uma pergunta sem opções", () => {
		expect(parseAgentTurn('{"type":"question","question":"Confirma o envio?"}')).toEqual({
			kind: "question",
			question: "Confirma o envio?",
		});
	});

	it("trata texto livre normal como resposta final", () => {
		const result = parseAgentTurn("Aqui está o texto revisado, sem erros encontrados.");
		expect(result).toEqual({ kind: "final", content: "Aqui está o texto revisado, sem erros encontrados." });
	});

	it("não confunde uma resposta final que contém chaves soltas (ex.: trecho de código) com pergunta", () => {
		const content = "Segue o snippet: const x = { a: 1 }; isso resolve o bug.";
		expect(parseAgentTurn(content)).toEqual({ kind: "final", content });
	});

	it('trata JSON sem "type":"question" como resposta final', () => {
		const content = '{"foo": "bar"}';
		expect(parseAgentTurn(content)).toEqual({ kind: "final", content });
	});

	it("trata pergunta com options vazio como sem opções", () => {
		expect(parseAgentTurn('{"type":"question","question":"E agora?","options":[]}')).toEqual({
			kind: "question",
			question: "E agora?",
			options: undefined,
		});
	});

	it("trata question vazia/whitespace como resposta final (não uma pergunta válida)", () => {
		const content = '{"type":"question","question":"   "}';
		expect(parseAgentTurn(content)).toEqual({ kind: "final", content });
	});
});
