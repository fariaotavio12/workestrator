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
	getRuntime: (squadId: string) => Runtime;
	setRuntime: (squadId: string, runtime: Runtime) => void;
	patchRuntime: (squadId: string, patch: (runtime: Runtime) => Runtime) => void;
};

/**
 * Hook (para componentes) e também acessível fora do React via `.getState()`/`.setState()` — usado
 * pelo runner (`runtime/orchestrator-runtime.ts`), que roda destacado do ciclo de vida de componentes.
 */
export const useOrchestratorRuntimeStore = create<RuntimeStoreState>((set, get) => ({
	runtimes: {},
	getRuntime: (squadId) => get().runtimes[squadId] ?? IDLE_RUNTIME,
	setRuntime: (squadId, runtime) => set((state) => ({ runtimes: { ...state.runtimes, [squadId]: runtime } })),
	patchRuntime: (squadId, patch) =>
		set((state) => ({
			runtimes: { ...state.runtimes, [squadId]: patch(state.runtimes[squadId] ?? IDLE_RUNTIME) },
		})),
}));
