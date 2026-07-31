import { tanStackQueryClient } from "@/app/api/clients";
import { fetchProviders, providersKeys } from "@/features/security/models/api";
import { fetchSquadDetail, squadDetailKeys } from "@/features/security/squad-detail/api";

const CONFIG_FRESH_MS = 30_000;

/** Promises em voo por squad — coordenador e agente disparam no mesmo tick e devem compartilhar a busca. */
const inFlight = new Map<string, Promise<void>>();

export const loadRunConfig = (squadId: string): Promise<void> => {
	const existing = inFlight.get(squadId);
	if (existing) return existing;

	const pending = Promise.allSettled([
		tanStackQueryClient.fetchQuery({
			queryKey: squadDetailKeys.detail(squadId),
			queryFn: () => fetchSquadDetail(squadId),
			staleTime: CONFIG_FRESH_MS,
		}),
		tanStackQueryClient.fetchQuery({
			queryKey: providersKeys.list(),
			queryFn: fetchProviders,
			staleTime: CONFIG_FRESH_MS,
		}),
	])
		.then(() => undefined)
		.finally(() => {
			inFlight.delete(squadId);
		});

	inFlight.set(squadId, pending);
	return pending;
};
