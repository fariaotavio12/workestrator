import { z } from "zod";

const triggerSchema = z.union([
	z.object({ type: z.literal("manual") }),
	z.object({ type: z.literal("schedule"), every: z.enum(["5m", "1h", "daily"]), enabled: z.boolean() }),
	z.object({ type: z.literal("onComplete"), squadId: z.string().min(1) }),
]);

const modelRefSchema = z.object({
	providerId: z.string(),
	model: z.string(),
});

export const createSquadInputSchema = z.object({
	name: z.string().min(1, "Nome é obrigatório"),
	description: z.string().optional(),
	icon: z.string().optional(),
	trigger: triggerSchema.optional(),
	orchSystemPrompt: z.string().optional(),
	orchProviderId: z.string().nullable().optional(),
	orchModel: z.string().nullable().optional(),
	orchMaxSteps: z.number().int().positive().optional(),
});

export const getSquadInputSchema = z.object({
	squadId: z.string().min(1),
});

export const updateSquadInputSchema = z.object({
	squadId: z.string().min(1),
	patch: z.object({
		name: z.string().min(1).optional(),
		description: z.string().optional(),
		icon: z.string().optional(),
		trigger: triggerSchema.optional(),
		orchSystemPrompt: z.string().optional(),
		orchProviderId: z.string().nullable().optional(),
		orchModel: z.string().nullable().optional(),
		orchMaxSteps: z.number().int().positive().optional(),
	}),
});

export const deleteSquadInputSchema = z.object({
	squadId: z.string().min(1),
});

export const addAgentInputSchema = z.object({
	squadId: z.string().min(1),
	agent: z.object({
		name: z.string().min(1, "Nome é obrigatório"),
		role: z.string().optional(),
		systemPrompt: z.string().optional(),
		providerId: z.string().nullable().optional(),
		model: z.string().nullable().optional(),
		scriptIds: z.array(z.string()).optional(),
		canExecute: z.boolean().optional(),
		requiresCheckpoint: z.boolean().optional(),
		requiresCheckpointAfter: z.boolean().optional(),
		character: z.string().optional(),
		gender: z.string().optional(),
		accentColor: z.string().optional(),
	}),
});

export const updateAgentInputSchema = z.object({
	squadId: z.string().min(1),
	agentId: z.string().min(1),
	patch: z.object({
		name: z.string().min(1).optional(),
		role: z.string().optional(),
		systemPrompt: z.string().optional(),
		providerId: z.string().nullable().optional(),
		model: z.string().nullable().optional(),
		scriptIds: z.array(z.string()).optional(),
		canExecute: z.boolean().optional(),
		requiresCheckpoint: z.boolean().optional(),
		requiresCheckpointAfter: z.boolean().optional(),
		character: z.string().optional(),
		gender: z.string().optional(),
		accentColor: z.string().optional(),
	}),
});

export const removeAgentInputSchema = z.object({
	squadId: z.string().min(1),
	agentId: z.string().min(1),
});

export const addSeatInputSchema = z.object({
	squadId: z.string().min(1),
	col: z.number().int().nonnegative(),
	row: z.number().int().nonnegative(),
	agentId: z.string().nullable().optional(),
});

export const assignSeatInputSchema = z.object({
	squadId: z.string().min(1),
	seatId: z.string().min(1),
	agentId: z.string().nullable(),
});

export const removeSeatInputSchema = z.object({
	squadId: z.string().min(1),
	seatId: z.string().min(1),
});

export const setOrchestratorInputSchema = z.object({
	squadId: z.string().min(1),
	config: z.object({
		systemPrompt: z.string(),
		modelRef: modelRefSchema,
		maxSteps: z.number().int().positive(),
	}),
});

export const attachToolInputSchema = z.object({
	squadId: z.string().min(1),
	agentId: z.string().min(1),
	scriptId: z.string().min(1),
});

export const runSquadInputSchema = z.object({
	squadId: z.string().min(1),
	briefing: z.string().optional(),
});

export const listRunsInputSchema = z.object({
	squadId: z.string().min(1),
});
