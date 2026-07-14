import type { Trigger } from "@/features/security/orchestrator-shared/types";

/** Squad sem `agents`/`seats`/`orchestrator` — o que `GET /squads` devolve para a lista. */
export type SquadSummary = {
	id: string;
	name: string;
	description: string;
	icon: string;
	trigger: Trigger;
	createdAt: string;
	updatedAt: string;
};

export type CreateSquadPayload = {
	name: string;
	description?: string;
	icon?: string;
	trigger?: Trigger;
	orchSystemPrompt?: string;
	orchProviderId?: string | null;
	orchModel?: string | null;
	orchMaxSteps?: number;
};
