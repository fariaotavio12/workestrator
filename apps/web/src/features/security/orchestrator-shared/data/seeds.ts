import type { Agent, ModelRef, Seat, Squad } from "../types";

// Dados de demonstração — criados na primeira vez que o app abre (ou após reset).
// IDs fixos pra manter as referências (seat -> agent) consistentes.
// Agents são por-squad (não compartilhados) — cada squad tem sua própria cópia, mesmo que
// o papel se pareça com o de outro squad. Todo squad roda no modo orquestrado (sem fluxo fixo).

const ISO = "2026-07-08T10:00:00.000Z";
const CLAUDE = "provider-claude-cli";

const modelRef = (model: string, providerId: string = CLAUDE): ModelRef => ({ providerId, model });

const agent = (
	id: string,
	name: string,
	role: string,
	character: Agent["character"],
	gender: Agent["gender"],
	model: ModelRef,
	accentColor: string,
	systemPrompt: string,
	options: {
		scriptIds?: string[];
		canExecute?: boolean;
		requiresCheckpoint?: boolean;
		requiresCheckpointAfter?: boolean;
	} = {},
): Agent => ({
	id,
	name,
	role,
	character,
	gender,
	modelRef: model,
	accentColor,
	systemPrompt,
	scriptIds: options.scriptIds ?? [],
	canExecute: options.canExecute ?? false,
	requiresCheckpoint: options.requiresCheckpoint ?? false,
	requiresCheckpointAfter: options.requiresCheckpointAfter ?? false,
	createdAt: ISO,
	updatedAt: ISO,
});

/** Grade fixa de cadeiras: 3 colunas, linhas conforme a quantidade. */
const makeSeats = (assignments: (string | null)[]): Seat[] =>
	assignments.map((agentId, i) => ({
		id: `seat-${i + 1}`,
		col: (i % 3) + 1,
		row: Math.floor(i / 3) + 1,
		agentId,
	}));

const idleRuntime = (): Squad["runtime"] => ({
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
});

export const seedSquads = (): Squad[] => {
	const contentAgents: Agent[] = [
		agent(
			"agent-researcher",
			"Fábio Fonte",
			"Pesquisador",
			"Male1",
			"male",
			modelRef("claude-sonnet-5"),
			"#0ea5e9",
			"Você pesquisa fontes confiáveis e traz dados e tendências do setor.",
		),
		agent(
			"agent-strategist",
			"Sofia Sinal",
			"Estrategista",
			"Female1",
			"female",
			modelRef("claude-opus-4-8"),
			"#8b5cf6",
			"Você define a abordagem e o ângulo do conteúdo a partir da pesquisa.",
		),
		agent(
			"agent-copywriter",
			"Camila Copy",
			"Redatora",
			"Female2",
			"female",
			modelRef("claude-sonnet-5"),
			"#ec4899",
			"Você escreve o texto final com clareza e tom da marca.",
		),
		agent(
			"agent-designer",
			"Diego Desenho",
			"Designer",
			"Male2",
			"male",
			modelRef("gpt-5", "provider-openai"),
			"#f59e0b",
			"Você cria as imagens e peças visuais para redes sociais.",
		),
		agent(
			"agent-reviewer",
			"Raul Revisão",
			"Revisor",
			"Male3",
			"male",
			modelRef("claude-haiku-4-5"),
			"#10b981",
			"Você garante qualidade, coerência e ausência de erros antes da entrega.",
			{ scriptIds: ["predefined-run-tests"] },
		),
		agent(
			"agent-publisher",
			"Paulo Publica",
			"Publicador",
			"Male4",
			"male",
			modelRef("claude-haiku-4-5"),
			"#6366f1",
			"Você agenda e publica o conteúdo nos canais definidos.",
			{ requiresCheckpoint: true },
		),
	];

	const radarAgents: Agent[] = [
		agent(
			"agent-radar-researcher",
			"Renata Radar",
			"Pesquisadora",
			"Female3",
			"female",
			modelRef("claude-sonnet-5"),
			"#0ea5e9",
			"Você monitora fontes e notícias do nicho em busca de tendências novas.",
		),
		agent(
			"agent-radar-strategist",
			"Tiago Tendência",
			"Estrategista",
			"Male1",
			"male",
			modelRef("claude-opus-4-8"),
			"#8b5cf6",
			"Você transforma as tendências encontradas em pautas prontas para produção.",
		),
	];

	const contentSeats = makeSeats([
		"agent-researcher",
		"agent-strategist",
		"agent-copywriter",
		"agent-designer",
		"agent-reviewer",
		"agent-publisher",
	]);

	const radarSeats = makeSeats(["agent-radar-researcher", "agent-radar-strategist", null]);

	return [
		{
			id: "squad-conteudo",
			name: "Conteúdo Instagram",
			description: "Pesquisa, escreve, desenha e publica carrosséis a partir de tendências.",
			icon: "📸",
			trigger: { type: "manual" },
			savedBriefing: null,
			agents: contentAgents,
			seats: contentSeats,
			orchestrator: {
				systemPrompt:
					"Você coordena o squad de Conteúdo Instagram. Direcione o trabalho entre pesquisa, estratégia, " +
					"redação, design, revisão e publicação — nessa ordem faz sentido, mas você decide se algum passo " +
					"precisa repetir. Só termine quando o conteúdo estiver pronto e publicado.",
				modelRef: modelRef("claude-opus-4-8"),
				maxSteps: 8,
			},
			runtime: idleRuntime(),
			createdAt: ISO,
			updatedAt: ISO,
		},
		{
			id: "squad-radar",
			name: "Radar de Tendências",
			description: "Monitora notícias do nicho e prepara pautas.",
			icon: "📡",
			trigger: { type: "schedule", every: "1h", enabled: false },
			savedBriefing: null,
			agents: radarAgents,
			seats: radarSeats,
			orchestrator: {
				systemPrompt:
					"Você é o coordenador do squad Radar de Tendências. Direcione o trabalho entre pesquisa e " +
					"definição de pauta, decidindo qual agent deve agir a seguir até a pauta estar pronta para produção.",
				modelRef: modelRef("claude-opus-4-8"),
				maxSteps: 6,
			},
			runtime: idleRuntime(),
			createdAt: ISO,
			updatedAt: ISO,
		},
	];
};
