import { describe, expect, it } from "vitest";
import { formatAgentArtifactContent } from "./question-artifact";

describe("formatAgentArtifactContent", () => {
	it("formata marcador interno de pergunta como texto legivel", () => {
		expect(formatAgentArtifactContent('{"type":"question","question":"Qual e o seu nome?"}')).toBe(
			"Pergunta ao usuario: Qual e o seu nome?",
		);
	});

	it("mantem respostas normais sem alteracao", () => {
		expect(formatAgentArtifactContent("Hello world")).toBe("Hello world");
	});

	it("inclui opcoes quando a pergunta tiver alternativas", () => {
		expect(
			formatAgentArtifactContent(
				'{"type":"question","question":"Escolha um tom?","options":["Formal","Casual"]}',
			),
		).toBe("Pergunta ao usuario: Escolha um tom?\n\nOpcoes:\n- Formal\n- Casual");
	});
});
