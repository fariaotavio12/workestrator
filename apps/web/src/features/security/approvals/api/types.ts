import type { ApprovalCheckpointKind, ApprovalStatus } from "@/features/security/orchestrator-shared/types";

export type CreateApprovalPayload = {
	squadId: string;
	runId: string;
	seatId: string;
	agentId?: string | null;
	checkpointKind: ApprovalCheckpointKind;
	title: string;
	summary: string;
};

export type DecideApprovalPayload = {
	approved: boolean;
	feedback?: string;
};

export type { ApprovalStatus };
