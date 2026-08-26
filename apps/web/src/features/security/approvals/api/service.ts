import { api } from "@/app/api/clients";
import type { ApprovalRequest, ApprovalStatus } from "@/features/security/orchestrator-shared/types";
import { useQuery } from "@tanstack/react-query";
import { approvalsKeys } from "./keys";
import type { ApprovalRunView, CreateApprovalPayload, DecideApprovalPayload } from "./types";

// Funções exportadas fora de hook (além dos hooks abaixo) — o runtime do orquestrador cria/consulta/decide
// aprovações fora de um componente React, mesmo padrão de `executions/api/service.ts`.

export const createApprovalApi = async (payload: CreateApprovalPayload): Promise<ApprovalRequest> => {
	const { data } = await api.post<ApprovalRequest>("/approvals", payload);
	return data;
};

export const getApprovalApi = async (id: string): Promise<ApprovalRequest> => {
	const { data } = await api.get<ApprovalRequest>(`/approvals/${id}`);
	return data;
};

/**
 * A primeira decisão vence (design D10) — uma segunda tentativa devolve **409 com o corpo da decisão
 * original**, não um erro genérico. Por isso esta função não engole o erro num toast: quem chama decide
 * como tratar `error.response.status === 409` (`extractApprovalFromError` ajuda a ler o corpo).
 */
export const decideApprovalApi = async (id: string, payload: DecideApprovalPayload): Promise<ApprovalRequest> => {
	const { data } = await api.post<ApprovalRequest>(`/approvals/${id}/decide`, payload);
	return data;
};

/**
 * Decide **um item** de um pedido com granularidade por item (design D15). Mesma semântica de 409 do
 * `decideApprovalApi`, aplicada ao item: quem chegou depois recebe o pedido com aquele item já resolvido.
 */
export const decideApprovalItemApi = async (
	id: string,
	itemId: string,
	payload: DecideApprovalPayload,
): Promise<ApprovalRequest> => {
	const { data } = await api.post<ApprovalRequest>(`/approvals/${id}/items/${itemId}/decide`, payload);
	return data;
};

/** Lê o `ApprovalRequest` do corpo de um 409 de `decideApprovalApi` — `undefined` para qualquer outro erro. */
export const extractApprovalFromConflict = (error: unknown): ApprovalRequest | undefined => {
	const response = (error as { response?: { status?: number; data?: ApprovalRequest } })?.response;
	return response?.status === 409 ? response.data : undefined;
};

export const cancelApprovalApi = async (id: string): Promise<ApprovalRequest> => {
	const { data } = await api.post<ApprovalRequest>(`/approvals/${id}/cancel`);
	return data;
};

export const renotifyApprovalApi = async (id: string): Promise<ApprovalRequest> => {
	const { data } = await api.post<ApprovalRequest>(`/approvals/${id}/renotify`);
	return data;
};

export const listApprovalsByRunApi = async (runId: string): Promise<ApprovalRequest[]> => {
	const { data } = await api.get<ApprovalRequest[]>("/approvals", { params: { runId } });
	return data;
};

/**
 * A execução por trás do pedido — autorizada pelo próprio pedido, não pelo squad. É o que deixa o
 * aprovador acompanhar o run que ele aprovou em vez de decidir às cegas sobre um resumo.
 */
export const getApprovalRunApi = async (id: string): Promise<ApprovalRunView> => {
	const { data } = await api.get<ApprovalRunView>(`/approvals/${id}/run`);
	return data;
};

export const listAssignedToMeApi = async (status?: ApprovalStatus): Promise<ApprovalRequest[]> => {
	const { data } = await api.get<ApprovalRequest[]>("/approvals/assigned-to-me", {
		params: status ? { status } : undefined,
	});
	return data;
};

export const useApprovalQuery = (id: string | undefined) =>
	useQuery({
		queryKey: approvalsKeys.detail(id ?? ""),
		queryFn: () => getApprovalApi(id as string),
		enabled: Boolean(id),
	});

/** Enquanto o run está de pé, repete no mesmo ritmo do `approval-watcher` do dono — 10s. */
const RUN_POLL_INTERVAL_MS = 10_000;

export const useApprovalRunQuery = (approvalId: string | undefined) =>
	useQuery({
		queryKey: approvalsKeys.run(approvalId ?? ""),
		queryFn: () => getApprovalRunApi(approvalId as string),
		enabled: Boolean(approvalId),
		refetchInterval: (query) => (query.state.data?.status === "running" ? RUN_POLL_INTERVAL_MS : false),
		// Um run só existe depois que o dono persiste o primeiro PUT; um 404 aqui é corrida, não erro do link.
		retry: 1,
	});

export const useApprovalsByRunQuery = (runId: string | undefined) =>
	useQuery({
		queryKey: approvalsKeys.byRun(runId ?? ""),
		queryFn: () => listApprovalsByRunApi(runId as string),
		enabled: Boolean(runId),
	});

export const useAssignedToMeQuery = (status?: ApprovalStatus) =>
	useQuery({
		queryKey: approvalsKeys.assignedToMe(status),
		queryFn: () => listAssignedToMeApi(status),
	});
