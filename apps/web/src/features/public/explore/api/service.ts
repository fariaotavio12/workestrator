import { api } from "@/app/api/clients";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { notify } from "@/components";
import type { PageResultApiResponse } from "@/app/api/types";
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { exploreKeys } from "./keys";
import type {
	CreateExploreAssetRequest,
	ExploreAsset,
	ExploreMcpPreset,
	GetExploreAssetsParams,
	ImportedExploreAsset,
} from "./types";

export const fetchExploreAssetsApi = async (
	params?: GetExploreAssetsParams,
): Promise<PageResultApiResponse<ExploreAsset>> => {
	const { data } = await api.get<PageResultApiResponse<ExploreAsset>>("/explore/assets", {
		params: {
			page: params?.page ?? 0,
			size: params?.size ?? 25,
			type: params?.filter?.type,
			search: params?.filter?.search,
		},
	});

	return data;
};

export const useExploreAssetsQuery = (
	params?: GetExploreAssetsParams,
	options?: Omit<UseQueryOptions<PageResultApiResponse<ExploreAsset>>, "queryKey" | "queryFn">,
) =>
	useQuery({
		queryKey: exploreKeys.assets(params),
		queryFn: () => fetchExploreAssetsApi(params),
		staleTime: 1000 * 60,
		...options,
	});

export const fetchMyExploreAssetsApi = async (
	params?: GetExploreAssetsParams,
): Promise<PageResultApiResponse<ExploreAsset>> => {
	const { data } = await api.get<PageResultApiResponse<ExploreAsset>>("/explore/assets/me", {
		params: {
			page: params?.page ?? 0,
			size: params?.size ?? 25,
		},
	});

	return data;
};

export const useMyExploreAssetsQuery = (
	params?: GetExploreAssetsParams,
	options?: Omit<UseQueryOptions<PageResultApiResponse<ExploreAsset>>, "queryKey" | "queryFn">,
) =>
	useQuery({
		queryKey: exploreKeys.myAssets(params),
		queryFn: () => fetchMyExploreAssetsApi(params),
		staleTime: 1000 * 30,
		...options,
	});

export const createExploreAssetApi = async (payload: CreateExploreAssetRequest): Promise<ExploreAsset> => {
	const { data } = await api.post<ExploreAsset>("/explore/assets", payload);
	return data;
};

export const importExploreAssetApi = async (assetId: string): Promise<ImportedExploreAsset> => {
	const { data } = await api.post<ImportedExploreAsset>(`/explore/assets/${assetId}/import`);
	return data;
};

export const publishExploreAssetApi = async (assetId: string): Promise<ExploreAsset> => {
	const { data } = await api.post<ExploreAsset>(`/explore/assets/${assetId}/publish`);
	return data;
};

export const unpublishExploreAssetApi = async (assetId: string): Promise<ExploreAsset> => {
	const { data } = await api.post<ExploreAsset>(`/explore/assets/${assetId}/unpublish`);
	return data;
};

export const fetchExploreMcpPresetApi = async (): Promise<ExploreMcpPreset> => {
	const { data } = await api.get<ExploreMcpPreset>("/explore/mcp/preset");
	return data;
};

const useInvalidateExplore = () => {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: exploreKeys.all });
};

export const useCreateExploreAsset = () => {
	const invalidate = useInvalidateExplore();
	return useMutation({
		mutationFn: createExploreAssetApi,
		onSuccess: () => {
			invalidate();
			notify.success("Recurso salvo");
		},
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível salvar o recurso.")),
	});
};

export const useImportExploreAsset = () => {
	const invalidate = useInvalidateExplore();

	return useMutation({
		mutationFn: importExploreAssetApi,
		onSuccess: () => {
			invalidate();
			notify.success("Recurso importado", "Ele foi salvo como privado na sua biblioteca.");
		},
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível importar o recurso.")),
	});
};

export const usePublishExploreAsset = () => {
	const invalidate = useInvalidateExplore();
	return useMutation({
		mutationFn: publishExploreAssetApi,
		onSuccess: () => {
			invalidate();
			notify.success("Recurso publicado no Explore");
		},
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível publicar o recurso.")),
	});
};

export const useUnpublishExploreAsset = () => {
	const invalidate = useInvalidateExplore();
	return useMutation({
		mutationFn: unpublishExploreAssetApi,
		onSuccess: () => {
			invalidate();
			notify.success("Recurso voltou para privado");
		},
		onError: (error) => notify.error(getApiErrorMessage(error, "Não foi possível despublicar o recurso.")),
	});
};

export const useExploreMcpPresetQuery = (
	options?: Omit<UseQueryOptions<ExploreMcpPreset>, "queryKey" | "queryFn">,
) =>
	useQuery({
		queryKey: exploreKeys.mcpPreset(),
		queryFn: fetchExploreMcpPresetApi,
		staleTime: 1000 * 30,
		...options,
	});
