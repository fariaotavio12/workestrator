import { describe, expect, it } from "vitest";
import { buildAssistantSystemPrompt, parseAssistantAction } from "./assistant";
import { OPERATIONS_CATALOG } from "./registry";

describe("parseAssistantAction", () => {
	it("interpreta uma ação de chamada de operação", () => {
		const action = parseAssistantAction('{"type": "call", "operation": "create_squad", "input": {"name": "X"}}');
		expect(action).toEqual({ type: "call", operation: "create_squad", input: { name: "X" } });
	});

	it("interpreta uma resposta em linguagem natural", () => {
		const action = parseAssistantAction('{"type": "reply", "message": "Squad criado com sucesso."}');
		expect(action).toEqual({ type: "reply", message: "Squad criado com sucesso." });
	});

	it("usa {} como input quando a operação não manda parâmetros", () => {
		const action = parseAssistantAction('{"type": "call", "operation": "list_squads"}');
		expect(action).toEqual({ type: "call", operation: "list_squads", input: {} });
	});

	it("cai em reply com o texto cru quando não há JSON interpretável", () => {
		const action = parseAssistantAction("desculpe, não entendi");
		expect(action).toEqual({ type: "reply", message: "desculpe, não entendi" });
	});

	it("nunca lança em JSON malformado", () => {
		const action = parseAssistantAction('{"type": "call", "operation": }');
		expect(action.type).toBe("reply");
	});
});

describe("buildAssistantSystemPrompt", () => {
	it("lista todas as operações do catálogo, marcando as destrutivas", () => {
		const prompt = buildAssistantSystemPrompt();
		for (const op of OPERATIONS_CATALOG) {
			expect(prompt).toContain(op.name);
			if (op.destructive) expect(prompt).toContain(`${op.name} (destrutiva`);
		}
	});
});
