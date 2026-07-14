import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/toast/notify", () => ({
	notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
vi.mock("./os-notify", () => ({ notifyOs: vi.fn() }));
vi.mock("./model-client", async (importOriginal) => ({
	...(await importOriginal<typeof import("./model-client")>()),
	callAgentStep: vi.fn(),
}));
vi.mock("@/features/security/executions/api", () => ({
	saveRunApi: vi.fn().mockResolvedValue({ id: "run-persisted" }),
	updateRunApi: vi.fn().mockResolvedValue({ id: "run-persisted" }),
	executionsKeys: { bySquad: (id: string) => ["runs", id] },
}));

import { tanStackQueryClient } from "@/app/api/clients";
import { notify } from "@/components/toast/notify";
import { providersKeys } from "@/features/security/models/api";
import { squadDetailKeys, type SquadDetail } from "@/features/security/squad-detail/api";
import type { Agent, ModelProvider, RunRecord, Seat } from "../types";
import { useOrchestratorRuntimeStore } from "../model/use-orchestrator-runtime-store";
import { callAgentStep } from "./model-client";
import { notifyOs } from "./os-notify";
import { continueRun, retryLastStep, startRun } from "./orchestrator-runtime";

const ISO = "2026-01-01T00:00:00.000Z";

const provider = (id: string): ModelProvider => ({
	id,
	label: id,
	kind: "anthropic-api",
	models: [{ value: "model-1", label: "Model 1" }],
	createdAt: ISO,
	updatedAt: ISO,
});

const agent = (overrides: Partial<Agent> & Pick<Agent, "id" | "name">): Agent => ({
	role: "Agent",
	systemPrompt: "AGENT_PROMPT_MARKER",
	modelRef: { providerId: "provider-1", model: "model-1" },
	scriptIds: [],
	canExecute: false,
	requiresCheckpoint: false,
	requiresCheckpointAfter: false,
	character: "Male1",
	gender: "male",
	accentColor: "#000000",
	createdAt: ISO,
	updatedAt: ISO,
	...overrides,
});

const seat = (id: string, agentId: string | null): Seat => ({ id, col: 1, row: 1, agentId });

const squadDetail = (squadId: string, overrides: Partial<SquadDetail> = {}): SquadDetail => ({
	id: squadId,
	name: `Squad ${squadId}`,
	description: "",
	icon: "🤖",
	trigger: { type: "manual" },
	savedBriefing: null,
	agents: [],
	seats: [],
	orchestrator: {
		systemPrompt: "COORDINATOR_PROMPT_MARKER",
		modelRef: { providerId: "provider-1", model: "model-1" },
		maxSteps: 8,
	},
	createdAt: ISO,
	updatedAt: ISO,
	...overrides,
});

/** Cada squadId de teste é único — evita qualquer interferência entre testes no runtime store global. */
const seedCache = (squadId: string, detail: SquadDetail, providers: ModelProvider[] = [provider("provider-1")]): void => {
	tanStackQueryClient.setQueryData(squadDetailKeys.detail(squadId), detail);
	tanStackQueryClient.setQueryData(providersKeys.list(), providers);
};

/** Roteia pela mock de `callAgentStep`: prompt do coordenador vs prompt do agent, pelo marcador de systemPrompt. */
const mockCoordinatorAndAgentReplies = (coordinatorOutput: string, agentOutput = "ok"): void => {
	vi.mocked(callAgentStep).mockImplementation(async ({ systemPrompt }) => ({
		output: systemPrompt === "COORDINATOR_PROMPT_MARKER" ? coordinatorOutput : agentOutput,
		usedFallbackModel: false,
	}));
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("orchestrator-runtime — notificações de ciclo de vida (Etapa 4.5)", () => {
	it("notifica só via SO (sem toast in-app) quando um agent faz uma pergunta", async () => {
		const squadId = "squad-question";
		seedCache(squadId, squadDetail(squadId, { agents: [agent({ id: "a1", name: "Ana" })], seats: [seat("s1", "a1")] }));
		mockCoordinatorAndAgentReplies(
			JSON.stringify({ next: "s1" }),
			JSON.stringify({ type: "question", question: "Qual cor você prefere?" }),
		);

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(notifyOs).toHaveBeenCalledWith(
				"Ana precisa da sua resposta",
				"Qual cor você prefere?",
				expect.any(Function),
			);
		});
		expect(notify.warning).not.toHaveBeenCalled();
	});

	it("notifica só via SO (sem toast in-app) quando o coordenador escolhe um agent que exige checkpoint", async () => {
		const squadId = "squad-checkpoint";
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Beto", requiresCheckpoint: true })],
				seats: [seat("s1", "a1")],
			}),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "s1" }));

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(notifyOs).toHaveBeenCalledWith("Aprovação necessária", "Antes de acionar Beto", expect.any(Function));
		});
		expect(notify.warning).not.toHaveBeenCalled();
	});

	it('notifica só via SO (sem toast in-app) quando o coordenador encerra com "done"', async () => {
		const squadId = "squad-done";
		seedCache(squadId, squadDetail(squadId, { agents: [agent({ id: "a1", name: "Ana" })], seats: [seat("s1", "a1")] }));
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "done" }));

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(notifyOs).toHaveBeenCalledWith("Execução concluída", `Squad ${squadId}`, expect.any(Function));
		});
		expect(notify.success).not.toHaveBeenCalled();
	});

	it("notifica erro (em vez de falhar em silêncio) quando o coordenador aponta uma cadeira inexistente", async () => {
		const squadId = "squad-invalid-seat";
		seedCache(squadId, squadDetail(squadId, { agents: [agent({ id: "a1", name: "Ana" })], seats: [seat("s1", "a1")] }));
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "seat-inexistente" }));

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(notify.error).toHaveBeenCalledWith("O orquestrador apontou uma cadeira inválida — execução encerrada.");
		});
	});
});

const runRecord = (id: string, squadId: string, overrides: Partial<RunRecord> = {}): RunRecord => ({
	id,
	squadId,
	input: "briefing original",
	startedAt: ISO,
	endedAt: ISO,
	status: "aborted",
	steps: [],
	qaLog: [],
	...overrides,
});

describe("orchestrator-runtime — continuar de onde parou (retry/resume)", () => {
	it("continueRun não repete um passo já concluído — coordenador decide a partir do histórico", async () => {
		const squadId = "squad-continue-basic";
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Pesquisador" }), agent({ id: "a2", name: "Redator" })],
				seats: [seat("s1", "a1"), seat("s2", "a2")],
			}),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "done" }));

		const previousRun = runRecord("run-old-1", squadId, {
			steps: [
				{
					stepId: "step-1",
					agentId: "a1",
					seatId: "s1",
					artifact: { stepId: "step-1", kind: "text", content: "pesquisa pronta", createdAt: ISO },
				},
			],
		});

		continueRun(squadId, previousRun);

		await vi.waitFor(() => {
			expect(notifyOs).toHaveBeenCalledWith("Execução retomada", `Squad ${squadId}`, expect.any(Function));
		});
		await vi.waitFor(() => {
			expect(notifyOs).toHaveBeenCalledWith("Execução concluída", `Squad ${squadId}`, expect.any(Function));
		});
		// Só o coordenador foi chamado (respondeu "done" direto) — nenhum agent novo rodou, o passo do
		// Pesquisador não foi refeito.
		expect(callAgentStep).toHaveBeenCalledTimes(1);
	});

	it("continueRun restaura um checkpoint pendente sem perguntar ao coordenador de novo", async () => {
		const squadId = "squad-continue-checkpoint";
		seedCache(
			squadId,
			squadDetail(squadId, { agents: [agent({ id: "a1", name: "Pesquisador" })], seats: [seat("s1", "a1")] }),
		);
		vi.mocked(callAgentStep).mockRejectedValue(new Error("não deveria ser chamado nesse caminho"));

		const previousRun = runRecord("run-old-2", squadId, {
			runtimeSnapshot: { currentStep: 0, pendingSeatId: "s1", pendingCheckpointKind: "before", pendingQuestion: null },
		});

		continueRun(squadId, previousRun);

		await vi.waitFor(() => {
			expect(notifyOs).toHaveBeenCalledWith("Execução retomada", `Squad ${squadId}`, expect.any(Function));
		});
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).status).toBe("checkpoint");
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).pendingSeatId).toBe("s1");
		expect(callAgentStep).not.toHaveBeenCalled();
	});

	it("retryLastStep aborta com mensagem clara se o agent do último passo não existe mais no squad", () => {
		const squadId = "squad-retry-missing-agent";
		seedCache(squadId, squadDetail(squadId, { agents: [], seats: [] }));

		const previousRun = runRecord("run-old-3", squadId, {
			steps: [
				{
					stepId: "step-1",
					agentId: "a1",
					seatId: "s1",
					artifact: { stepId: "step-1", kind: "text", content: "x", createdAt: ISO },
				},
			],
		});

		retryLastStep(squadId, previousRun);

		expect(notify.error).toHaveBeenCalledWith("O agent do último passo não existe mais neste squad.");
		expect(callAgentStep).not.toHaveBeenCalled();
	});

	it("retryLastStep descarta o último passo e reexecuta a mesma cadeira (sem passar pelo coordenador antes)", async () => {
		const squadId = "squad-retry-basic";
		seedCache(
			squadId,
			squadDetail(squadId, { agents: [agent({ id: "a1", name: "Pesquisador" })], seats: [seat("s1", "a1")] }),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "done" }), "pesquisa refeita");

		const previousRun = runRecord("run-old-4", squadId, {
			steps: [
				{
					stepId: "step-1",
					agentId: "a1",
					seatId: "s1",
					artifact: { stepId: "step-1", kind: "text", content: "pesquisa ruim", createdAt: ISO },
				},
			],
		});

		retryLastStep(squadId, previousRun);

		await vi.waitFor(() => {
			expect(notifyOs).toHaveBeenCalledWith(
				"Refazendo último passo",
				`Pesquisador — Squad ${squadId}`,
				expect.any(Function),
			);
		});
		// Reexecuta o agent direto (não pergunta ao coordenador antes) e, terminando, o coordenador
		// decide "done".
		await vi.waitFor(() => {
			expect(notifyOs).toHaveBeenCalledWith("Execução concluída", `Squad ${squadId}`, expect.any(Function));
		});
	});
});
