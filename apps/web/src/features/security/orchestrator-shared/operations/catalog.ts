import type { z } from "zod";
import {
	addAgentInputSchema,
	addSeatInputSchema,
	assignSeatInputSchema,
	attachToolInputSchema,
	createSquadInputSchema,
	deleteSquadInputSchema,
	getSquadInputSchema,
	listRunsInputSchema,
	removeAgentInputSchema,
	removeSeatInputSchema,
	runSquadInputSchema,
	setOrchestratorInputSchema,
	updateAgentInputSchema,
	updateSquadInputSchema,
} from "./schemas";

export type OperationName =
	| "list_squads"
	| "get_squad"
	| "create_squad"
	| "update_squad"
	| "delete_squad"
	| "add_agent"
	| "update_agent"
	| "remove_agent"
	| "add_seat"
	| "assign_seat"
	| "remove_seat"
	| "set_orchestrator"
	| "attach_tool"
	| "run_squad"
	| "list_runs"
	| "list_providers"
	| "list_scripts";

export type OperationMeta = {
	name: OperationName;
	description: string;
	destructive: boolean;
	/** Ausente só nas operações sem parâmetros (list_squads/list_providers/list_scripts). */
	schema?: z.ZodTypeAny;
};

/**
 * Metadados puros do catálogo de operações — só `zod` como dependência, sem nada de
 * `@/app/api/clients` (Vite: `import.meta.env`, `tokenStorage` do Electron). Isso deixa este arquivo
 * seguro de importar tanto pelo app (`registry.ts`, que amarra `call`/`confirm` às funções reais de
 * `operations.ts`) quanto pelo MCP server externo (`electron/mcp-server`, processo Node puro que fala
 * com o backend direto) — mesma convenção de `electron/runner/*`, que nunca importa `src/`.
 * Ver docs/plano-integracoes-e-flow-builder.md, Etapa 5.
 */
export const OPERATIONS_META: OperationMeta[] = [
	{ name: "list_squads", description: "Lista os squads do usuário logado. Sem parâmetros.", destructive: false },
	{
		name: "get_squad",
		description: "Detalha um squad (agents, cadeiras, coordenador). Parâmetros: { squadId }.",
		destructive: false,
		schema: getSquadInputSchema,
	},
	{
		name: "create_squad",
		description:
			"Cria um squad novo. Parâmetros: { name, description?, icon?, orchSystemPrompt?, orchProviderId?, orchModel?, orchMaxSteps? }.",
		destructive: false,
		schema: createSquadInputSchema,
	},
	{
		name: "update_squad",
		description: "Atualiza campos de um squad existente. Parâmetros: { squadId, patch: { ... } }.",
		destructive: false,
		schema: updateSquadInputSchema,
	},
	{
		name: "delete_squad",
		description: "Apaga um squad e todo o histórico de runs. DESTRUTIVA. Parâmetros: { squadId }.",
		destructive: true,
		schema: deleteSquadInputSchema,
	},
	{
		name: "add_agent",
		description:
			"Adiciona um agent ao squad. Parâmetros: { squadId, agent: { name, role?, systemPrompt?, providerId?, model?, scriptIds?, canExecute?, requiresCheckpoint?, requiresCheckpointAfter?, character?, gender?, accentColor? } }.",
		destructive: false,
		schema: addAgentInputSchema,
	},
	{
		name: "update_agent",
		description: "Atualiza campos de um agent existente. Parâmetros: { squadId, agentId, patch: { ... } }.",
		destructive: false,
		schema: updateAgentInputSchema,
	},
	{
		name: "remove_agent",
		description: "Remove um agent do squad. DESTRUTIVA. Parâmetros: { squadId, agentId }.",
		destructive: true,
		schema: removeAgentInputSchema,
	},
	{
		name: "add_seat",
		description: "Cria uma cadeira no escritório do squad. Parâmetros: { squadId, col, row, agentId? }.",
		destructive: false,
		schema: addSeatInputSchema,
	},
	{
		name: "assign_seat",
		description: "Senta (ou remove) um agent de uma cadeira. Parâmetros: { squadId, seatId, agentId: string | null }.",
		destructive: false,
		schema: assignSeatInputSchema,
	},
	{
		name: "remove_seat",
		description: "Remove uma cadeira do escritório. DESTRUTIVA. Parâmetros: { squadId, seatId }.",
		destructive: true,
		schema: removeSeatInputSchema,
	},
	{
		name: "set_orchestrator",
		description:
			"Configura o coordenador do squad. Parâmetros: { squadId, config: { systemPrompt, modelRef: { providerId, model }, maxSteps } }.",
		destructive: false,
		schema: setOrchestratorInputSchema,
	},
	{
		name: "attach_tool",
		description: "Anexa um script/tool da biblioteca a um agent. Parâmetros: { squadId, agentId, scriptId }.",
		destructive: false,
		schema: attachToolInputSchema,
	},
	{
		name: "run_squad",
		description:
			"Inicia a execução de um squad. Parâmetros: { squadId, briefing? } (briefing = instrução/entrada inicial do run).",
		destructive: false,
		schema: runSquadInputSchema,
	},
	{
		name: "list_runs",
		description: "Lista o histórico de execuções de um squad. Parâmetros: { squadId }.",
		destructive: false,
		schema: listRunsInputSchema,
	},
	{ name: "list_providers", description: "Lista os providers/modelos cadastrados. Sem parâmetros.", destructive: false },
	{
		name: "list_scripts",
		description: "Lista os scripts/tools cadastrados na biblioteca. Sem parâmetros.",
		destructive: false,
	},
];

export const getOperationMeta = (name: string): OperationMeta | undefined =>
	OPERATIONS_META.find((op) => op.name === name);
