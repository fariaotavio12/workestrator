import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
	get: vi.fn(),
	post: vi.fn(),
	put: vi.fn(),
	delete: vi.fn(),
}));
vi.mock("@/app/api/clients", () => ({ api: apiMock }));

const callAgentStepMock = vi.hoisted(() => vi.fn());
vi.mock("./model-client", async (importOriginal) => ({
	...(await importOriginal<typeof import("./model-client")>()),
	callAgentStep: callAgentStepMock,
}));

import type { ModelProvider } from "../types";
import { useConfigAssistantStore } from "../model/use-config-assistant-store";
import { confirmPendingAction, sendAssistantMessage } from "./config-assistant-runtime";

const provider: ModelProvider = {
	id: "provider-1",
	label: "Provider 1",
	kind: "anthropic-api",
	models: [{ value: "model-1", label: "Model 1" }],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
	vi.clearAllMocks();
	useConfigAssistantStore.getState().reset();
});

describe("sendAssistantMessage", () => {
	it("executa uma operação não destrutiva e finaliza com uma resposta em linguagem natural", async () => {
		apiMock.post.mockResolvedValueOnce({ data: { id: "squad-1", name: "Vendas" } });
		callAgentStepMock
			.mockResolvedValueOnce({
				output: '{"type":"call","operation":"create_squad","input":{"name":"Vendas"}}',
				usedFallbackModel: false,
			})
			.mockResolvedValueOnce({ output: '{"type":"reply","message":"Squad Vendas criado."}', usedFallbackModel: false });

		sendAssistantMessage("crie um squad chamado Vendas", provider, "model-1");

		await vi.waitFor(() => expect(useConfigAssistantStore.getState().isRunning).toBe(false));

		expect(apiMock.post).toHaveBeenCalledWith("/squads", { name: "Vendas" });
		const messages = useConfigAssistantStore.getState().messages;
		expect(messages.at(-1)).toMatchObject({ role: "assistant", content: "Squad Vendas criado." });
		expect(messages.some((m) => m.role === "system" && m.content.includes("Squad \"Vendas\" criado"))).toBe(true);
	});

	it("ignora uma nova mensagem enquanto já há uma rodada em curso", () => {
		callAgentStepMock.mockImplementation(() => new Promise(() => {}));

		sendAssistantMessage("primeira mensagem", provider, "model-1");
		sendAssistantMessage("segunda mensagem", provider, "model-1");

		const messages = useConfigAssistantStore.getState().messages;
		expect(messages.filter((m) => m.role === "user")).toHaveLength(1);
	});
});

describe("confirmação de operação destrutiva", () => {
	it("não executa a API até o usuário confirmar, e reexecuta a mesma operação após confirmar", async () => {
		callAgentStepMock.mockResolvedValueOnce({
			output: '{"type":"call","operation":"delete_squad","input":{"squadId":"squad-1"}}',
			usedFallbackModel: false,
		});

		sendAssistantMessage("apague o squad squad-1", provider, "model-1");

		await vi.waitFor(() => expect(useConfigAssistantStore.getState().pendingConfirmation).not.toBeNull());
		expect(apiMock.delete).not.toHaveBeenCalled();

		apiMock.delete.mockResolvedValueOnce({});
		confirmPendingAction();

		await vi.waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith("/squads/squad-1"));
		expect(useConfigAssistantStore.getState().pendingConfirmation).toBeNull();
	});
});
