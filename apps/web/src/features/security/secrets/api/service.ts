import { api } from "@/app/api/clients";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { notify } from "@/components";
import type { Secret } from "@/features/security/orchestrator-shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { connectorsKeys, secretsKeys } from "./keys";
import type { ConnectorResponse, CreateSecretPayload, UpdateSecretPayload, UpdateSecretValuePayload } from "./types";

const fetchSecrets = async (): Promise<Secret[]> => {
	const { data } = await api.get<Secret[]>("/secrets");
	return data;
};

const useInvalidateSecrets = () => {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: secretsKeys.list() });
};

export const useSecretsQuery = () => useQuery({ queryKey: secretsKeys.list(), queryFn: fetchSecrets });

export const useCreateSecret = () => {
	const invalidate = useInvalidateSecrets();
	return useMutation({
		mutationFn: (payload: CreateSecretPayload) => api.post<Secret>("/secrets", payload).then((r) => r.data),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível criar a conexão.")),
	});
};

export const useUpdateSecret = () => {
	const invalidate = useInvalidateSecrets();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: UpdateSecretPayload }) =>
			api.put<Secret>(`/secrets/${id}`, payload).then((r) => r.data),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível atualizar a conexão.")),
	});
};

export const useUpdateSecretValue = () => {
	const invalidate = useInvalidateSecrets();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: UpdateSecretValuePayload }) =>
			api.put<Secret>(`/secrets/${id}/value`, payload).then((r) => r.data),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível atualizar o valor.")),
	});
};

export const useDeleteSecret = () => {
	const invalidate = useInvalidateSecrets();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/secrets/${id}`),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível excluir a conexão.")),
	});
};

const fetchConnectorsCatalog = async (): Promise<ConnectorResponse[]> => {
	const { data } = await api.get<ConnectorResponse[]>("/connectors");
	return data;
};

/**
 * Catálogo de conectores servido pelo backend (`OAuthProviderCatalog`) — dado quase estático, então
 * `staleTime` alto. `retry: false` de propósito: se o backend for uma versão antiga sem este endpoint
 * (404) ou estiver fora do ar, o consumidor (`ConnectorsCatalogSheet`) deve cair no array estático
 * (`CONNECTOR_CATALOG`) rápido, não ficar tentando de novo.
 */
export const useConnectorsCatalogQuery = () =>
	useQuery({
		queryKey: connectorsKeys.catalog(),
		queryFn: fetchConnectorsCatalog,
		staleTime: 5 * 60 * 1000,
		retry: false,
	});
