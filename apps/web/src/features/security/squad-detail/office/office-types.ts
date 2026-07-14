import type { AgentStatus, CharacterName } from "@/features/security/orchestrator-shared/types";

export type OfficeSeatView = {
	seatId: string;
	agent: {
		name: string;
		role: string;
		character: CharacterName;
		accentColor: string;
		model: string;
		/** Provider/modelo quebrado (ver `squad-readiness.ts`) — mostra aviso no card. */
		issue?: string;
	} | null;
	status: AgentStatus;
};

export type CoordinatorView = { model: string; maxSteps: number };
