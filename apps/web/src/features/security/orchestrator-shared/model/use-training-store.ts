import { create } from "zustand";
import type { TrainingLesson, TrainingProposal } from "../types";

/** Reprovação sendo treinada — o suficiente para o sheet remontar tudo a partir dos caches. */
export type TrainingContext = {
	squadId: string;
	runId: string;
	rejectionId: string;
};

export type TrainingStatus = "idle" | "running" | "ready" | "error";

/** O que já foi aplicado nesta sessão de revisão — lição e prompt são independentes (RF10). */
export type TrainingApplied = {
	lessonDocumentId?: string;
	promptApplied?: boolean;
};

type TrainingState = {
	open: boolean;
	status: TrainingStatus;
	context: TrainingContext | null;
	proposal: TrainingProposal | null;
	/** Cópia editável da lição — o usuário revisa o texto antes de ele virar documento na base (RF9). */
	lessonDraft: TrainingLesson | null;
	error: string | null;
	/** Saída crua do modelo quando o parse falha — dá ao usuário o que houve em vez de um erro mudo. */
	rawOutput: string | null;
	/** Bloqueio do prompt pela guarda anti-inchaço; não impede aplicar a lição. */
	promptBlockedReason: string | null;
	applying: boolean;
	applied: TrainingApplied;
	start: (context: TrainingContext) => void;
	setProposal: (proposal: TrainingProposal) => void;
	setError: (error: string, rawOutput?: string) => void;
	setLessonDraft: (lesson: TrainingLesson) => void;
	setPromptBlockedReason: (reason: string | null) => void;
	setApplying: (applying: boolean) => void;
	markApplied: (patch: TrainingApplied) => void;
	close: () => void;
	reset: () => void;
};

const initial = {
	open: false,
	status: "idle" as TrainingStatus,
	context: null,
	proposal: null,
	lessonDraft: null,
	error: null,
	rawOutput: null,
	promptBlockedReason: null,
	applying: false,
	applied: {} as TrainingApplied,
};

/**
 * Store própria (não a do runtime do orquestrador): a revisão pode durar minutos e precisa sobreviver
 * ao fechamento do diálogo do run. A proposta em si não é persistida no backend (D2) — é regenerável.
 */
export const useTrainingStore = create<TrainingState>((set) => ({
	...initial,
	start: (context) => set({ ...initial, open: true, status: "running", context }),
	setProposal: (proposal) =>
		set({ status: "ready", proposal, lessonDraft: proposal.lesson ?? null, error: null, rawOutput: null }),
	setError: (error, rawOutput) => set({ status: "error", error, rawOutput: rawOutput ?? null }),
	setLessonDraft: (lessonDraft) => set({ lessonDraft }),
	setPromptBlockedReason: (promptBlockedReason) => set({ promptBlockedReason }),
	setApplying: (applying) => set({ applying }),
	markApplied: (patch) => set((state) => ({ applied: { ...state.applied, ...patch } })),
	close: () => set({ open: false }),
	reset: () => set(initial),
}));
