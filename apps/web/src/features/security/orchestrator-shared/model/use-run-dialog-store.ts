import { create } from "zustand";

export type RunDialogTarget = {
	squadId: string;
};

type RunDialogStoreState = {
	target: RunDialogTarget | null;
	openRunDialog: (squadId: string) => void;
	closeRunDialog: () => void;
};

/**
 * UI state de qual squad tem o `RunDialog` aberto — global (não por página), pra que uma notificação
 * (toast ou OS) disparada de qualquer lugar consiga abrir o dialog certo. O `RunDialog` em si é
 * montado uma única vez no shell (`GlobalRunDialog`, em `security/layout.tsx`), lendo este store.
 */
export const useRunDialogStore = create<RunDialogStoreState>((set) => ({
	target: null,
	openRunDialog: (squadId) => set({ target: { squadId } }),
	closeRunDialog: () => set({ target: null }),
}));
