// Poll incondicional de um `ApprovalRequest` pendente (design D7, .specs/001-aprovacoes-externas-teams).
// Existe porque a decisão pode vir de uma sessão alheia à que está rodando o run — um aprovador delegado
// decidindo pela própria conta, ou o próprio dono decidindo de outro dispositivo/aba. Sem isso, o cliente
// que está de fato executando o squad nunca saberia que o checkpoint foi resolvido em outro lugar.
// Um watcher por pedido pendente; para sozinho no primeiro estado terminal (aprovado/rejeitado/cancelado).
import { getApprovalApi } from "@/features/security/approvals/api";
import type { ApprovalRequest } from "../types";

const POLL_INTERVAL_MS = 10_000;

type Watcher = { timer: ReturnType<typeof setTimeout>; controller: AbortController };

const activeWatchers = new Map<string, Watcher>();

/** Inicia (ou é no-op se já existir) o poll de um pedido pendente. `onSettled` dispara uma única vez. */
export const startApprovalWatch = (approvalId: string, onSettled: (approval: ApprovalRequest) => void): void => {
	if (activeWatchers.has(approvalId)) return;
	const controller = new AbortController();

	const tick = async (): Promise<void> => {
		if (controller.signal.aborted) return;
		try {
			const approval = await getApprovalApi(approvalId);
			if (controller.signal.aborted) return;
			if (approval.status !== "pending") {
				stopApprovalWatch(approvalId);
				onSettled(approval);
				return;
			}
		} catch {
			// Erro de rede — mantém tentando no próximo tick, sem backoff extra (o intervalo já é de 10s).
		}
		if (!controller.signal.aborted) {
			activeWatchers.set(approvalId, { timer: setTimeout(tick, POLL_INTERVAL_MS), controller });
		}
	};

	activeWatchers.set(approvalId, { timer: setTimeout(tick, POLL_INTERVAL_MS), controller });
};

export const stopApprovalWatch = (approvalId: string): void => {
	const watcher = activeWatchers.get(approvalId);
	if (!watcher) return;
	clearTimeout(watcher.timer);
	watcher.controller.abort();
	activeWatchers.delete(approvalId);
};

/** Só para testes — número de watchers ativos neste módulo. */
export const activeApprovalWatchCount = (): number => activeWatchers.size;
