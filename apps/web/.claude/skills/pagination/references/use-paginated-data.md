# usePaginatedData Pattern

`usePaginatedData` centralizes table pagination state for TanStack Query list hooks. It receives a feature query hook, builds request params with page, size, filter, and sort, and returns UI-ready rows plus `TablePagination` state.

## Hook Contract

```ts
import type { ApiRequestParams, ApiRequestSortParam, PaginatedApiResponse, TablePagination } from "@/lib/api/types";
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
```

Keep the implementation in a shared app hook such as `src/app/hooks/usePaginatedData.ts` when multiple features need it.

## Behavior Requirements

- Initialize with `{ page: 0, size: 25, totalElements: 0, totalPages: 0 }`.
- Accept optional `storageKey` to persist only `{ page, size }` in `localStorage`.
- Call the supplied query hook with `{ page, size, filter, sort }`.
- Return `data?.data ?? []` as the list.
- Update `totalPages`, `totalElements`, and `size` from the response.
- Clamp the current page when the backend reports fewer pages.
- Reset `page` to `0` when `filter`, `sort`, or `size` changes.
- Expose `updatePagination(value: Partial<TablePagination>)` for table controls.

## Service Hook Shape

Feature services should expose hooks with params first and options last. The hook owns the query key.

```ts
// src/features/customer/api/service.ts
import { api } from "@/app/api/clients";
import type { PaginatedApiResponse } from "@/lib/api/types";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { customerKeys } from "./keys";
import type { CustomerDto, GetCustomersParams } from "./types";

const getCustomers = async (params?: GetCustomersParams): Promise<PaginatedApiResponse<CustomerDto>> => {
	const { data } = await api.get<PaginatedApiResponse<CustomerDto>>("/customers", { params });
	return data;
};

export const useCustomersQuery = (
	params?: GetCustomersParams,
	options?: Omit<UseQueryOptions<PaginatedApiResponse<CustomerDto>>, "queryKey">,
) =>
	useQuery({
		queryKey: customerKeys.list(params),
		queryFn: () => getCustomers(params),
		...options,
	});
```

## Query Keys

Include every request-changing value in the list key.

```ts
// src/features/customer/api/keys.ts
import type { GetCustomersParams } from "./types";

export const customerKeys = {
	all: ["customers"] as const,
	lists: () => [...customerKeys.all, "list"] as const,
	list: (params?: GetCustomersParams) => [...customerKeys.lists(), params] as const,
	detail: (id: string) => [...customerKeys.all, "detail", id] as const,
};
```

## Page Usage

```tsx
import { usePaginatedData } from "@/app/hooks/usePaginatedData";
import { ResponsiveTableCustom } from "@/components";
import type { ColumnDef } from "@tanstack/react-table";
import { useCustomersQuery } from "@/features/customer/api";
import type { CustomerDto, CustomerFilter } from "@/features/customer/api";
import { useMemo } from "react";

const CustomerPage = () => {
	const filter: CustomerFilter = { search: "" };
	const sort = [{ by: "name", direction: "asc" }] satisfies ApiRequestSortParam<CustomerDto>[];
	const columns = useMemo<ColumnDef<CustomerDto>[]>(
		() => [
			{
				accessorKey: "name",
				header: "Nome",
				cell: ({ row }) => row.original.name,
				meta: { mobileHeader: true, mobileOrder: 1 },
			},
		],
		[],
	);

	const {
		data: customers,
		isLoading,
		pagination,
		updatePagination,
	} = usePaginatedData<CustomerDto, CustomerFilter>({
		query: useCustomersQuery,
		filter,
		sort,
		storageKey: "customersPagination",
	});

	return (
		<ResponsiveTableCustom
			columns={columns}
			data={customers}
			isPending={isLoading}
			pagination={pagination}
			onPageChange={(page) => updatePagination({ page })}
			onSizeChange={(size) => updatePagination({ size })}
		/>
	);
};
```

## Common Mistakes

- Do not pass `query: useCustomersQuery()`; pass `query: useCustomersQuery`.
- Do not pass 1-based page values to API params.
- Do not inline untyped sort fields like `{ by: "name" }` without constraining them to the DTO.
- Do not store feature filters in shared pagination types.
- Do not let components normalize backend page shapes; normalize in the service/fetcher.
