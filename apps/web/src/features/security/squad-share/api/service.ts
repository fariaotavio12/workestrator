import { api } from "@/app/api/clients";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { notify } from "@/components";
import { squadsKeys } from "@/features/security/squads/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { squadShareKeys } from "./keys";
import type { AcceptShareResult, SquadShare, SquadSharePreview } from "./types";

const createShareApi = async (squadId: string): Promise<SquadShare> => {
	const { data } = await api.post<SquadShare>(`/squads/${squadId}/share`);
	return data;
};

const revokeShareApi = async ({ squadId, token }: { squadId: string; token: string }): Promise<void> => {
	await api.delete(`/squads/${squadId}/share/${token}`);
};

const fetchSharePreview = async (token: string): Promise<SquadSharePreview> => {
	const { data } = await api.get<SquadSharePreview>(`/shares/${token}`);
	return data;
};

const acceptShareApi = async (token: string): Promise<AcceptShareResult> => {
	const { data } = await api.post<AcceptShareResult>(`/shares/${token}/accept`);
	return data;
};

export const useCreateSquadShare = () =>
	useMutation({
		mutationFn: createShareApi,
		onError: (error) =>
			notify.error(getApiErrorMessage(error, "Não foi possível criar o link de compartilhamento.")),
	});

export const useRevokeSquadShare = () =>
	useMutation({
		mutationFn: revokeShareApi,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível revogar o link.")),
	});

/** `retry: false` — token revogado/inexistente não deve ser retentado, é um estado terminal. */
export const useSquadSharePreview = (token: string | undefined) =>
	useQuery({
		queryKey: squadShareKeys.preview(token ?? ""),
		queryFn: () => fetchSharePreview(token as string),
		enabled: Boolean(token),
		retry: false,
	});

export const useAcceptSquadShare = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: acceptShareApi,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: squadsKeys.list() }),
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível importar o squad.")),
	});
};
