import type { ApiRequestParams } from "@/app/api/types";
import type { RunRecord } from "@/features/security/orchestrator-shared/types";

export type RecentRunsParams = ApiRequestParams<RunRecord>;

export type SaveRunPayload = Omit<RunRecord, "id" | "squadId">;

/** Patch parcial — só os campos que mudam a cada persistência incremental (passo/checkpoint/pause). */
export type UpdateRunPayload = Partial<
	Pick<RunRecord, "status" | "endedAt" | "steps" | "qaLog" | "runtimeSnapshot" | "authBindingsSnapshot" | "files">
>;
