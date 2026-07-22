import { useMemo } from "react";
import {
	IDLE_RUNTIME,
	useOrchestratorRuntimeStore,
	useSquadHistoryDialogStore,
} from "@/features/security/orchestrator-shared/model";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { useSquadQuery } from "@/features/security/squad-detail/api";
import { SquadHistoryDialog } from "../squad-history-dialog";

/**
 * Singleton montado no shell (igual ao `GlobalRunDialog`) — lê `useSquadHistoryDialogStore` para
 * saber qual squad exibir, permitindo abrir o histórico de qualquer tela (Execuções, sidebar,
 * squad-detail) sem cada uma montar sua própria cópia do dialog.
 */
export const GlobalSquadHistoryDialog = () => {
	const target = useSquadHistoryDialogStore((s) => s.target);
	const closeHistoryDialog = useSquadHistoryDialogStore((s) => s.closeHistoryDialog);
	const { data: squadDetail } = useSquadQuery(target?.squadId);
	const runtime = useOrchestratorRuntimeStore((s) =>
		target
			? (s.runtimes[s.selectedRunIdBySquad[target.squadId] ?? ""] ?? IDLE_RUNTIME)
			: IDLE_RUNTIME,
	);

	const squad = useMemo<Squad | null>(
		() => (target && squadDetail ? { ...squadDetail, runtime } : null),
		[target, squadDetail, runtime],
	);

	if (!squad || !target) return null;

	return (
		<SquadHistoryDialog
			open
			onOpenChange={(open) => !open && closeHistoryDialog()}
			squad={squad}
			initialRunId={target.initialRunId}
		/>
	);
};
