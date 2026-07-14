import type { ApiRequestParams, ApiRequestSortParam } from "@/app/api/types/api-request";
import type { PaginatedApiResponse } from "@/app/api/types/api-response";
import type { TablePagination } from "@/app/api/types/table";
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

type UsePaginatedDataParams<D extends object, F = unknown> = {
	query: (
		params?: ApiRequestParams<D, F>,
		options?: Omit<UseQueryOptions<PaginatedApiResponse<D>>, "queryKey">,
	) => UseQueryResult<PaginatedApiResponse<D>>;
	filter?: F;
	sort?: ApiRequestSortParam<D>[];
	storageKey?: string;
};

const EMPTY_PAGINATION: TablePagination = {
	page: 0,
	size: 25,
	totalElements: 0,
	totalPages: 0,
};

type PersistedPagination = Pick<TablePagination, "page" | "size">;

const getPersistedPagination = (storageKey?: string): PersistedPagination | null => {
	if (!storageKey) return null;

	try {
		const raw = localStorage.getItem(storageKey);
		if (!raw) return null;

		const parsed = JSON.parse(raw) as Partial<PersistedPagination>;
		const page = parsed.page && Number.isInteger(parsed.page) && parsed.page >= 0 ? parsed.page : EMPTY_PAGINATION.page;

		const size = parsed.size && Number.isInteger(parsed.size) && parsed.size > 0 ? parsed.size : EMPTY_PAGINATION.size;

		return { page, size };
	} catch (error) {
		localStorage.removeItem(storageKey);
		console.warn("Failed to retrieve persisted pagination:", error);
		return null;
	}
};

const setPersistedPagination = (storageKey: string, pagination: PersistedPagination) => {
	try {
		localStorage.setItem(storageKey, JSON.stringify(pagination));
	} catch (error) {
		console.warn("Failed to persist pagination:", error);
	}
};

/**
 * Hook para padronizar/facilitar o trabalho com dados paginados.
 *
 * @param query Service usando TanStack Query que retorna dados paginados (passar o hook sem executar).
 * @param filter Filtros a serem aplicados na consulta.
 * @param sort Parâmetros de ordenação a serem aplicados na consulta.
 * @param storageKey Chave para persistir a paginação no localStorage se for passada.
 *
 * @example
 * usePaginatedData({
 *   query: useGetProductBrands,
 *   filter,
 *   sort,
 *   storageKey: "brandsPagination",
 * });
 */
export const usePaginatedData = <D extends object, F = unknown>({
	query,
	filter,
	sort,
	storageKey,
}: UsePaginatedDataParams<D, F>) => {
	const [pagination, setPagination] = useState<TablePagination>(() => {
		const persisted = getPersistedPagination(storageKey);
		return persisted ? { ...EMPTY_PAGINATION, ...persisted } : EMPTY_PAGINATION;
	});

	const { data, isLoading, isError, error, refetch } = query({
		page: pagination.page,
		size: pagination.size,

		filter,
		sort,
	});

	const memoSize = useMemo(() => pagination.size, [pagination.size]);

	const filterKey = useMemo(() => JSON.stringify(filter ?? {}), [filter]);
	const sortKey = useMemo(() => JSON.stringify(sort ?? []), [sort]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const stableFilter = useMemo(() => filter, [filterKey]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const stableSort = useMemo(() => sort, [sortKey]);

	const updatePagination = (value: Partial<TablePagination>) => {
		setPagination((prev) => ({ ...prev, ...value }));
	};

	useEffect(() => {
		if (!storageKey) return;

		setPersistedPagination(storageKey, {
			page: pagination.page,
			size: pagination.size,
		});
	}, [pagination.page, pagination.size, storageKey]);

	useEffect(
		() => {
			if (data) {
				// eslint-disable-next-line react-hooks/set-state-in-effect
				setPagination((prev) => {
					if (prev.totalPages === data.totalPages) return prev;

					return {
						...prev,
						page: data.totalPages > 0 ? Math.min(prev.page, data.totalPages - 1) : 0,
						totalPages: data.totalPages,
						totalElements: data.totalElements,
						size: data.size,
					};
				});
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[data?.totalPages],
	);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setPagination((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
	}, [stableFilter, stableSort, memoSize]);

	return {
		data: data?.data ?? [],
		isLoading,
		isError,
		error,
		refetch,
		pagination,
		updatePagination,
	};
};
