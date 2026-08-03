import type {
	ApprovalCheckpointKind,
	ApprovalItemDraft,
	ApprovalStatus,
} from "@/features/security/orchestrator-shared/types";

export type CreateApprovalPayload = {
	squadId: string;
	runId: string;
	seatId: string;
	agentId?: string | null;
	checkpointKind: ApprovalCheckpointKind;
	title: string;
	summary: string;
	/** Itens decidíveis (design D15) — omitido/vazio cria o pedido booleano de sempre. */
	items?: ApprovalItemDraft[];
};

export type DecideApprovalPayload = {
	approved: boolean;
	feedback?: string;
};

export type { ApprovalStatus };
