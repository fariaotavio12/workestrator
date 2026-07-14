import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SidebarView = "assistant" | "squad";

type SidebarViewState = {
	view: SidebarView;
	setView: (view: SidebarView) => void;
};

/** Aba ativa da sidebar (Assistente / Squad) — persistida pra manter a escolha entre recarregamentos. */
export const useSidebarViewStore = create<SidebarViewState>()(
	persist(
		(set) => ({
			view: "assistant",
			setView: (view) => set({ view }),
		}),
		{ name: "workestrator:sidebar-view" },
	),
);
