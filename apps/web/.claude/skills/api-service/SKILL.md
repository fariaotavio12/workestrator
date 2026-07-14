---
name: api-service
description: Feature-local API service rules for this React Vite web app. Use when creating, moving, reviewing, or debugging HTTP services, TanStack Query hooks, mutations, query keys, API response types, pagination, cache invalidation, or migrations away from legacy src/api.
---

# API Service

Keep API code feature-local.

```txt
src/features/<feature>/api/
  index.ts
  keys.ts
  service.ts
  types.ts
```

`src/api` must not exist. Do not add domain code or shared clients there.

## Responsibilities

- `types.ts`: request, response, DTO, table, form, and feature API types.
- `keys.ts`: query keys and query-key builders.
- `service.ts`: fetchers, mutations, query hooks, cache invalidation helpers.
- `index.ts`: public exports only.

Shared API client comes from `@/app/api/clients`.

## Rules

- Do not call `api.get/post/put/delete` directly from pages or components.
- Export hooks from `api/index.ts` and consume `@/features/<feature>/api`.
- Keep query keys stable and colocated in `keys.ts`.
- Invalidate related feature keys explicitly after mutations.
- Keep feature types in the same feature unless they are truly shared primitives.
- Prefer typed request/response contracts over inline object types in components.

## Basic Pattern

```ts
// keys.ts
export const customerKeys = {
	all: ["customers"] as const,
	lists: () => [...customerKeys.all, "list"] as const,
	detail: (id: string) => [...customerKeys.all, "detail", id] as const,
};
```

```ts
// service.ts
import { api } from "@/app/api/clients";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerKeys } from "./keys";
import type { Customer, UpdateCustomerRequest } from "./types";

const getCustomers = async (): Promise<Customer[]> => {
	const { data } = await api.get<Customer[]>("/customers");
	return data;
};

const updateCustomer = async ({ id, data }: { id: string; data: UpdateCustomerRequest }) => {
	const response = await api.put<Customer>(`/customers/${id}`, data);
	return response.data;
};

export const useCustomersQuery = () => useQuery({ queryKey: customerKeys.lists(), queryFn: getCustomers });

export const useUpdateCustomerMutation = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: updateCustomer,
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
			queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
		},
	});
};
```

## Pagination

Use the `pagination` skill for the standardized model copied from `botFront`: `ApiRequestParams`, `ApiRequestSortParam`, `PaginatedApiResponse`, `TablePagination`, and `usePaginatedData` with 0-based pages.

For paginated services:

- Define feature DTOs, filters, and params in `src/features/<feature>/api/types.ts`.
- Reuse shared pagination primitives from `src/lib/api/types` when more than one feature needs them.
- Keep query hooks shaped as `(params?, options?)` and let the hook own its `queryKey`.
- Include page, size, filter, and sort in the query key.
- Normalize backend-specific page shapes in the fetcher before returning data to components.

## Migration Rule

When a file imports from `@/api/...`, migrate that import immediately. Never spread legacy API imports to new files.
