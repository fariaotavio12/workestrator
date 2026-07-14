import { useMemo } from "react";
import {
	IDLE_RUNTIME,
	useOrchestratorRuntimeStore,
	useRunDialogStore,
} from "@/features/security/orchestrator-shared/model";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { useSquadQuery } from "@/features/security/squad-detail/api";
import { RunDialog } from "../run-dialog";

/**
 * Singleton montado no shell (`security/layout.tsx`) — o único `RunDialog` real da aplicação. Lê
 * `useRunDialogStore` para saber qual squad exibir, o que permite qualquer notificação (toast, OS)
 * disparada de qualquer tela abrir o dialog certo, em vez de cada página montar sua própria cópia.
 */
export const GlobalRunDialog = () => {
	const target = useRunDialogStore((s) => s.target);
	const closeRunDialog = useRunDialogStore((s) => s.closeRunDialog);
	const { data: squadDetail } = useSquadQuery(target?.squadId);
	const runtime = useOrchestratorRuntimeStore((s) =>
		target ? (s.runtimes[target.squadId] ?? IDLE_RUNTIME) : IDLE_RUNTIME,
	);

	const squad = useMemo<Squad | null>(
		() => (target && squadDetail ? { ...squadDetail, runtime } : null),
		[target, squadDetail, runtime],
	);

	if (!squad || !target) return null;

	return <RunDialog open onOpenChange={(open) => !open && closeRunDialog()} squad={squad} />;
};
