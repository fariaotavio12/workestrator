import { api } from "@/app/api/clients";
import type { PageResultApiResponse } from "@/app/api/types";
import type { RunRecord } from "@/features/security/orchestrator-shared/types";
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { executionsKeys } from "./keys";
import type { RecentRunsParams, SaveRunPayload, UpdateRunPayload } from "./types";

export const fetchRecentRunsApi = async (params?: RecentRunsParams): Promise<PageResultApiResponse<RunRecord>> => {
	const { data } = await api.get<PageResultApiResponse<RunRecord>>("/runs", {
		params: {
			page: params?.page ?? 0,
			size: params?.size ?? 25,
		},
	});
	return data;
};

export const useRecentRunsQuery = (
	params?: RecentRunsParams,
	options?: Omit<UseQueryOptions<PageResultApiResponse<RunRecord>>, "queryKey" | "queryFn">,
) =>
	useQuery({
		queryKey: executionsKeys.recent(params),
		queryFn: () => fetchRecentRunsApi(params),
		...options,
	});

/** Exportado (além do hook) para o runtime buscar os runs anteriores fora de um componente React. */
export const fetchRunsApi = async (squadId: string): Promise<RunRecord[]> => {
	const { data } = await api.get<RunRecord[]>(`/squads/${squadId}/runs`);
	return data;
};

export const useRunsQuery = (squadId: string | undefined) =>
	useQuery({
		queryKey: executionsKeys.bySquad(squadId ?? ""),
		queryFn: () => fetchRunsApi(squadId as string),
		enabled: Boolean(squadId),
	});

/** Exportado (além do hook) para o runtime do orquestrador poder buscar um run fora de um componente React. */
export const getRunApi = async (squadId: string, runId: string): Promise<RunRecord> => {
	const { data } = await api.get<RunRecord>(`/squads/${squadId}/runs/${runId}`);
	return data;
};

export const saveRunApi = async (squadId: string, payload: SaveRunPayload): Promise<RunRecord> => {
	const { data } = await api.post<RunRecord>(`/squads/${squadId}/runs`, payload);
	return data;
};

export const useSaveRun = (squadId: string) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (payload: SaveRunPayload) => saveRunApi(squadId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: executionsKeys.bySquad(squadId) });
			queryClient.invalidateQueries({ queryKey: executionsKeys.all });
		},
	});
};

/**
 * Exportado (além do hook) para o runtime do orquestrador poder persistir progresso incrementalmente
 * (a cada passo/checkpoint/pause) fora de um componente React — mesmo padrão de `saveRunApi`.
 */
export const updateRunApi = async (squadId: string, runId: string, payload: UpdateRunPayload): Promise<RunRecord> => {
	const { data } = await api.put<RunRecord>(`/squads/${squadId}/runs/${runId}`, payload);
	return data;
};

export const useUpdateRun = (squadId: string) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ runId, payload }: { runId: string; payload: UpdateRunPayload }) =>
			updateRunApi(squadId, runId, payload),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: executionsKeys.bySquad(squadId) });
			queryClient.invalidateQueries({ queryKey: executionsKeys.all });
		},
	});
};
