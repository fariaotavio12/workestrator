import { create } from "zustand";

export type SquadHistoryDialogTarget = {
	squadId: string;
	/** Run específico a expandir de cara — usado pelo deep-link de Execuções. */
	initialRunId?: string;
};

type SquadHistoryDialogStoreState = {
	target: SquadHistoryDialogTarget | null;
	openHistoryDialog: (squadId: string, opts?: Omit<SquadHistoryDialogTarget, "squadId">) => void;
	closeHistoryDialog: () => void;
};

/**
 * Mesma ideia do `use-run-dialog-store.ts`: estado global de qual squad tem o histórico aberto,
 * pra permitir abrir de qualquer lugar (Execuções, sidebar, squad-detail). O `SquadHistoryDialog`
 * é montado uma única vez no shell (`GlobalSquadHistoryDialog`, em `security/layout.tsx`).
 */
export const useSquadHistoryDialogStore = create<SquadHistoryDialogStoreState>((set) => ({
	target: null,
	openHistoryDialog: (squadId, opts) => set({ target: { squadId, ...opts } }),
	closeHistoryDialog: () => set({ target: null }),
}));
