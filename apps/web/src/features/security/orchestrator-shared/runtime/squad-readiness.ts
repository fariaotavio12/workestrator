import type { ModelProvider, ProviderKind, Squad } from "../types";

export type SquadReadinessIssue =
	| { kind: "no-provider" }
	| { kind: "no-seat-occupied" }
	| { kind: "coordinator-provider-missing" }
	| { kind: "coordinator-no-model" }
	| { kind: "coordinator-model-missing"; model: string }
	| { kind: "agent-provider-missing"; agentId: string; agentName: string }
	| { kind: "agent-no-model"; agentId: string; agentName: string }
	| { kind: "agent-model-missing"; agentId: string; agentName: string; model: string };

/**
 * Um squad pode "parecer pronto" (cadeiras ocupadas) e ainda assim falhar no meio da execução se um
 * provider referenciado foi deletado ou nunca existiu — ver `orchestrator-runtime.ts`, onde
 * `runOrchestratedAgentStep`/`advanceOrchestrated` abortam o run já em andamento nesse caso. Esta
 * checagem roda ANTES de permitir "Rodar", pra não deixar o usuário descobrir a quebra só depois de
 * iniciar (ver docs/plano-integracoes-e-flow-builder.md, Etapa U2).
 */
export const getSquadReadiness = (squad: Squad, providers: ModelProvider[]): SquadReadinessIssue[] => {
	if (providers.length === 0) return [{ kind: "no-provider" }];

	const issues: SquadReadinessIssue[] = [];
	const occupiedSeats = squad.seats.filter((seat) => seat.agentId);

	if (occupiedSeats.length === 0) {
		issues.push({ kind: "no-seat-occupied" });
	}

	const coordinatorProvider = providers.find((provider) => provider.id === squad.orchestrator.modelRef.providerId);
	if (!coordinatorProvider) {
		issues.push({ kind: "coordinator-provider-missing" });
	} else if (!squad.orchestrator.modelRef.model) {
		issues.push({ kind: "coordinator-no-model" });
	} else if (
		coordinatorProvider.models.length > 0 &&
		!coordinatorProvider.models.some((model) => model.value === squad.orchestrator.modelRef.model)
	) {
		issues.push({ kind: "coordinator-model-missing", model: squad.orchestrator.modelRef.model });
	}

	const seatedAgentIds = new Set(occupiedSeats.map((seat) => seat.agentId));
	for (const agent of squad.agents) {
		if (!seatedAgentIds.has(agent.id)) continue;
		if (!agent.modelRef.model) {
			issues.push({ kind: "agent-no-model", agentId: agent.id, agentName: agent.name });
			continue;
		}
		const provider = providers.find((item) => item.id === agent.modelRef.providerId);
		if (!provider) {
			issues.push({ kind: "agent-provider-missing", agentId: agent.id, agentName: agent.name });
		} else if (provider.models.length > 0 && !provider.models.some((model) => model.value === agent.modelRef.model)) {
			issues.push({ kind: "agent-model-missing", agentId: agent.id, agentName: agent.name, model: agent.modelRef.model });
		}
	}

	return issues;
};

export const isSquadReady = (squad: Squad, providers: ModelProvider[]): boolean =>
	getSquadReadiness(squad, providers).length === 0;

/**
 * Providers que executam por CLI local (`claude`, `codex`, `gpt`): dependem do binário instalado e
 * autenticado na máquina, então só rodam onde há um runner com acesso a processo — o app desktop.
 */
const CLI_PROVIDER_KINDS = new Set<ProviderKind>(["claude-cli", "codex-cli", "gpt-cli"]);

/** Só o que a decisão precisa — aceita tanto `Squad` quanto o `SquadDetail` do cache, sem cast. */
type SquadForExecution = Pick<Squad, "orchestrator" | "seats" | "agents">;

/**
 * `true` quando o coordenador e todos os agents sentados usam provider de API (HTTP puro), sem
 * nenhuma CLI local no caminho. Esses squads são executáveis fora do Electron, porque toda a
 * execução vira request HTTP — é o que permite rodar direto no navegador (ver `requireRunner`).
 *
 * Cadeiras vazias e agents não sentados são ignorados de propósito: não entram na execução, então um
 * agent de CLI guardado no squad mas fora de cadeira não deve bloquear o run.
 *
 * Provider inexistente conta como não-API: aí o run falharia de qualquer jeito, e `getSquadReadiness`
 * é quem dá a mensagem específica disso.
 */
export const isApiOnlySquad = (squad: SquadForExecution, providers: ModelProvider[]): boolean => {
	const kindOf = (providerId: string): ProviderKind | undefined =>
		providers.find((provider) => provider.id === providerId)?.kind;

	const isApiKind = (providerId: string): boolean => {
		const kind = kindOf(providerId);
		return kind !== undefined && !CLI_PROVIDER_KINDS.has(kind);
	};

	if (!isApiKind(squad.orchestrator.modelRef.providerId)) return false;

	const seatedAgentIds = new Set(squad.seats.filter((seat) => seat.agentId).map((seat) => seat.agentId));
	if (seatedAgentIds.size === 0) return false;

	return squad.agents
		.filter((agent) => seatedAgentIds.has(agent.id))
		.every((agent) => isApiKind(agent.modelRef.providerId));
};

export const readinessMessage = (issue: SquadReadinessIssue): string => {
	switch (issue.kind) {
		case "no-provider":
			return "Nenhum provider cadastrado — conecte um modelo antes de rodar.";
		case "no-seat-occupied":
			return "Nenhuma cadeira ocupada — sente ao menos um agent.";
		case "coordinator-provider-missing":
			return "O provider do coordenador não existe mais.";
		case "coordinator-no-model":
			return "O coordenador não tem modelo selecionado.";
		case "coordinator-model-missing":
			return `O modelo "${issue.model}" do coordenador não existe mais no provider.`;
		case "agent-provider-missing":
			return `${issue.agentName}: o provider não existe mais.`;
		case "agent-no-model":
			return `${issue.agentName}: nenhum modelo selecionado.`;
		case "agent-model-missing":
			return `${issue.agentName}: o modelo "${issue.model}" não existe mais no provider.`;
	}
};
