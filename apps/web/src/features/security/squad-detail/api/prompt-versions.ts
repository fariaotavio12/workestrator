import { api } from "@/app/api/clients";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { notify } from "@/components";
import type { AgentPromptVersion } from "@/features/security/orchestrator-shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { squadDetailKeys } from "./keys";

export const promptVersionKeys = {
	all: ["agent-prompt-versions"] as const,
	byAgent: (squadId: string, agentId: string) => [...promptVersionKeys.all, squadId, agentId] as const,
};

export const fetchPromptVersions = async (squadId: string, agentId: string): Promise<AgentPromptVersion[]> => {
	const { data } = await api.get<AgentPromptVersion[]>(`/squads/${squadId}/agents/${agentId}/prompt-versions`);
	return data;
};

export const usePromptVersionsQuery = (squadId: string, agentId: string | undefined) =>
	useQuery({
		queryKey: promptVersionKeys.byAgent(squadId, agentId ?? ""),
		queryFn: () => fetchPromptVersions(squadId, agentId as string),
		enabled: Boolean(squadId && agentId),
	});

/** Reverter cria uma versão nova com o texto atual — voltar atrás é auditável e reversível também. */
export const useRevertPromptVersion = (squadId: string, agentId: string) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (versionId: string) =>
			api.post(`/squads/${squadId}/agents/${agentId}/prompt-versions/${versionId}/revert`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: promptVersionKeys.byAgent(squadId, agentId) });
			queryClient.invalidateQueries({ queryKey: squadDetailKeys.detail(squadId) });
		},
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível reverter o prompt.")),
	});
};
