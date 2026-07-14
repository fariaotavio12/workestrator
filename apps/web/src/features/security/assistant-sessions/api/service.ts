import { api } from "@/app/api/clients";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assistantSessionsKeys } from "./keys";
import type {
	AssistantSession,
	AssistantSessionSummary,
	CreateAssistantSessionPayload,
	UpdateAssistantSessionPayload,
} from "./types";

const fetchSessions = async (): Promise<AssistantSessionSummary[]> => {
	const { data } = await api.get<AssistantSessionSummary[]>("/assistant/sessions");
	return data;
};

const fetchSession = async (id: string): Promise<AssistantSession> => {
	const { data } = await api.get<AssistantSession>(`/assistant/sessions/${id}`);
	return data;
};

export const useAssistantSessionsQuery = () =>
	useQuery({ queryKey: assistantSessionsKeys.list(), queryFn: fetchSessions });

export const useAssistantSessionQuery = (id: string | undefined) =>
	useQuery({
		queryKey: assistantSessionsKeys.detail(id ?? ""),
		queryFn: () => fetchSession(id as string),
		enabled: Boolean(id),
	});

export const createAssistantSessionApi = async (
	payload: CreateAssistantSessionPayload,
): Promise<AssistantSession> => {
	const { data } = await api.post<AssistantSession>("/assistant/sessions", payload);
	return data;
};

export const updateAssistantSessionApi = async (
	id: string,
	payload: UpdateAssistantSessionPayload,
): Promise<AssistantSession> => {
	const { data } = await api.put<AssistantSession>(`/assistant/sessions/${id}`, payload);
	return data;
};

export const useCreateAssistantSession = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createAssistantSessionApi,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: assistantSessionsKeys.list() }),
	});
};

export const useUpdateAssistantSession = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: UpdateAssistantSessionPayload }) =>
			updateAssistantSessionApi(id, payload),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: assistantSessionsKeys.list() });
			queryClient.setQueryData(assistantSessionsKeys.detail(data.id), data);
		},
	});
};

export const useSetAssistantSessionGroup = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, groupId }: { id: string; groupId: string | null }) =>
			api.put<AssistantSession>(`/assistant/sessions/${id}/group`, { groupId }).then((r) => r.data),
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: assistantSessionsKeys.list() });
			queryClient.setQueryData(assistantSessionsKeys.detail(data.id), data);
		},
	});
};

export const useDeleteAssistantSession = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/assistant/sessions/${id}`),
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: assistantSessionsKeys.list() });
			queryClient.removeQueries({ queryKey: assistantSessionsKeys.detail(id) });
		},
	});
};
