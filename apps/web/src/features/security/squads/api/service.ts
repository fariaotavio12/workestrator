import { api } from "@/app/api/clients";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { notify } from "@/components";
import { squadDetailKeys } from "@/features/security/squad-detail/api";
import {
	agentDraftToPayload,
	mapSquadDetailDto,
	orchestratorConfigToPayload,
	type AgentResponseDto,
	type SquadDetailResponseDto,
} from "@/features/security/squad-detail/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { squadsKeys } from "./keys";
import type { CreateSquadPayload, SquadSummary } from "./types";

/** Exportado (além do hook) para o scheduler local poder popular o cache fora de um componente React. */
export const fetchSquads = async (): Promise<SquadSummary[]> => {
	const { data } = await api.get<SquadSummary[]>("/squads");
	return data;
};

const createSquadApi = async (payload: CreateSquadPayload): Promise<SquadSummary> => {
	const { data } = await api.post<SquadSummary>("/squads", payload);
	return data;
};

const deleteSquadApi = async (id: string): Promise<void> => {
	await api.delete(`/squads/${id}`);
};

const duplicateSquadApi = async (source: SquadSummary): Promise<SquadSummary> => {
	const { data: detailDto } = await api.get<SquadDetailResponseDto>(`/squads/${source.id}`);
	const detail = mapSquadDetailDto(detailDto);

	const newSquad = await createSquadApi({
		name: `${detail.name} (cópia)`,
		description: detail.description,
		icon: detail.icon,
		trigger: detail.trigger,
		...orchestratorConfigToPayload(detail.orchestrator),
	});

	try {
		const agentIdMap = new Map<string, string>();
		for (const agent of detail.agents) {
			const { data: createdAgent } = await api.post<AgentResponseDto>(
				`/squads/${newSquad.id}/agents`,
				agentDraftToPayload(agent),
			);
			agentIdMap.set(agent.id, createdAgent.id);
		}

		for (const seat of detail.seats) {
			await api.post(`/squads/${newSquad.id}/seats`, {
				col: seat.col,
				row: seat.row,
				agentId: seat.agentId ? (agentIdMap.get(seat.agentId) ?? null) : null,
			});
		}
	} catch (error) {
		await deleteSquadApi(newSquad.id).catch(() => undefined);
		throw error;
	}

	return newSquad;
};

export const useSquadsQuery = () => useQuery({ queryKey: squadsKeys.list(), queryFn: fetchSquads });

export const useCreateSquad = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createSquadApi,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: squadsKeys.list() }),
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível criar o squad.")),
	});
};

export const useDeleteSquad = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteSquadApi,
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: squadsKeys.list() });
			queryClient.removeQueries({ queryKey: squadDetailKeys.detail(id) });
		},
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível excluir o squad.")),
	});
};

export const useDuplicateSquad = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: duplicateSquadApi,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: squadsKeys.list() }),
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível duplicar o squad.")),
	});
};
