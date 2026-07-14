import type { RunRecord } from "@/features/security/orchestrator-shared/types";

/** Squad já rodando algo — "Continuar"/"Refazer último passo" ficam escondidos pra não colidir com o run ativo. */
export const BUSY_STATUSES = new Set(["running", "checkpoint", "awaiting_input", "paused"]);

export const runStatusVariant: Record<RunRecord["status"], "secondary" | "default" | "success" | "destructive"> = {
	running: "default",
	done: "success",
	failed: "destructive",
	aborted: "destructive",
};

export const runStatusLabel: Record<RunRecord["status"], string> = {
	running: "Rodando",
	done: "Concluído",
	failed: "Falhou",
	aborted: "Abortado",
};

export const formatRunDuration = (startedAt: string, endedAt: string | null): string => {
	const end = endedAt ? new Date(endedAt).getTime() : Date.now();
	const seconds = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
	if (seconds < 60) return `${seconds}s`;
	return `${Math.floor(seconds / 60)}min ${seconds % 60}s`;
};

/** Tamanho de arquivo legível — usado na lista de arquivos gerados. */
export const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
