import { api } from "@/app/api/clients";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { notify } from "@/components";
import type { ModelProvider } from "@/features/security/orchestrator-shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { providersKeys } from "./keys";
import type { ProviderPayload } from "./types";

/** Exportado (além do hook) para o scheduler local poder popular o cache fora de um componente React. */
export const fetchProviders = async (): Promise<ModelProvider[]> => {
	const { data } = await api.get<ModelProvider[]>("/providers");
	return data;
};

const useInvalidateProviders = () => {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: providersKeys.list() });
};

export const useProvidersQuery = () => useQuery({ queryKey: providersKeys.list(), queryFn: fetchProviders });

export const useCreateProvider = () => {
	const invalidate = useInvalidateProviders();
	return useMutation({
		mutationFn: (payload: ProviderPayload) => api.post<ModelProvider>("/providers", payload).then((r) => r.data),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível criar o provider.")),
	});
};

export const useUpdateProvider = () => {
	const invalidate = useInvalidateProviders();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: Partial<ProviderPayload> }) =>
			api.put<ModelProvider>(`/providers/${id}`, payload).then((r) => r.data),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível atualizar o provider.")),
	});
};

export const useDeleteProvider = () => {
	const invalidate = useInvalidateProviders();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/providers/${id}`),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível excluir o provider.")),
	});
};
