import type { ApiRequestSortParam } from "@/app/api/types/api-request";
import { useCallback, useState } from "react";

/**
 * Hook genérico para gerenciar sortings.
 * T = tipo do recurso (para limitar `by` a keyof T)
 */
export const useSortings = <T,>(initial: ApiRequestSortParam<T>[] = []) => {
	const [sortings, setSortings] = useState<ApiRequestSortParam<T>[]>(initial);

	const getSortFor = useCallback((field: keyof T) => sortings.find((s) => s.by === field), [sortings]);

	/**
	 * setSortFor(field)(next)
	 * - Se `next` for undefined, limpa o sorting
	 * - Se `next` vier, substitui qualquer sorting existente (apenas 1 ativo por vez)
	 */
	const setSortFor = useCallback(
		(field: keyof T) => (next?: ApiRequestSortParam<T>) => {
			setSortings(next ? [{ ...next, by: field }] : []);
		},
		[],
	);

	/**
	 * Retorna a string de sorting no formato da API: "sortBy=campo&sortDesc=true|false"
	 * Retorna string vazia se não houver sorting ativo.
	 */
	const toSortString = useCallback(() => {
		const first = sortings[0];
		if (!first) return "";
		return `sortBy=${String(first.by)}&sortDesc=${first.direction === "desc" ? "true" : "false"}`;
	}, [sortings]);

	return { sortings, getSortFor, setSortFor, toSortString };
}
