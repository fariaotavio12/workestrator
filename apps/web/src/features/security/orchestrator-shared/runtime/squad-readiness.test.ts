import { describe, expect, it } from "vitest";
import type { Agent, ModelProvider, Seat, Squad } from "../types";
import { getSquadReadiness, isApiOnlySquad, isSquadReady, readinessMessage } from "./squad-readiness";

const provider = (id: string, overrides: Partial<ModelProvider> = {}): ModelProvider => ({
	id,
	label: id,
	kind: "anthropic-api",
	models: [{ value: "model-1", label: "Model 1" }],
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	...overrides,
});

const agent = (overrides: Partial<Agent> & Pick<Agent, "id" | "name">): Agent => ({
	role: "Agent",
	systemPrompt: "faz coisas",
	modelRef: { providerId: "provider-1", model: "model-1" },
	scriptIds: [],
	canExecute: false,
	requiresCheckpoint: false,
	requiresCheckpointAfter: false,
	character: "Male1",
	gender: "male",
	accentColor: "#000000",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	...overrides,
});

const seat = (id: string, agentId: string | null): Seat => ({ id, col: 1, row: 1, agentId });

const squad = (overrides: Partial<Squad> = {}): Squad => ({
	id: "squad-1",
	name: "Squad",
	description: "",
	icon: "🤖",
	trigger: { type: "manual" },
	savedBriefing: null,
	agents: [],
	seats: [],
	orchestrator: { systemPrompt: "coordena", modelRef: { providerId: "provider-1", model: "model-1" }, maxSteps: 20 },
	runtime: {
		status: "idle",
		currentStep: 0,
		perAgentStatus: {},
		log: [],
		events: [],
		pendingSeatId: null,
		pendingCheckpointKind: null,
		streamingText: null,
		pendingQuestion: null,
		pendingQaHistory: [],
		liveActivity: [],
		toolLog: [],
		liveTerminal: "",
		coordinatorThinking: false,
		stepStartedAt: null,
	},
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	...overrides,
});

describe("getSquadReadiness", () => {
	it("aponta no-provider quando não há nenhum provider cadastrado, ignorando as outras checagens", () => {
		const s = squad({ agents: [agent({ id: "a1", name: "Ana" })], seats: [seat("s1", "a1")] });
		expect(getSquadReadiness(s, [])).toEqual([{ kind: "no-provider" }]);
	});

	it("aponta no-seat-occupied quando nenhuma cadeira está ocupada", () => {
		const s = squad({ seats: [seat("s1", null)] });
		const issues = getSquadReadiness(s, [provider("provider-1")]);
		expect(issues).toContainEqual({ kind: "no-seat-occupied" });
	});

	it("aponta coordinator-provider-missing quando o provider do coordenador foi deletado", () => {
		const s = squad({
			orchestrator: { systemPrompt: "coordena", modelRef: { providerId: "provider-x", model: "model-1" }, maxSteps: 20 },
			agents: [agent({ id: "a1", name: "Ana" })],
			seats: [seat("s1", "a1")],
		});
		const issues = getSquadReadiness(s, [provider("provider-1")]);
		expect(issues).toContainEqual({ kind: "coordinator-provider-missing" });
	});

	it("aponta coordinator-model-missing quando o modelo do coordenador foi removido do provider", () => {
		const s = squad({
			orchestrator: { systemPrompt: "coordena", modelRef: { providerId: "provider-1", model: "model-x" }, maxSteps: 20 },
			agents: [agent({ id: "a1", name: "Ana" })],
			seats: [seat("s1", "a1")],
		});
		const issues = getSquadReadiness(s, [provider("provider-1")]);
		expect(issues).toContainEqual({ kind: "coordinator-model-missing", model: "model-x" });
	});

	it("aponta agent-provider-missing só para agents sentados, não para os não sentados", () => {
		const seated = agent({ id: "a1", name: "Ana", modelRef: { providerId: "provider-x", model: "model-1" } });
		const unseated = agent({ id: "a2", name: "Beto", modelRef: { providerId: "provider-x", model: "model-1" } });
		const s = squad({ agents: [seated, unseated], seats: [seat("s1", "a1")] });
		const issues = getSquadReadiness(s, [provider("provider-1")]);
		expect(issues).toContainEqual({ kind: "agent-provider-missing", agentId: "a1", agentName: "Ana" });
		expect(issues.some((i) => i.kind === "agent-provider-missing" && i.agentId === "a2")).toBe(false);
	});

	it("aponta agent-no-model quando o agent sentado não tem modelo selecionado", () => {
		const seated = agent({ id: "a1", name: "Ana", modelRef: { providerId: "provider-1", model: "" } });
		const s = squad({ agents: [seated], seats: [seat("s1", "a1")] });
		const issues = getSquadReadiness(s, [provider("provider-1")]);
		expect(issues).toContainEqual({ kind: "agent-no-model", agentId: "a1", agentName: "Ana" });
	});

	it("não retorna nenhum issue para um squad totalmente válido", () => {
		const seated = agent({ id: "a1", name: "Ana" });
		const s = squad({ agents: [seated], seats: [seat("s1", "a1")] });
		expect(getSquadReadiness(s, [provider("provider-1")])).toEqual([]);
		expect(isSquadReady(s, [provider("provider-1")])).toBe(true);
	});
	it("aponta agent-model-missing quando o agent sentado usa um modelo removido do provider", () => {
		const seated = agent({ id: "a1", name: "Ana", modelRef: { providerId: "provider-1", model: "model-x" } });
		const s = squad({ agents: [seated], seats: [seat("s1", "a1")] });
		const issues = getSquadReadiness(s, [provider("provider-1")]);
		expect(issues).toContainEqual({ kind: "agent-model-missing", agentId: "a1", agentName: "Ana", model: "model-x" });
	});

	it("não bloqueia provider sem lista local de modelos quando a resolução acontece no runtime", () => {
		const seated = agent({ id: "a1", name: "Ana", modelRef: { providerId: "provider-1", model: "model-dinamico" } });
		const s = squad({
			orchestrator: { systemPrompt: "coordena", modelRef: { providerId: "provider-1", model: "model-dinamico" }, maxSteps: 20 },
			agents: [seated],
			seats: [seat("s1", "a1")],
		});
		expect(getSquadReadiness(s, [provider("provider-1", { models: [] })])).toEqual([]);
	});
});

describe("readinessMessage", () => {
	it("gera uma mensagem legível para cada tipo de issue", () => {
		expect(readinessMessage({ kind: "no-provider" })).toMatch(/provider/i);
		expect(readinessMessage({ kind: "no-seat-occupied" })).toMatch(/cadeira/i);
		expect(readinessMessage({ kind: "coordinator-provider-missing" })).toMatch(/coordenador/i);
		expect(readinessMessage({ kind: "coordinator-no-model" })).toMatch(/coordenador/i);
		expect(readinessMessage({ kind: "coordinator-model-missing", model: "model-x" })).toContain("model-x");
		expect(readinessMessage({ kind: "agent-provider-missing", agentId: "a1", agentName: "Ana" })).toBe(
			"Ana: o provider não existe mais.",
		);
		expect(readinessMessage({ kind: "agent-no-model", agentId: "a1", agentName: "Ana" })).toBe(
			"Ana: nenhum modelo selecionado.",
		);
		expect(readinessMessage({ kind: "agent-model-missing", agentId: "a1", agentName: "Ana", model: "model-x" })).toContain(
			"model-x",
		);
	});
});

describe("isApiOnlySquad", () => {
	const apiProvider = provider("provider-1", { kind: "openai-compat" });
	const cliProvider = provider("provider-cli", { kind: "claude-cli" });

	const withSeated = (...agents: Agent[]): Squad =>
		squad({ agents, seats: agents.map((a, i) => seat(`s${i}`, a.id)) });

	it("aceita um squad em que coordenador e agents sentados são todos de API", () => {
		const s = withSeated(agent({ id: "a1", name: "Ana" }));
		expect(isApiOnlySquad(s, [apiProvider])).toBe(true);
	});

	it("recusa quando um agent sentado usa provider de CLI local", () => {
		const s = withSeated(
			agent({ id: "a1", name: "Ana" }),
			agent({ id: "a2", name: "Beto", modelRef: { providerId: "provider-cli", model: "model-1" } }),
		);
		expect(isApiOnlySquad(s, [apiProvider, cliProvider])).toBe(false);
	});

	it("recusa quando o coordenador usa provider de CLI, mesmo com todos os agents em API", () => {
		const s = {
			...withSeated(agent({ id: "a1", name: "Ana" })),
			orchestrator: { systemPrompt: "coordena", modelRef: { providerId: "provider-cli", model: "model-1" }, maxSteps: 20 },
		};
		expect(isApiOnlySquad(s, [apiProvider, cliProvider])).toBe(false);
	});

	it("ignora agent de CLI que não está sentado — ele não entra na execução", () => {
		const seated = agent({ id: "a1", name: "Ana" });
		const benched = agent({ id: "a2", name: "Beto", modelRef: { providerId: "provider-cli", model: "model-1" } });
		const s = squad({ agents: [seated, benched], seats: [seat("s1", "a1")] });
		expect(isApiOnlySquad(s, [apiProvider, cliProvider])).toBe(true);
	});

	it("recusa um squad sem nenhuma cadeira ocupada", () => {
		expect(isApiOnlySquad(squad({ agents: [agent({ id: "a1", name: "Ana" })], seats: [] }), [apiProvider])).toBe(false);
	});

	it("recusa quando o provider referenciado não existe mais", () => {
		expect(isApiOnlySquad(withSeated(agent({ id: "a1", name: "Ana" })), [])).toBe(false);
	});

	it("aceita os demais kinds de API (openai e anthropic-api)", () => {
		const s = withSeated(agent({ id: "a1", name: "Ana" }));
		expect(isApiOnlySquad(s, [provider("provider-1", { kind: "openai" })])).toBe(true);
		expect(isApiOnlySquad(s, [provider("provider-1", { kind: "anthropic-api" })])).toBe(true);
	});

	it("recusa os demais kinds de CLI (codex e gpt)", () => {
		const s = withSeated(agent({ id: "a1", name: "Ana" }));
		expect(isApiOnlySquad(s, [provider("provider-1", { kind: "codex-cli" })])).toBe(false);
		expect(isApiOnlySquad(s, [provider("provider-1", { kind: "gpt-cli" })])).toBe(false);
	});
});
