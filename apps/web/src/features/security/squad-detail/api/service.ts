import { api } from "@/app/api/clients";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { notify } from "@/components";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { squadDetailKeys } from "./keys";
import type { AgentPayload, SquadDetail, SquadDetailResponseDto, UpdateSquadPayload } from "./types";
import { mapSquadDetailDto } from "./types";

/** Exportado (além do hook) para o scheduler local poder popular o cache fora de um componente React. */
export const fetchSquadDetail = async (squadId: string): Promise<SquadDetail> => {
	const { data } = await api.get<SquadDetailResponseDto>(`/squads/${squadId}`);
	return mapSquadDetailDto(data);
};

const useInvalidateSquadDetail = (squadId: string) => {
	const queryClient = useQueryClient();
	return () => {
		queryClient.invalidateQueries({ queryKey: squadDetailKeys.detail(squadId) });
		queryClient.invalidateQueries({ queryKey: ["squads", "list"] });
	};
};

export const useSquadQuery = (squadId: string | undefined) =>
	useQuery({
		queryKey: squadDetailKeys.detail(squadId ?? ""),
		queryFn: () => fetchSquadDetail(squadId as string),
		enabled: Boolean(squadId),
	});

export const useUpdateSquad = (squadId: string) => {
	const invalidate = useInvalidateSquadDetail(squadId);
	return useMutation({
		mutationFn: (payload: UpdateSquadPayload) => api.put(`/squads/${squadId}`, payload),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível atualizar o squad.")),
	});
};

export const useAddAgent = (squadId: string) => {
	const invalidate = useInvalidateSquadDetail(squadId);
	return useMutation({
		mutationFn: (payload: AgentPayload) => api.post(`/squads/${squadId}/agents`, payload),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível criar o agent.")),
	});
};

export const useUpdateAgent = (squadId: string) => {
	const invalidate = useInvalidateSquadDetail(squadId);
	return useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: Partial<AgentPayload> }) =>
			api.put(`/squads/${squadId}/agents/${id}`, payload),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível atualizar o agent.")),
	});
};

export const useDeleteAgent = (squadId: string) => {
	const invalidate = useInvalidateSquadDetail(squadId);
	return useMutation({
		mutationFn: (id: string) => api.delete(`/squads/${squadId}/agents/${id}`),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível excluir o agent.")),
	});
};

export const useAddSeat = (squadId: string) => {
	const invalidate = useInvalidateSquadDetail(squadId);
	return useMutation({
		mutationFn: (payload: { col: number; row: number; agentId?: string | null }) =>
			api.post(`/squads/${squadId}/seats`, payload),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível adicionar a cadeira.")),
	});
};

export const useAssignSeat = (squadId: string) => {
	const invalidate = useInvalidateSquadDetail(squadId);
	return useMutation({
		mutationFn: ({ seatId, agentId }: { seatId: string; agentId: string | null }) =>
			api.put(`/squads/${squadId}/seats/${seatId}`, { agentId, agentIdProvided: true }),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível atualizar a cadeira.")),
	});
};

export const useRemoveSeat = (squadId: string) => {
	const invalidate = useInvalidateSquadDetail(squadId);
	return useMutation({
		mutationFn: (seatId: string) => api.delete(`/squads/${squadId}/seats/${seatId}`),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível remover a cadeira.")),
	});
};
