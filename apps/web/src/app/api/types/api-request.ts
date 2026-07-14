export type ApiRequestSortParam<T> = {
	by: keyof T;
	direction: "asc" | "desc";
};

export type ApiRequestParams<T extends object = Record<string, unknown>, TFilter = unknown> = {
	page?: number;
	size?: number;
	filter?: TFilter;
	sort?: ApiRequestSortParam<T>[];
};

/**
 * @deprecated Use ApiRequestParams somente. Mantido apenas para compatibilidade durante migracoes.
 */
export type ApiRequestParamsFilterQuery<T extends object = Record<string, unknown>> = {
	page?: number;
	size?: number;
	filter?: string;
	sort?: ApiRequestSortParam<T>[];
};
