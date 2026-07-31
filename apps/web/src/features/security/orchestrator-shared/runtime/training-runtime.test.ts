import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
	get: vi.fn(),
	post: vi.fn(),
	put: vi.fn(),
	delete: vi.fn(),
}));
const queryClientMock = vi.hoisted(() => ({
	getQueryData: vi.fn(),
	invalidateQueries: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/app/api/clients", () => ({ api: apiMock, tanStackQueryClient: queryClientMock, apiUrl: "http://localhost" }));

const callAgentStepMock = vi.hoisted(() => vi.fn());
vi.mock("./model-client", async (importOriginal) => ({
	...(await importOriginal<typeof import("./model-client")>()),
	callAgentStep: callAgentStepMock,
}));

import type { SquadDetail } from "@/features/security/squad-detail/api";
import type { Agent, ModelProvider, RunRecord, RunRejection } from "../types";
import {
	applyLesson,
	buildLessonMarkdown,
	buildTrainingDossier,
	checkPromptGuard,
	MAX_SYSTEM_PROMPT_CHARS,
	parseTrainingProposal,
	resolveBlamedAgent,
	runTraining,
} from "./training-runtime";

const agent = (over: Partial<Agent> & Pick<Agent, "id" | "name">): Agent => ({
	role: "Redator",
	systemPrompt: "Você escreve textos.",
	modelRef: { providerId: "provider-1", model: "model-1" },
	scriptIds: [],
	scripts: [],
	knowledgeCollectionIds: [],
	authBindings: [],
	canExecute: false,
	requiresCheckpoint: false,
	requiresCheckpointAfter: false,
	character: "Male1",
	gender: "male",
	accentColor: "#6366f1",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	...over,
});

const writer = agent({ id: "agent-writer", name: "Redator" });
const publisher = agent({ id: "agent-publisher", name: "Publicador", role: "Publicador" });

const squad: SquadDetail = {
	id: "squad-1",
	name: "Conteúdo",
	description: "",
	icon: "",
	trigger: { type: "manual" },
	savedBriefing: null,
	agents: [writer, publisher],
	seats: [
		{ id: "seat-1", col: 0, row: 0, agentId: writer.id },
		{ id: "seat-2", col: 1, row: 0, agentId: publisher.id },
	],
	orchestrator: {
		systemPrompt: "Coordene.",
		modelRef: { providerId: "provider-1", model: "coordinator-model" },
		maxSteps: 20,
	},
	lessonsCollectionId: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const step = (stepId: string, agentId: string, seatId: string, content: string) => ({
	stepId,
	agentId,
	seatId,
	artifact: { stepId, kind: "text" as const, content, createdAt: "2026-01-01T00:00:00.000Z" },
});

const run: RunRecord = {
	id: "run-1234-5678",
	squadId: squad.id,
	input: "Escrever e publicar o post de lançamento.",
	startedAt: "2026-01-01T00:00:00.000Z",
	endedAt: null,
	status: "aborted",
	steps: [
		step("step-1", writer.id, "seat-1", "Rascunho do post."),
		step("step-2", publisher.id, "seat-2", "Post publicado sem revisão do jurídico."),
	],
	qaLog: [],
};

const rejection: RunRejection = {
	id: "rej-1",
	seatId: "seat-2",
	agentId: publisher.id,
	blamedStepId: "step-1",
	checkpointKind: "after",
	reason: "O texto prometeu prazo que não podemos cumprir.",
	category: "wrong_info",
	severity: "high",
	createdAt: "2026-03-12T10:00:00.000Z",
};

const provider: ModelProvider = {
	id: "provider-1",
	label: "Provider 1",
	kind: "anthropic-api",
	models: [{ value: "coordinator-model", label: "Coordinator" }],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
	vi.clearAllMocks();
	queryClientMock.invalidateQueries.mockResolvedValue(undefined);
});

describe("resolveBlamedAgent", () => {
	it("analisa o agente do passo apontado, não o do checkpoint", () => {
		expect(resolveBlamedAgent(squad, run, rejection)?.id).toBe(writer.id);
	});

	it("cai no passo do checkpoint quando nenhum passo é apontado", () => {
		expect(resolveBlamedAgent(squad, run, { ...rejection, blamedStepId: undefined })?.id).toBe(publisher.id);
	});
});

describe("buildTrainingDossier", () => {
	it("inclui briefing, justificativa, classificação e o prompt do agente responsável", () => {
		const dossier = buildTrainingDossier(squad, run, rejection);

		expect(dossier).toContain("Escrever e publicar o post de lançamento.");
		expect(dossier).toContain("O texto prometeu prazo que não podemos cumprir.");
		expect(dossier).toContain("informação errada");
		expect(dossier).toContain("gravidade: alta");
		expect(dossier).toContain("Você escreve textos.");
		expect(dossier).toContain("Redator");
	});

	it("prioriza a saída reprovada com orçamento maior que o dos passos anteriores", () => {
		const long = "x".repeat(20000);
		const wide: RunRecord = {
			...run,
			steps: [step("step-0", publisher.id, "seat-2", long), step("step-1", writer.id, "seat-1", long)],
		};
		const dossier = buildTrainingDossier(squad, wide, { ...rejection, blamedStepId: "step-1" });

		const blamed = dossier.slice(dossier.indexOf("## Passo culpado"));
		const upstream = dossier.slice(dossier.indexOf("## Passos que"), dossier.indexOf("## Passo culpado"));
		expect(blamed.length).toBeGreaterThan(upstream.length);
		expect(dossier).toContain("(truncado)");
	});

	it("nunca inclui o toolLog", () => {
		const withToolLog = {
			...run,
			toolLog: [{ toolName: "Bash", input: "curl -H 'Authorization: Bearer segredo'" }],
		} as unknown as RunRecord;
		const dossier = buildTrainingDossier(squad, withToolLog, rejection);

		expect(dossier).not.toContain("toolLog");
		expect(dossier).not.toContain("Bearer segredo");
	});
});

describe("parseTrainingProposal", () => {
	const valid = {
		diagnosis: "O agente prometeu prazo sem base.",
		blameVerdict: "agent",
		lesson: {
			title: "Não prometer prazo sem confirmação",
			scenario: "Textos de lançamento que citam datas",
			mistake: "Prometeu entrega em 30 dias sem confirmar com operações",
			rule: "Só cite prazo que esteja no briefing ou confirmado por operações",
		},
		promptPatch: {
			proposedSystemPrompt: "Você escreve textos.\n\n## Regras aprendidas\n- Não prometa prazo sem confirmação.",
			rationale: "Fecha a lacuna que gerou a reprovação.",
			changedSections: ["Regras aprendidas"],
		},
		confidence: 0.8,
	};

	it("aceita JSON puro", () => {
		const result = parseTrainingProposal(JSON.stringify(valid));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.proposal.blameVerdict).toBe("agent");
		expect(result.proposal.lesson?.title).toBe("Não prometer prazo sem confirmação");
		expect(result.proposal.promptPatch?.changedSections).toEqual(["Regras aprendidas"]);
	});

	it("aceita cerca de código e texto em volta", () => {
		const raw = `Analisei o caso.\n\n\`\`\`json\n${JSON.stringify(valid)}\n\`\`\`\n\nEspero ter ajudado.`;
		const result = parseTrainingProposal(raw);
		expect(result.ok).toBe(true);
	});

	it("devolve erro com a saída crua quando o JSON é inválido", () => {
		const result = parseTrainingProposal("não consegui analisar isso");
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toContain("nada foi aplicado");
		expect(result.raw).toBe("não consegui analisar isso");
	});

	it("descarta o promptPatch quando o veredito não é do agente", () => {
		const result = parseTrainingProposal(JSON.stringify({ ...valid, blameVerdict: "briefing" }));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.proposal.blameVerdict).toBe("briefing");
		expect(result.proposal.promptPatch).toBeUndefined();
		expect(result.proposal.lesson).toBeDefined();
	});
});

describe("runTraining", () => {
	it("chama o modelo do coordenador, sem execução e sem scripts", async () => {
		queryClientMock.getQueryData.mockReturnValue([provider]);
		callAgentStepMock.mockResolvedValue({
			output: JSON.stringify({ diagnosis: "ok", blameVerdict: "unclear" }),
			usedFallbackModel: false,
		});

		const result = await runTraining(squad, run, rejection, new AbortController().signal);

		expect(result.ok).toBe(true);
		expect(callAgentStepMock).toHaveBeenCalledWith(
			expect.objectContaining({ model: "coordinator-model", canExecute: false, scripts: [] }),
			expect.anything(),
		);
	});

	it("falha com mensagem clara quando o coordenador não tem provider", async () => {
		queryClientMock.getQueryData.mockReturnValue([]);
		const result = await runTraining(squad, run, rejection, new AbortController().signal);

		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toContain("provider/modelo");
		expect(callAgentStepMock).not.toHaveBeenCalled();
	});
});

describe("buildLessonMarkdown", () => {
	it("põe a procedência no fim, para não roubar peso semântico do chunk", () => {
		const markdown = buildLessonMarkdown(
			{ title: "T", scenario: "S", mistake: "M", rule: "R" },
			{ runId: "run-1", date: "12/03/2026", decidedBy: "Ana", agentName: "Redator" },
		);

		expect(markdown.startsWith("# T")).toBe(true);
		expect(markdown.indexOf("Origem: run run-1")).toBeGreaterThan(markdown.indexOf("## Regra"));
		expect(markdown).toContain("reprovado por Ana");
	});
});

describe("applyLesson", () => {
	const lesson = { title: "T", scenario: "S", mistake: "M", rule: "R" };

	it("cria a coleção na primeira vez, grava no squad e vincula ao agente responsável", async () => {
		apiMock.post
			.mockResolvedValueOnce({ data: { id: "col-1", name: "Lições aprendidas — Conteúdo" } })
			.mockResolvedValueOnce({ data: { id: "doc-1", collectionId: "col-1", status: "pending" } });
		apiMock.put.mockResolvedValue({ data: {} });

		const result = await applyLesson(squad, run, rejection, lesson);

		expect(result.ok).toBe(true);
		expect(apiMock.post).toHaveBeenCalledWith("/knowledge", expect.objectContaining({ name: "Lições aprendidas — Conteúdo" }));
		expect(apiMock.put).toHaveBeenCalledWith("/squads/squad-1", { lessonsCollectionId: "col-1" });
		expect(apiMock.put).toHaveBeenCalledWith(`/squads/squad-1/agents/${writer.id}`, {
			knowledgeCollectionIds: ["col-1"],
		});
	});

	it("reusa a coleção existente e não revincula um agente que já a consulta", async () => {
		const linked: SquadDetail = {
			...squad,
			lessonsCollectionId: "col-1",
			agents: [{ ...writer, knowledgeCollectionIds: ["col-1"] }, publisher],
		};
		apiMock.post.mockResolvedValueOnce({ data: { id: "doc-2", collectionId: "col-1", status: "pending" } });

		const result = await applyLesson(linked, run, rejection, lesson);

		expect(result.ok).toBe(true);
		expect(apiMock.post).toHaveBeenCalledTimes(1);
		expect(apiMock.post).toHaveBeenCalledWith("/knowledge/col-1/documents", expect.any(FormData));
		expect(apiMock.put).not.toHaveBeenCalled();
	});
});

describe("checkPromptGuard", () => {
	it("bloqueia acima do teto absoluto", () => {
		const result = checkPromptGuard("x".repeat(10000), "y".repeat(MAX_SYSTEM_PROMPT_CHARS + 1));
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.error).toContain("salvar a lição continua disponível");
	});

	it("bloqueia crescimento desproporcional mesmo abaixo do teto", () => {
		const result = checkPromptGuard("x".repeat(100), "y".repeat(400));
		expect(result.ok).toBe(false);
	});

	it("aceita uma reescrita de tamanho semelhante", () => {
		expect(checkPromptGuard("x".repeat(1000), "y".repeat(1100)).ok).toBe(true);
	});
});
