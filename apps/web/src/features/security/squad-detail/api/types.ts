import type { Agent, AgentAuthBinding, OrchestratorConfig, Seat, Squad, Trigger } from "@/features/security/orchestrator-shared/types";

/** Squad completo (`agents`+`seats`+`orchestrator`) sem `runtime`, que é sempre client-only. */
export type SquadDetail = Omit<Squad, "runtime">;

export type AgentResponseDto = {
	id: string;
	squadId: string;
	name: string;
	role: string;
	systemPrompt: string;
	providerId: string | null;
	model: string | null;
	scriptIds: string[];
	knowledgeCollectionIds: string[];
	authBindings: AgentAuthBinding[];
	canExecute: boolean;
	requiresCheckpoint: boolean;
	requiresCheckpointAfter: boolean;
	character: string;
	gender: string;
	accentColor: string;
	createdAt: string;
	updatedAt: string;
};

export type SeatResponseDto = {
	id: string;
	squadId: string;
	agentId: string | null;
	col: number;
	row: number;
};

export type SquadDetailResponseDto = {
	id: string;
	name: string;
	description: string;
	icon: string;
	trigger: Trigger;
	orchSystemPrompt: string;
	savedBriefing: string | null;
	orchProviderId: string | null;
	orchModel: string | null;
	orchMaxSteps: number;
	orchUseRunHistory?: boolean;
	agents: AgentResponseDto[];
	seats: SeatResponseDto[];
	createdAt: string;
	updatedAt: string;
};

export type UpdateSquadPayload = {
	name?: string;
	description?: string;
	icon?: string;
	trigger?: Trigger;
	orchSystemPrompt?: string;
	savedBriefing?: string | null;
	orchProviderId?: string | null;
	orchModel?: string | null;
	orchMaxSteps?: number;
	orchUseRunHistory?: boolean;
};

/** Achata `OrchestratorConfig` (nested) pros campos flat que o backend espera em `PUT /squads/{id}`. */
export const orchestratorConfigToPayload = (config: OrchestratorConfig): UpdateSquadPayload => ({
	orchSystemPrompt: config.systemPrompt,
	orchProviderId: config.modelRef.providerId || null,
	orchModel: config.modelRef.model || null,
	orchMaxSteps: config.maxSteps,
	orchUseRunHistory: config.useRunHistory ?? false,
});

export type AgentPayload = {
	name: string;
	role?: string;
	systemPrompt?: string;
	providerId?: string | null;
	model?: string | null;
	scriptIds?: string[];
	knowledgeCollectionIds?: string[];
	authBindings?: AgentAuthBinding[];
	canExecute?: boolean;
	requiresCheckpoint?: boolean;
	requiresCheckpointAfter?: boolean;
	character?: string;
	gender?: string;
	accentColor?: string;
};

/** Achata `Agent`/`AgentDraft` (modelRef nested) pros campos flat que o backend espera. */
export const agentDraftToPayload = (draft: {
	name: string;
	role: string;
	systemPrompt: string;
	modelRef: { providerId: string; model: string };
	scriptIds: string[];
	knowledgeCollectionIds?: string[];
	authBindings?: AgentAuthBinding[];
	canExecute: boolean;
	requiresCheckpoint: boolean;
	requiresCheckpointAfter: boolean;
	character: string;
	gender: string;
	accentColor: string;
}): AgentPayload => ({
	name: draft.name,
	role: draft.role,
	systemPrompt: draft.systemPrompt,
	providerId: draft.modelRef.providerId || null,
	model: draft.modelRef.model || null,
	scriptIds: draft.scriptIds,
	knowledgeCollectionIds: draft.knowledgeCollectionIds ?? [],
	authBindings: draft.authBindings ?? [],
	canExecute: draft.canExecute,
	requiresCheckpoint: draft.requiresCheckpoint,
	requiresCheckpointAfter: draft.requiresCheckpointAfter,
	character: draft.character,
	gender: draft.gender,
	accentColor: draft.accentColor,
});

export const mapAgentDto = (dto: AgentResponseDto): Agent => ({
	id: dto.id,
	name: dto.name,
	role: dto.role,
	systemPrompt: dto.systemPrompt,
	modelRef: { providerId: dto.providerId ?? "", model: dto.model ?? "" },
	scriptIds: dto.scriptIds,
	knowledgeCollectionIds: dto.knowledgeCollectionIds ?? [],
	authBindings: dto.authBindings ?? [],
	canExecute: dto.canExecute,
	requiresCheckpoint: dto.requiresCheckpoint,
	requiresCheckpointAfter: dto.requiresCheckpointAfter,
	character: dto.character as Agent["character"],
	gender: dto.gender as Agent["gender"],
	accentColor: dto.accentColor,
	createdAt: dto.createdAt,
	updatedAt: dto.updatedAt,
});

export const mapSeatDto = (dto: SeatResponseDto): Seat => ({
	id: dto.id,
	col: dto.col,
	row: dto.row,
	agentId: dto.agentId,
});

export const mapSquadDetailDto = (dto: SquadDetailResponseDto): SquadDetail => ({
	id: dto.id,
	name: dto.name,
	description: dto.description,
	icon: dto.icon,
	trigger: dto.trigger,
	savedBriefing: dto.savedBriefing,
	agents: dto.agents.map(mapAgentDto),
	seats: dto.seats.map(mapSeatDto),
	orchestrator: {
		systemPrompt: dto.orchSystemPrompt,
		modelRef: { providerId: dto.orchProviderId ?? "", model: dto.orchModel ?? "" },
		maxSteps: dto.orchMaxSteps,
		useRunHistory: dto.orchUseRunHistory ?? false,
	},
	createdAt: dto.createdAt,
	updatedAt: dto.updatedAt,
});
