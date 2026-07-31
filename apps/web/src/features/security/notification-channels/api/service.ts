import { api } from "@/app/api/clients";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { notify } from "@/components";
import type { NotificationChannel } from "@/features/security/orchestrator-shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationChannelsKeys } from "./keys";
import type { CreateNotificationChannelPayload, NotificationChannelTestResult, UpdateNotificationChannelPayload } from "./types";

export const fetchNotificationChannels = async (): Promise<NotificationChannel[]> => {
	const { data } = await api.get<NotificationChannel[]>("/notification-channels");
	return data;
};

export const useNotificationChannelsQuery = () =>
	useQuery({ queryKey: notificationChannelsKeys.list(), queryFn: fetchNotificationChannels });

const useInvalidateNotificationChannels = () => {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: notificationChannelsKeys.list() });
};

export const useCreateNotificationChannel = () => {
	const invalidate = useInvalidateNotificationChannels();
	return useMutation({
		mutationFn: (payload: CreateNotificationChannelPayload) =>
			api.post<NotificationChannel>("/notification-channels", payload).then((r) => r.data),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível criar a conexão.")),
	});
};

export const useUpdateNotificationChannel = () => {
	const invalidate = useInvalidateNotificationChannels();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: UpdateNotificationChannelPayload }) =>
			api.put<NotificationChannel>(`/notification-channels/${id}`, payload).then((r) => r.data),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível atualizar a conexão.")),
	});
};

export const useDeleteNotificationChannel = () => {
	const invalidate = useInvalidateNotificationChannels();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/notification-channels/${id}`),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível remover a conexão.")),
	});
};

export const useTestNotificationChannel = () => {
	const invalidate = useInvalidateNotificationChannels();
	return useMutation({
		mutationFn: (id: string) => api.post<NotificationChannelTestResult>(`/notification-channels/${id}/test`).then((r) => r.data),
		onSuccess: invalidate,
	});
};
