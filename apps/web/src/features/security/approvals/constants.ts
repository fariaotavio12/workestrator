import type { ApprovalStatus } from "@/features/security/orchestrator-shared/types";

export const approvalStatusLabel: Record<ApprovalStatus, string> = {
	pending: "Aguardando decisão",
	approved: "Aprovado",
	rejected: "Reprovado",
	canceled: "Cancelado",
};

export const approvalStatusVariant: Record<ApprovalStatus, "secondary" | "default" | "success" | "destructive"> = {
	pending: "default",
	approved: "success",
	rejected: "destructive",
	canceled: "secondary",
};
