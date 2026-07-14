import { api } from "@/app/api/clients";
import { assistantSessionsKeys } from "@/features/security/assistant-sessions/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assistantSessionGroupsKeys } from "./keys";
import type {
	AssistantSessionGroup,
	CreateAssistantSessionGroupPayload,
	UpdateAssistantSessionGroupPayload,
} from "./types";

const fetchGroups = async (): Promise<AssistantSessionGroup[]> => {
	const { data } = await api.get<AssistantSessionGroup[]>("/assistant/session-groups");
	return data;
};

export const useAssistantSessionGroupsQuery = () =>
	useQuery({ queryKey: assistantSessionGroupsKeys.list(), queryFn: fetchGroups });

export const useCreateAssistantSessionGroup = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (payload: CreateAssistantSessionGroupPayload) =>
			api.post<AssistantSessionGroup>("/assistant/session-groups", payload).then((r) => r.data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: assistantSessionGroupsKeys.list() }),
	});
};

export const useUpdateAssistantSessionGroup = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: UpdateAssistantSessionGroupPayload }) =>
			api.put<AssistantSessionGroup>(`/assistant/session-groups/${id}`, payload).then((r) => r.data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: assistantSessionGroupsKeys.list() }),
	});
};

export const useDeleteAssistantSessionGroup = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/assistant/session-groups/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: assistantSessionGroupsKeys.list() });
			// Excluir grupo desassocia sessões no backend — recarrega a lista de sessões.
			queryClient.invalidateQueries({ queryKey: assistantSessionsKeys.list() });
		},
	});
};
