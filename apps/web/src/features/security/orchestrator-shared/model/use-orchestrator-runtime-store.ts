import { create } from "zustand";
import type { Runtime } from "../types";

/**
 * Estado de execução ao vivo, por squad — nunca é persistido no servidor (ver contrato do backend:
 * "runtime nunca é salvo"). Fica isolado num store próprio para não misturar client state com o
 * server state (squads/providers/scripts/runs), que vive no TanStack Query — ver `use-orchestrator.ts`.
 */
export const idleRuntime = (): Runtime => ({
	status: "idle",
	currentStep: 0,
	perAgentStatus: {},
	log: [],
	events: [],
	pendingSeatId: null,
	pendingCheckpointKind: null,
	streamingText: null,
	pendingQuestion: null,
	pendingQaHistory: [],
	liveActivity: [],
	toolLog: [],
	liveTerminal: "",
	coordinatorThinking: false,
	stepStartedAt: null,
});

/**
 * Referência estável pra usar como fallback dentro de seletores do Zustand (`useOrchestratorRuntimeStore(s => ...)`).
 * `idleRuntime()` cria um objeto novo a cada chamada — usá-la direto num seletor faz o `useSyncExternalStore`
 * achar que o snapshot mudou em todo render, causando loop infinito ("Maximum update depth exceeded").
 */
export const IDLE_RUNTIME: Runtime = idleRuntime();

type RuntimeStoreState = {
	runtimes: Record<string, Runtime>;
	runIdsBySquad: Record<string, string[]>;
	selectedRunIdBySquad: Record<string, string>;
	getRuntime: (runId: string) => Runtime;
	setRuntime: (runId: string, runtime: Runtime) => void;
	patchRuntime: (runId: string, patch: (runtime: Runtime) => Runtime) => void;
	registerRun: (squadId: string, runId: string) => void;
	selectRun: (squadId: string, runId: string) => void;
};

/**
 * Hook (para componentes) e também acessível fora do React via `.getState()`/`.setState()` — usado
 * pelo runner (`runtime/orchestrator-runtime.ts`), que roda destacado do ciclo de vida de componentes.
 */
export const useOrchestratorRuntimeStore = create<RuntimeStoreState>((set, get) => ({
	runtimes: {},
	runIdsBySquad: {},
	selectedRunIdBySquad: {},
	getRuntime: (runIdOrSquadId) => {
		const state = get();
		return state.runtimes[runIdOrSquadId]
			?? state.runtimes[state.selectedRunIdBySquad[runIdOrSquadId] ?? ""]
			?? IDLE_RUNTIME;
	},
	setRuntime: (runId, runtime) => set((state) => ({ runtimes: { ...state.runtimes, [runId]: runtime } })),
	patchRuntime: (runId, patch) =>
		set((state) => ({
			runtimes: { ...state.runtimes, [runId]: patch(state.runtimes[runId] ?? IDLE_RUNTIME) },
		})),
	registerRun: (squadId, runId) =>
		set((state) => ({
			runIdsBySquad: {
				...state.runIdsBySquad,
				[squadId]: [runId, ...(state.runIdsBySquad[squadId] ?? []).filter((id) => id !== runId)],
			},
			selectedRunIdBySquad: { ...state.selectedRunIdBySquad, [squadId]: runId },
		})),
	selectRun: (squadId, runId) =>
		set((state) => ({ selectedRunIdBySquad: { ...state.selectedRunIdBySquad, [squadId]: runId } })),
}));
