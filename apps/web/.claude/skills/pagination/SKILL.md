---
name: pagination
description: Standard pagination model for this React Vite template. Use when creating, migrating, reviewing, or debugging paginated TanStack Query hooks, usePaginatedData usage, page and size state, sort and filter params, PaginatedApiResponse, TablePagination, ResponsiveTableCustom integration, TableFooter integration, or shared pagination API types.
---

# Pagination

Use the project pagination model inspired by `botFront`: feature services expose typed TanStack Query hooks, pages consume them through `usePaginatedData`, and table UIs receive `pagination` plus `updatePagination` handlers.

For feature list screens, pair this skill with `.claude/skills/tables/SKILL.md` and render paginated data with `ResponsiveTableCustom`.

## Quick Rules

- Use 0-based pages. Page `0` is the first page.
- Keep feature-specific DTOs and filters in `src/features/<feature>/api/types.ts`.
- Keep shared primitives in `src/lib/api/types` when used by more than one feature.
- Use `ApiRequestParams<Dto, Filter>` for paginated query params.
- Use `ApiRequestSortParam<Dto>[]` so `sort.by` is constrained to DTO keys.
- Return `PaginatedApiResponse<Dto>` from paginated fetchers and query hooks.
- Use `TablePagination` for UI state passed to `ResponsiveTableCustom` or, in low-level shared components only, `TableFooter`.
- Do not call API clients from pages or components; call feature hooks through `usePaginatedData`.
- Do not recreate `src/api`. This template uses `src/lib/api` for shared API infrastructure.

## References

Read only what the task needs:

- `references/pagination-types.md`: shared contracts and where to place them.
- `references/use-paginated-data.md`: hook behavior, service shape, and page usage examples.

## Implementation Checklist

1. Confirm whether pagination primitives already exist in `src/lib/api/types` or a feature `api/types.ts`.
2. Add missing shared primitives only once: `ApiRequestSortParam`, `ApiRequestParams`, `PaginatedApiResponse`, and `TablePagination`.
3. Implement the feature fetcher/query hook in `src/features/<feature>/api/service.ts`.
4. Ensure the query key includes params that change the request: page, size, filter, and sort.
5. Consume the query with `usePaginatedData({ query, filter, sort, storageKey })`.
6. Pass `pagination` and `updatePagination` handlers into `ResponsiveTableCustom`.
7. Reset page to `0` when filter, sort, or size changes.
8. Run `npm run build` and `npm run lint` after implementing real code changes.

## Naming

Prefer these names unless existing code has a stronger local convention:

- Hook: `usePaginatedData`.
- Request type: `Get<Domain>Params = ApiRequestParams<<Domain>Dto, Get<Domain>Filter>`.
- Response type: `PaginatedApiResponse<<Domain>Dto>`.
- Storage key: `<feature>Pagination`, for example `customersPagination`.

## Review Focus

When reviewing paginated code, check:

- Page numbering is not mixed between 0-based UI/API and 1-based display text.
- `ResponsiveTableCustom` or `TableFooter` receives `pagination.page` as 0-based.
- The service hook owns `queryKey`; callers may pass options but not override the key.
- `usePaginatedData` receives the hook function itself, not an already-executed query result.
- Filter and sort object identity changes do not cause unnecessary pagination loops.
