import { api } from "@/app/api/clients";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { notify } from "@/components";
import type { Script } from "@/features/security/orchestrator-shared/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { scriptsKeys } from "./keys";
import type { ScriptPayload } from "./types";

/** Exportado (além do hook) para o scheduler local poder popular o cache fora de um componente React. */
export const fetchScripts = async (): Promise<Script[]> => {
	const { data } = await api.get<Script[]>("/scripts");
	return data;
};

const useInvalidateScripts = () => {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: scriptsKeys.list() });
};

export const useScriptsQuery = () => useQuery({ queryKey: scriptsKeys.list(), queryFn: fetchScripts });

export const useCreateScript = () => {
	const invalidate = useInvalidateScripts();
	return useMutation({
		mutationFn: (payload: ScriptPayload) => api.post<Script>("/scripts", payload).then((r) => r.data),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível criar a ferramenta.")),
	});
};

export const useUpdateScript = () => {
	const invalidate = useInvalidateScripts();
	return useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: Partial<ScriptPayload> }) =>
			api.put<Script>(`/scripts/${id}`, payload).then((r) => r.data),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível atualizar a ferramenta.")),
	});
};

export const useDeleteScript = () => {
	const invalidate = useInvalidateScripts();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/scripts/${id}`),
		onSuccess: invalidate,
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível excluir a ferramenta.")),
	});
};
