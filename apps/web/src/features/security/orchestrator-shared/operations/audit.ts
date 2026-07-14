import { create } from "zustand";
import type { AuditEntry } from "./types";

const MAX_ENTRIES = 100;

type OperationsAuditState = {
	entries: AuditEntry[];
	record: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;
	clear: () => void;
};

/**
 * Histórico das operações de config disparadas via `operations.ts` — base pro usuário revisar/desfazer
 * o que um agente (in-app ou MCP externo) fez em seu nome. Ver Etapa 5 do plano.
 */
export const useOperationsAuditStore = create<OperationsAuditState>((set) => ({
	entries: [],
	record: (entry) =>
		set((state) => ({
			entries: [{ ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() }, ...state.entries].slice(
				0,
				MAX_ENTRIES,
			),
		})),
	clear: () => set({ entries: [] }),
}));
