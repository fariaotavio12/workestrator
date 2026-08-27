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
vi.mock("@/features/security/approvals/api", () => ({
	createApprovalApi: vi.fn(),
	decideApprovalApi: vi.fn(),
	cancelApprovalApi: vi.fn(),
	getApprovalApi: vi.fn(),
	extractApprovalFromConflict: () => undefined,
}));

import { tanStackQueryClient } from "@/app/api/clients";
import { notify } from "@/components/toast/notify";
import {
	cancelApprovalApi,
	createApprovalApi,
	decideApprovalApi,
	getApprovalApi,
} from "@/features/security/approvals/api";
import { updateRunApi } from "@/features/security/executions/api";
import { providersKeys } from "@/features/security/models/api";
import { squadDetailKeys, type SquadDetail } from "@/features/security/squad-detail/api";
import type { Agent, ApprovalRequest, ModelProvider, RunRecord, Script, Seat } from "../types";
import { useOrchestratorRuntimeStore } from "../model/use-orchestrator-runtime-store";
import { callAgentStep, type AgentCallInput } from "./model-client";
import { notifyOs } from "./os-notify";
import { continueRun, resolveCheckpoint, retryLastStep, startRun, stopRun } from "./orchestrator-runtime";

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
	scripts: [],
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

const script = (id: string, name: string): Script => ({
	id,
	name,
	kind: "http",
	method: "GET",
	urlTemplate: "https://exemplo.test/{{cep}}",
	createdAt: ISO,
	updatedAt: ISO,
});

/** Payloads recebidos pela mock de `callAgentStep` — coordenador e agents, na ordem em que rodaram. */
const agentCallInputs = (): AgentCallInput[] => vi.mocked(callAgentStep).mock.calls.map(([input]) => input);

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
const seedCache = (
	squadId: string,
	detail: SquadDetail,
	providers: ModelProvider[] = [provider("provider-1")],
): void => {
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

describe("orchestrator-runtime — o agent carrega as próprias ferramentas", () => {
	it("manda as ferramentas do agent mesmo sem nenhum cache da lista de scripts", async () => {
		const squadId = "squad-tools-embedded";
		const tool = script("sc-1", "Buscar CEP");
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Ana", scriptIds: [tool.id], scripts: [tool] })],
				seats: [seat("s1", "a1")],
			}),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "s1" }));

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(agentCallInputs().some((input) => input.scripts?.some((s) => s.id === tool.id))).toBe(true);
		});
	});

	it("aborta com erro explícito quando o agent tem scriptIds mas chega sem as ferramentas", async () => {
		const squadId = "squad-tools-missing";
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Ana", scriptIds: ["sc-1"], scripts: [] })],
				seats: [seat("s1", "a1")],
			}),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "s1" }));

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(notify.error).toHaveBeenCalledWith("Ferramentas do agent não foram carregadas.");
		});
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).status).toBe("aborted");
		expect(agentCallInputs().some((input) => input.systemPrompt !== "COORDINATOR_PROMPT_MARKER")).toBe(false);
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

	it("respeita REVIEW_CHANGES owner e nao repete o agente escolhido errado pelo coordenador", async () => {
		const squadId = "squad-review-owner";
		const researcher = agent({ id: "a1", name: "Researcher" });
		const copywriter = agent({ id: "a2", name: "Copywriter" });
		const reviewer = agent({ id: "a3", name: "Reviewer" });
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [researcher, copywriter, reviewer],
				seats: [seat("s-research", "a1"), seat("s-copy", "a2"), seat("s-review", "a3")],
			}),
		);
		let coordinatorCalls = 0;
		vi.mocked(callAgentStep).mockImplementation(async ({ systemPrompt, prompt }) => {
			if (systemPrompt === "COORDINATOR_PROMPT_MARKER") {
				coordinatorCalls += 1;
				return {
					output:
						coordinatorCalls === 1
							? JSON.stringify({ next: "s-research", context_steps: [1], reason: "refazer pesquisa" })
							: JSON.stringify({ next: "done" }),
					usedFallbackModel: false,
				};
			}
			expect(systemPrompt).toContain("AGENT_PROMPT_MARKER");
			expect(prompt).toContain("Passo 1:");
			expect(prompt).toContain("pesquisa pronta");
			expect(prompt).toContain("Passo 2:");
			expect(prompt).toContain("REVIEW_CHANGES owner=Copywriter");
			return { output: "copy corrigida", usedFallbackModel: false };
		});

		const previousRun = runRecord("run-review-owner", squadId, {
			steps: [
				{
					stepId: "step-1",
					agentId: "a1",
					seatId: "s-research",
					artifact: { stepId: "step-1", kind: "text", content: "pesquisa pronta", createdAt: ISO },
				},
				{
					stepId: "step-2",
					agentId: "a3",
					seatId: "s-review",
					artifact: {
						stepId: "step-2",
						kind: "text",
						content: "REVIEW_CHANGES owner=Copywriter details=Gerar roteiro, legenda e hashtags.",
						createdAt: ISO,
					},
				},
			],
		});

		continueRun(squadId, previousRun);

		await vi.waitFor(() => {
			expect(vi.mocked(notifyOs).mock.calls.some(([title]) => title.includes("conclu"))).toBe(true);
		});
		const runtime = useOrchestratorRuntimeStore.getState().getRuntime(squadId);
		const lastAgentEvent = [...runtime.events].reverse().find((event) => event.kind === "agent");
		expect(lastAgentEvent?.agentId).toBe("a2");
		expect(callAgentStep).toHaveBeenCalledTimes(3);
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

const approvalRequest = (overrides: Partial<ApprovalRequest> & Pick<ApprovalRequest, "id">): ApprovalRequest => ({
	squadId: "squad",
	runId: "run-persisted",
	seatId: "s1",
	agentId: "a1",
	checkpointKind: "before",
	status: "pending",
	title: "Aprovação necessária antes de acionar Beto",
	summary: "",
	canDecide: true,
	canCancel: true,
	items: [],
	createdAt: ISO,
	updatedAt: ISO,
	...overrides,
});

describe("orchestrator-runtime — checkpoint com aprovação externa (n8n/aprovador delegado)", () => {
	it("enterCheckpoint não bloqueia a transição pro estado checkpoint enquanto o POST /approvals está em voo", async () => {
		const squadId = "squad-approval-nonblocking";
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Beto", requiresCheckpoint: true })],
				seats: [seat("s1", "a1")],
			}),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "s1" }));
		let resolveCreate: (approval: ApprovalRequest) => void = () => undefined;
		vi.mocked(createApprovalApi).mockReturnValue(
			new Promise((resolve) => {
				resolveCreate = resolve;
			}),
		);

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).status).toBe("checkpoint");
		});
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).pendingApprovalId).toBeNull();

		resolveCreate(approvalRequest({ id: "appr-1", squadId, seatId: "s1", agentId: "a1" }));
		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).pendingApprovalId).toBe("appr-1");
		});
	});

	it("resolveCheckpoint bloqueia reprovar sem justificativa e não chama o backend", async () => {
		const squadId = "squad-approval-no-reason";
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Beto", requiresCheckpoint: true })],
				seats: [seat("s1", "a1")],
			}),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "s1" }));
		vi.mocked(createApprovalApi).mockResolvedValue(
			approvalRequest({ id: "appr-2", squadId, seatId: "s1", agentId: "a1" }),
		);

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).pendingApprovalId).toBe("appr-2");
		});
		const runId = useOrchestratorRuntimeStore.getState().getRuntime(squadId).runId as string;

		resolveCheckpoint(runId, false);

		expect(notify.error).toHaveBeenCalledWith("Justificativa obrigatória para reprovar um checkpoint.");
		expect(decideApprovalApi).not.toHaveBeenCalled();
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).status).toBe("checkpoint");
	});

	it("resolveCheckpoint com justificativa decide via backend, grava a rejeição e aborta o run", async () => {
		const squadId = "squad-approval-reject";
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Beto", requiresCheckpoint: true })],
				seats: [seat("s1", "a1")],
			}),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "s1" }));
		vi.mocked(createApprovalApi).mockResolvedValue(
			approvalRequest({ id: "appr-3", squadId, seatId: "s1", agentId: "a1" }),
		);
		vi.mocked(decideApprovalApi).mockResolvedValue(
			approvalRequest({
				id: "appr-3",
				squadId,
				seatId: "s1",
				agentId: "a1",
				status: "rejected",
				feedback: "faltou revisar o tom",
				decidedByRole: "owner",
			}),
		);

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).pendingApprovalId).toBe("appr-3");
		});
		const runId = useOrchestratorRuntimeStore.getState().getRuntime(squadId).runId as string;

		resolveCheckpoint(runId, false, { reason: "faltou revisar o tom" });

		await vi.waitFor(() => {
			expect(decideApprovalApi).toHaveBeenCalledWith("appr-3", { approved: false, feedback: "faltou revisar o tom" });
		});
		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).status).toBe("aborted");
		});
		await vi.waitFor(() => {
			const rejectionCall = vi.mocked(updateRunApi).mock.calls.find((call) =>
				call[2]?.rejections?.some((r) => r.reason === "faltou revisar o tom"),
			);
			expect(rejectionCall).toBeDefined();
		});
	});

	it("marca a cadeira pausada como checkpoint — é disso que a cena do escritório monta o balão", async () => {
		const squadId = "squad-checkpoint-seat";
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Beto", requiresCheckpoint: true })],
				seats: [seat("s1", "a1")],
			}),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "s1" }));
		vi.mocked(createApprovalApi).mockResolvedValue(
			approvalRequest({ id: "appr-seat", squadId, seatId: "s1", agentId: "a1" }),
		);

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).status).toBe("checkpoint");
		});
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).perAgentStatus.s1).toBe("checkpoint");
	});

	// Só o kind "after" torna a restauração observável: no "before" a cadeira nunca rodou e
	// `runOrchestratedAgentStep` sobrescreve com "working" logo depois da aprovação.
	it("devolve a cadeira para done ao aprovar um checkpoint after — senão o balão fica na cena", async () => {
		const squadId = "squad-checkpoint-seat-approve";
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Beto", requiresCheckpointAfter: true })],
				seats: [seat("s1", "a1")],
			}),
		);
		// O coordenador só aciona a cadeira uma vez: sem o "done" na segunda rodada o run reabriria um
		// checkpoint novo e a asserção pegaria a pausa seguinte em vez da restauração.
		let coordinatorCalls = 0;
		vi.mocked(callAgentStep).mockImplementation(async ({ systemPrompt }) => {
			if (systemPrompt !== "COORDINATOR_PROMPT_MARKER") return { output: "ok", usedFallbackModel: false };
			coordinatorCalls += 1;
			return {
				output: JSON.stringify(coordinatorCalls === 1 ? { next: "s1" } : { next: "done" }),
				usedFallbackModel: false,
			};
		});
		vi.mocked(createApprovalApi).mockResolvedValue(
			approvalRequest({ id: "appr-seat-ok", squadId, seatId: "s1", agentId: "a1", checkpointKind: "after" }),
		);
		vi.mocked(decideApprovalApi).mockResolvedValue(
			approvalRequest({
				id: "appr-seat-ok",
				squadId,
				seatId: "s1",
				agentId: "a1",
				checkpointKind: "after",
				status: "approved",
				decidedByRole: "owner",
			}),
		);

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).pendingApprovalId).toBe("appr-seat-ok");
		});
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).perAgentStatus.s1).toBe("checkpoint");
		const runId = useOrchestratorRuntimeStore.getState().getRuntime(squadId).runId as string;

		resolveCheckpoint(runId, true);

		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).status).toBe("completed");
		});
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).perAgentStatus.s1).toBe("done");
	});

	it("tira a cadeira de checkpoint ao reprovar, mesmo com o run abortado", async () => {
		const squadId = "squad-checkpoint-seat-reject";
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Beto", requiresCheckpoint: true })],
				seats: [seat("s1", "a1")],
			}),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "s1" }));
		vi.mocked(createApprovalApi).mockResolvedValue(
			approvalRequest({ id: "appr-seat-no", squadId, seatId: "s1", agentId: "a1" }),
		);
		vi.mocked(decideApprovalApi).mockResolvedValue(
			approvalRequest({
				id: "appr-seat-no",
				squadId,
				seatId: "s1",
				agentId: "a1",
				status: "rejected",
				feedback: "não é isso",
				decidedByRole: "owner",
			}),
		);

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).pendingApprovalId).toBe("appr-seat-no");
		});
		const runId = useOrchestratorRuntimeStore.getState().getRuntime(squadId).runId as string;

		resolveCheckpoint(runId, false, { reason: "não é isso" });

		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).status).toBe("aborted");
		});
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).perAgentStatus.s1).not.toBe("checkpoint");
	});

	it("stopRun cancela o pedido de aprovação pendente no backend", async () => {
		const squadId = "squad-approval-stop";
		seedCache(
			squadId,
			squadDetail(squadId, {
				agents: [agent({ id: "a1", name: "Beto", requiresCheckpoint: true })],
				seats: [seat("s1", "a1")],
			}),
		);
		mockCoordinatorAndAgentReplies(JSON.stringify({ next: "s1" }));
		vi.mocked(createApprovalApi).mockResolvedValue(
			approvalRequest({ id: "appr-4", squadId, seatId: "s1", agentId: "a1" }),
		);
		vi.mocked(cancelApprovalApi).mockResolvedValue(
			approvalRequest({ id: "appr-4", squadId, seatId: "s1", agentId: "a1", status: "canceled" }),
		);

		startRun(squadId, "briefing");

		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).pendingApprovalId).toBe("appr-4");
		});
		const runId = useOrchestratorRuntimeStore.getState().getRuntime(squadId).runId as string;

		stopRun(runId);

		expect(cancelApprovalApi).toHaveBeenCalledWith("appr-4");
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).status).toBe("aborted");
	});

	it("continueRun não duplica o pedido de aprovação — restaura pendingApprovalId do snapshot sem recriar", async () => {
		const squadId = "squad-approval-resume";
		seedCache(
			squadId,
			squadDetail(squadId, { agents: [agent({ id: "a1", name: "Beto" })], seats: [seat("s1", "a1")] }),
		);
		vi.mocked(callAgentStep).mockRejectedValue(new Error("não deveria ser chamado nesse caminho"));
		vi.mocked(createApprovalApi).mockRejectedValue(new Error("não deveria criar um novo pedido"));
		vi.mocked(getApprovalApi).mockResolvedValue(
			approvalRequest({ id: "appr-5", squadId, seatId: "s1", agentId: "a1", status: "pending" }),
		);

		const previousRun = runRecord("run-approval-resume", squadId, {
			runtimeSnapshot: {
				currentStep: 0,
				pendingSeatId: "s1",
				pendingCheckpointKind: "before",
				pendingQuestion: null,
				pendingApprovalId: "appr-5",
			},
		});

		continueRun(squadId, previousRun);

		await vi.waitFor(() => {
			expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).status).toBe("checkpoint");
		});
		expect(useOrchestratorRuntimeStore.getState().getRuntime(squadId).pendingApprovalId).toBe("appr-5");
		expect(createApprovalApi).not.toHaveBeenCalled();
	});
});
