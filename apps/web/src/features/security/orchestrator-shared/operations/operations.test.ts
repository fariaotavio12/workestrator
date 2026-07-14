import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
	get: vi.fn(),
	post: vi.fn(),
	put: vi.fn(),
	delete: vi.fn(),
}));

vi.mock("@/app/api/clients", () => ({ api: apiMock }));

import { useOperationsAuditStore } from "./audit";
import { attachTool, createSkill, createSquad, deleteSquad, getSquad } from "./operations";

const ISO = "2026-01-01T00:00:00.000Z";

const squadDetailDto = {
	id: "squad-1",
	name: "Squad 1",
	description: "",
	icon: "🤖",
	trigger: { type: "manual" },
	orchSystemPrompt: "",
	orchProviderId: "provider-1",
	orchModel: "model-1",
	orchMaxSteps: 10,
	agents: [
		{
			id: "agent-1",
			squadId: "squad-1",
			name: "Agent 1",
			role: "",
			systemPrompt: "",
			providerId: "provider-1",
			model: "model-1",
			scriptIds: ["script-existing"],
			canExecute: false,
			requiresCheckpoint: false,
			character: "Male1",
			gender: "male",
			accentColor: "#000000",
			createdAt: ISO,
			updatedAt: ISO,
		},
	],
	seats: [],
	createdAt: ISO,
	updatedAt: ISO,
};

beforeEach(() => {
	vi.clearAllMocks();
	useOperationsAuditStore.getState().clear();
});

describe("createSquad", () => {
	it("valida o input antes de chamar a API", async () => {
		const result = await createSquad({ name: "" });

		expect(result.ok).toBe(false);
		expect(apiMock.post).not.toHaveBeenCalled();
	});

	it("cria o squad e registra sucesso na auditoria", async () => {
		apiMock.post.mockResolvedValueOnce({ data: { id: "squad-1", name: "Squad 1" } });

		const result = await createSquad({ name: "Squad 1" });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.id).toBe("squad-1");
			expect(result.summary).toContain("Squad 1");
		}
		expect(apiMock.post).toHaveBeenCalledWith("/squads", { name: "Squad 1" });
		expect(useOperationsAuditStore.getState().entries[0]?.status).toBe("success");
	});
});

describe("deleteSquad", () => {
	it("exige confirmação antes de excluir", async () => {
		const result = await deleteSquad({ squadId: "squad-1" });

		expect(result.ok).toBe(false);
		expect(result.ok === false && result.requiresConfirmation).toBe(true);
		expect(apiMock.delete).not.toHaveBeenCalled();
		expect(useOperationsAuditStore.getState().entries[0]?.status).toBe("confirmation_required");
	});

	it("exclui quando confirmado", async () => {
		apiMock.delete.mockResolvedValueOnce({});

		const result = await deleteSquad({ squadId: "squad-1" }, { confirm: true });

		expect(result.ok).toBe(true);
		expect(apiMock.delete).toHaveBeenCalledWith("/squads/squad-1");
	});
});

describe("getSquad", () => {
	it("mapeia a resposta e retorna erro tratado em caso de falha de API", async () => {
		apiMock.get.mockRejectedValueOnce({ response: { data: { message: "squad não encontrado" } } });

		const result = await getSquad({ squadId: "squad-x" });

		expect(result.ok).toBe(false);
		expect(result.ok === false && "error" in result && result.error).toBe("squad não encontrado");
	});
});

describe("attachTool", () => {
	it("evita duplicar um script já anexado ao agent", async () => {
		apiMock.get.mockResolvedValueOnce({ data: squadDetailDto });
		apiMock.put.mockResolvedValueOnce({
			data: { ...squadDetailDto.agents[0], scriptIds: ["script-existing"] },
		});

		const result = await attachTool({ squadId: "squad-1", agentId: "agent-1", scriptId: "script-existing" });

		expect(result.ok).toBe(true);
		expect(apiMock.put).toHaveBeenCalledWith("/squads/squad-1/agents/agent-1", { scriptIds: ["script-existing"] });
	});

	it("adiciona um novo script à whitelist do agent", async () => {
		apiMock.get.mockResolvedValueOnce({ data: squadDetailDto });
		apiMock.put.mockResolvedValueOnce({
			data: { ...squadDetailDto.agents[0], scriptIds: ["script-existing", "script-new"] },
		});

		await attachTool({ squadId: "squad-1", agentId: "agent-1", scriptId: "script-new" });

		expect(apiMock.put).toHaveBeenCalledWith("/squads/squad-1/agents/agent-1", {
			scriptIds: ["script-existing", "script-new"],
		});
	});
});

describe("createSkill", () => {
	it("cria uma skill como asset markdown privado por padrÃ£o", async () => {
		apiMock.post.mockResolvedValueOnce({
			data: {
				id: "skill-1",
				title: "Skill de teste",
				description: "Skill criada pelo assistente",
				visibility: "PRIVATE",
			},
		});

		const result = await createSkill({
			title: "Skill de teste",
			description: "Skill criada pelo assistente",
			content: "# Skill de teste\n\n## Objetivo\n\nValidar criaÃ§Ã£o.",
			tags: ["teste"],
		});

		expect(result.ok).toBe(true);
		expect(apiMock.post).toHaveBeenCalledWith("/explore/assets", {
			kind: "SKILL",
			title: "Skill de teste",
			description: "Skill criada pelo assistente",
			tags: ["teste"],
			visibility: "PRIVATE",
			payload: {
				format: "markdown",
				content: "# Skill de teste\n\n## Objetivo\n\nValidar criaÃ§Ã£o.",
				source: "assistant",
			},
		});
	});
});
