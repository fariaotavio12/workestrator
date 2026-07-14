import { useEffect } from "react";
import { startScheduler, stopScheduler } from "@/features/security/orchestrator-shared/runtime/scheduler";

/**
 * Singleton montado no shell (`security/layout.tsx`) — liga o scheduler local (squads com
 * `trigger: { type: "schedule", enabled: true }`) enquanto o app estiver aberto. Não renderiza nada.
 */
export const OrchestratorScheduler = () => {
	useEffect(() => {
		startScheduler();
		return () => stopScheduler();
	}, []);

	return null;
};
