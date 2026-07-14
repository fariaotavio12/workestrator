# Pagination Types

Use these contracts for paginated APIs and table pagination state. Put shared primitives under `src/lib/api/types` once they are needed by more than one feature. Keep feature DTOs and filter shapes in `src/features/<feature>/api/types.ts`.

## Shared Request Types

```ts
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
```

Use the DTO type as the first generic so `sort.by` only accepts valid API fields.

```ts
type GetCustomersFilter = {
	search?: string;
	active?: boolean;
};

type GetCustomersParams = ApiRequestParams<CustomerDto, GetCustomersFilter>;
```

## Shared Response Types

The default template pagination shape follows the normalized `botFront` contract:

```ts
export type PaginatedApiResponse<T> = {
	data: T[];
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
	hasNext: boolean;
	hasPrevious: boolean;
};
```

If a backend returns Spring Boot `Page<T>` with `content` and `number`, normalize it in the feature fetcher before returning from the service hook. Components should receive `data`, `page`, `size`, `totalElements`, and `totalPages` consistently.

```ts
type SpringPage<T> = {
	content: T[];
	number: number;
	size: number;
	totalElements: number;
	totalPages: number;
	first: boolean;
	last: boolean;
};

const normalizeSpringPage = <T>(page: SpringPage<T>): PaginatedApiResponse<T> => ({
	data: page.content,
	page: page.number,
	size: page.size,
	totalElements: page.totalElements,
	totalPages: page.totalPages,
	hasNext: !page.last,
	hasPrevious: !page.first,
});
```

## Table Pagination

```ts
export type TablePagination = {
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
};
```

`TablePagination.page` is always 0-based. Display components may show `page + 1`, but state and API params must keep the 0-based value.

## Import Guidance

Preferred shared exports:

```ts
import type { ApiRequestParams, ApiRequestSortParam, PaginatedApiResponse, TablePagination } from "@/lib/api/types";
```

If a type is used by only one feature and is not a primitive, keep it local:

```ts
// src/features/customer/api/types.ts
import type { ApiRequestParams } from "@/lib/api/types";

export type CustomerDto = {
	id: string;
	name: string;
	active: boolean;
};

export type CustomerFilter = {
	search?: string;
	active?: boolean;
};

export type GetCustomersParams = ApiRequestParams<CustomerDto, CustomerFilter>;
```
