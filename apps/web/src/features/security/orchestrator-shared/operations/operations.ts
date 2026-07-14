import { api } from "@/app/api/clients";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import type {
	AgentPayload,
	AgentResponseDto,
	SeatResponseDto,
	SquadDetail,
	SquadDetailResponseDto,
} from "@/features/security/squad-detail/api";
import { mapAgentDto, mapSeatDto, mapSquadDetailDto, orchestratorConfigToPayload } from "@/features/security/squad-detail/api";
import type { CreateSquadPayload, SquadSummary } from "@/features/security/squads/api";
import type { z } from "zod";
import type { Agent, ModelProvider, OrchestratorConfig, RunRecord, Script, Seat } from "../types";
import { startRun } from "../runtime/orchestrator-runtime";
import { useOperationsAuditStore } from "./audit";
import {
	addAgentInputSchema,
	addSeatInputSchema,
	assignSeatInputSchema,
	attachToolInputSchema,
	createSkillInputSchema,
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
import type { AuditEntryStatus, OperationCallOptions, OperationFailure, OperationResult } from "./types";

type ExploreAssetResponse = {
	id: string;
	title: string;
	description: string;
	visibility: "PRIVATE" | "PUBLIC";
};

const record = (operation: string, input: unknown, status: AuditEntryStatus, summary: string) => {
	useOperationsAuditStore.getState().record({ operation, input, status, summary });
};

const validationFailure = (operation: string, input: unknown, error: z.ZodError): OperationFailure => {
	const message = error.issues.map((issue) => issue.message).join("; ");
	record(operation, input, "failure", message);
	return { ok: false, error: message };
};

/**
 * Wrapper comum a toda operação: aplica o checkpoint de confirmação em ações destrutivas, loga o
 * resultado no `useOperationsAuditStore` (auditoria) e normaliza erros de API via
 * `getApiErrorMessage`. Ver docs/plano-integracoes-e-flow-builder.md, Etapa 5.
 */
const execute = async <T>(params: {
	operation: string;
	input: unknown;
	destructive?: boolean;
	confirm?: boolean;
	confirmationSummary?: string;
	run: () => Promise<{ data: T; summary: string }>;
}): Promise<OperationResult<T>> => {
	if (params.destructive && !params.confirm) {
		const summary = params.confirmationSummary ?? "Confirmação necessária antes de prosseguir.";
		record(params.operation, params.input, "confirmation_required", summary);
		return { ok: false, requiresConfirmation: true, summary };
	}

	try {
		const { data, summary } = await params.run();
		record(params.operation, params.input, "success", summary);
		return { ok: true, data, summary };
	} catch (error) {
		const message = getApiErrorMessage(error, `Falha ao executar ${params.operation}`);
		record(params.operation, params.input, "failure", message);
		return { ok: false, error: message };
	}
};

export const listSquads = async (): Promise<OperationResult<SquadSummary[]>> =>
	execute({
		operation: "list_squads",
		input: {},
		run: async () => {
			const { data } = await api.get<SquadSummary[]>("/squads");
			return { data, summary: `${data.length} squad(s) encontrado(s).` };
		},
	});

export const getSquad = async (input: z.infer<typeof getSquadInputSchema>): Promise<OperationResult<SquadDetail>> => {
	const parsed = getSquadInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("get_squad", input, parsed.error);
	return execute({
		operation: "get_squad",
		input: parsed.data,
		run: async () => {
			const { data } = await api.get<SquadDetailResponseDto>(`/squads/${parsed.data.squadId}`);
			const squad = mapSquadDetailDto(data);
			return {
				data: squad,
				summary: `Squad "${squad.name}" carregado (${squad.agents.length} agent(s), ${squad.seats.length} cadeira(s)).`,
			};
		},
	});
};

export const createSquad = async (
	input: z.infer<typeof createSquadInputSchema>,
): Promise<OperationResult<SquadSummary>> => {
	const parsed = createSquadInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("create_squad", input, parsed.error);
	return execute({
		operation: "create_squad",
		input: parsed.data,
		run: async () => {
			const payload: CreateSquadPayload = parsed.data;
			const { data } = await api.post<SquadSummary>("/squads", payload);
			return { data, summary: `Squad "${data.name}" criado.` };
		},
	});
};

export const updateSquad = async (
	input: z.infer<typeof updateSquadInputSchema>,
): Promise<OperationResult<SquadDetail>> => {
	const parsed = updateSquadInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("update_squad", input, parsed.error);
	return execute({
		operation: "update_squad",
		input: parsed.data,
		run: async () => {
			const { squadId, patch } = parsed.data;
			await api.put(`/squads/${squadId}`, patch);
			const { data } = await api.get<SquadDetailResponseDto>(`/squads/${squadId}`);
			const squad = mapSquadDetailDto(data);
			return { data: squad, summary: `Squad "${squad.name}" atualizado.` };
		},
	});
};

export const deleteSquad = async (
	input: z.infer<typeof deleteSquadInputSchema>,
	opts: OperationCallOptions = {},
): Promise<OperationResult<{ squadId: string }>> => {
	const parsed = deleteSquadInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("delete_squad", input, parsed.error);
	return execute({
		operation: "delete_squad",
		input: parsed.data,
		destructive: true,
		confirm: opts.confirm,
		confirmationSummary: `Isso apaga o squad "${parsed.data.squadId}" e todo o histórico de runs. Chame de novo com confirm: true para prosseguir.`,
		run: async () => {
			await api.delete(`/squads/${parsed.data.squadId}`);
			return { data: { squadId: parsed.data.squadId }, summary: "Squad excluído." };
		},
	});
};

export const addAgent = async (input: z.infer<typeof addAgentInputSchema>): Promise<OperationResult<Agent>> => {
	const parsed = addAgentInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("add_agent", input, parsed.error);
	return execute({
		operation: "add_agent",
		input: parsed.data,
		run: async () => {
			const { squadId, agent } = parsed.data;
			const payload: AgentPayload = agent;
			const { data } = await api.post<AgentResponseDto>(`/squads/${squadId}/agents`, payload);
			const mapped = mapAgentDto(data);
			return { data: mapped, summary: `Agent "${mapped.name}" adicionado ao squad.` };
		},
	});
};

export const updateAgent = async (input: z.infer<typeof updateAgentInputSchema>): Promise<OperationResult<Agent>> => {
	const parsed = updateAgentInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("update_agent", input, parsed.error);
	return execute({
		operation: "update_agent",
		input: parsed.data,
		run: async () => {
			const { squadId, agentId, patch } = parsed.data;
			const { data } = await api.put<AgentResponseDto>(`/squads/${squadId}/agents/${agentId}`, patch);
			const agent = mapAgentDto(data);
			return { data: agent, summary: `Agent "${agent.name}" atualizado.` };
		},
	});
};

export const removeAgent = async (
	input: z.infer<typeof removeAgentInputSchema>,
	opts: OperationCallOptions = {},
): Promise<OperationResult<{ agentId: string }>> => {
	const parsed = removeAgentInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("remove_agent", input, parsed.error);
	return execute({
		operation: "remove_agent",
		input: parsed.data,
		destructive: true,
		confirm: opts.confirm,
		confirmationSummary: `Isso remove o agent "${parsed.data.agentId}" do squad e libera a cadeira. Chame de novo com confirm: true para prosseguir.`,
		run: async () => {
			await api.delete(`/squads/${parsed.data.squadId}/agents/${parsed.data.agentId}`);
			return { data: { agentId: parsed.data.agentId }, summary: "Agent removido do squad." };
		},
	});
};

export const addSeat = async (input: z.infer<typeof addSeatInputSchema>): Promise<OperationResult<Seat>> => {
	const parsed = addSeatInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("add_seat", input, parsed.error);
	return execute({
		operation: "add_seat",
		input: parsed.data,
		run: async () => {
			const { squadId, col, row, agentId } = parsed.data;
			const { data } = await api.post<SeatResponseDto>(`/squads/${squadId}/seats`, { col, row, agentId });
			const seat = mapSeatDto(data);
			return { data: seat, summary: `Cadeira criada em (${seat.col}, ${seat.row}).` };
		},
	});
};

export const assignSeat = async (input: z.infer<typeof assignSeatInputSchema>): Promise<OperationResult<Seat>> => {
	const parsed = assignSeatInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("assign_seat", input, parsed.error);
	return execute({
		operation: "assign_seat",
		input: parsed.data,
		run: async () => {
			const { squadId, seatId, agentId } = parsed.data;
			const { data } = await api.put<SeatResponseDto>(`/squads/${squadId}/seats/${seatId}`, {
				agentId,
				agentIdProvided: true,
			});
			const seat = mapSeatDto(data);
			return {
				data: seat,
				summary: agentId ? `Agent sentado na cadeira ${seatId}.` : `Cadeira ${seatId} esvaziada.`,
			};
		},
	});
};

export const removeSeat = async (
	input: z.infer<typeof removeSeatInputSchema>,
	opts: OperationCallOptions = {},
): Promise<OperationResult<{ seatId: string }>> => {
	const parsed = removeSeatInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("remove_seat", input, parsed.error);
	return execute({
		operation: "remove_seat",
		input: parsed.data,
		destructive: true,
		confirm: opts.confirm,
		confirmationSummary: `Isso remove a cadeira "${parsed.data.seatId}" do escritório. Chame de novo com confirm: true para prosseguir.`,
		run: async () => {
			await api.delete(`/squads/${parsed.data.squadId}/seats/${parsed.data.seatId}`);
			return { data: { seatId: parsed.data.seatId }, summary: "Cadeira removida." };
		},
	});
};

export const setOrchestrator = async (
	input: z.infer<typeof setOrchestratorInputSchema>,
): Promise<OperationResult<OrchestratorConfig>> => {
	const parsed = setOrchestratorInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("set_orchestrator", input, parsed.error);
	return execute({
		operation: "set_orchestrator",
		input: parsed.data,
		run: async () => {
			const { squadId, config } = parsed.data;
			await api.put(`/squads/${squadId}`, orchestratorConfigToPayload(config));
			return { data: config, summary: `Coordenador do squad atualizado (máx. ${config.maxSteps} passos).` };
		},
	});
};

export const attachTool = async (input: z.infer<typeof attachToolInputSchema>): Promise<OperationResult<Agent>> => {
	const parsed = attachToolInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("attach_tool", input, parsed.error);
	return execute({
		operation: "attach_tool",
		input: parsed.data,
		run: async () => {
			const { squadId, agentId, scriptId } = parsed.data;
			const { data: squadDto } = await api.get<SquadDetailResponseDto>(`/squads/${squadId}`);
			const agentDto = squadDto.agents.find((candidate) => candidate.id === agentId);
			if (!agentDto) throw new Error(`Agent "${agentId}" não encontrado no squad "${squadId}".`);
			const scriptIds = Array.from(new Set([...agentDto.scriptIds, scriptId]));
			const { data } = await api.put<AgentResponseDto>(`/squads/${squadId}/agents/${agentId}`, { scriptIds });
			const agent = mapAgentDto(data);
			return { data: agent, summary: `Ferramenta anexada ao agent "${agent.name}".` };
		},
	});
};

export const createSkill = async (
	input: z.infer<typeof createSkillInputSchema>,
): Promise<OperationResult<ExploreAssetResponse>> => {
	const parsed = createSkillInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("create_skill", input, parsed.error);
	return execute({
		operation: "create_skill",
		input: parsed.data,
		run: async () => {
			const { data } = await api.post<ExploreAssetResponse>("/explore/assets", {
				kind: "SKILL",
				title: parsed.data.title,
				description: parsed.data.description,
				tags: parsed.data.tags ?? ["skill"],
				visibility: parsed.data.visibility ?? "PRIVATE",
				payload: {
					format: "markdown",
					content: parsed.data.content,
					source: "assistant",
				},
			});
			return {
				data,
				summary: `Skill "${data.title}" criada como ${data.visibility === "PUBLIC" ? "pública" : "privada"}.`,
			};
		},
	});
};

export const listProviders = async (): Promise<OperationResult<ModelProvider[]>> =>
	execute({
		operation: "list_providers",
		input: {},
		run: async () => {
			const { data } = await api.get<ModelProvider[]>("/providers");
			return { data, summary: `${data.length} provider(s) encontrado(s).` };
		},
	});

export const listScripts = async (): Promise<OperationResult<Script[]>> =>
	execute({
		operation: "list_scripts",
		input: {},
		run: async () => {
			const { data } = await api.get<Script[]>("/scripts");
			return { data, summary: `${data.length} script(s) encontrado(s).` };
		},
	});

export const runSquad = async (
	input: z.infer<typeof runSquadInputSchema>,
): Promise<OperationResult<{ squadId: string }>> => {
	const parsed = runSquadInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("run_squad", input, parsed.error);
	return execute({
		operation: "run_squad",
		input: parsed.data,
		run: async () => {
			// Dispara o motor de execução ao vivo (renderer) — o run roda enquanto o app estiver aberto.
			startRun(parsed.data.squadId, parsed.data.briefing ?? "", "assistant");
			return { data: { squadId: parsed.data.squadId }, summary: "Execução iniciada. Acompanhe na aba Squad › Execução." };
		},
	});
};

export const listRuns = async (
	input: z.infer<typeof listRunsInputSchema>,
): Promise<OperationResult<RunRecord[]>> => {
	const parsed = listRunsInputSchema.safeParse(input);
	if (!parsed.success) return validationFailure("list_runs", input, parsed.error);
	return execute({
		operation: "list_runs",
		input: parsed.data,
		run: async () => {
			const { data } = await api.get<RunRecord[]>(`/squads/${parsed.data.squadId}/runs`);
			return { data, summary: `${data.length} execução(ões) encontrada(s).` };
		},
	});
};
