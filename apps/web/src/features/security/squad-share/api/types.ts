export type SquadShare = {
	token: string;
	squadId: string;
	revoked: boolean;
	acceptCount: number;
	createdAt: string;
};

export type SharedAgentPreview = {
	name: string;
	role: string;
	character: string;
	gender: string;
	accentColor: string;
};

/** Preview público (sem autenticação) — nunca inclui prompts, scripts ou credenciais. */
export type SquadSharePreview = {
	name: string;
	description: string;
	icon: string;
	agentCount: number;
	scriptCount: number;
	agents: SharedAgentPreview[];
};

export type AcceptShareResult = {
	squadId: string;
};
