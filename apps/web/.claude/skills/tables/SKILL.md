---
name: tables
description: Table creation and migration rules for this React Vite app. Use when creating, migrating, reviewing, or debugging list screens, paginated tables, TanStack column definitions, responsive table behavior, row actions, loading states, empty states, or table pagination.
---

# Tables

Use the project responsive table abstraction for feature screens. Do not hand-code table markup in pages.

## Required Pattern

- Use `ResponsiveTableCustom` from `@/components` for normal feature list pages.
- Define columns with TanStack `ColumnDef<TData>[]`.
- Pass paginated state from `usePaginatedData` directly into `ResponsiveTableCustom`.
- Use `renderActions` for row actions instead of adding a manual actions `<TableCell>`.
- Use column `meta` to control mobile rendering.
- Keep toolbar, filters, error state, and page header outside the table component.
- Do not wrap tables in `Card`; `ResponsiveTableCustom` already owns the table surface.
- Do not manually map rows with `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>` in feature pages.

Raw primitives from `src/components/table/table.tsx` are low-level building blocks for shared table internals, stories, or exceptional reusable components only. They are not the default page-level pattern.

## Standard Usage

```tsx
import { usePaginatedData } from "@/app/hooks/usePaginatedData";
import { Badge, Button, EmptyState, ErrorState, ResponsiveTableCustom } from "@/components";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useMemo } from "react";
import { useItemsQuery, type ItemDto, type ItemFilter } from "../api";

export const PageItems = () => {
	const filter = useMemo<ItemFilter>(() => ({}), []);

	const { data, isLoading, isError, refetch, pagination, updatePagination } = usePaginatedData<
		ItemDto,
		ItemFilter
	>({
		query: useItemsQuery,
		filter,
		storageKey: "itemsPagination",
	});

	const columns = useMemo<ColumnDef<ItemDto>[]>(
		() => [
			{
				accessorKey: "name",
				header: "Nome",
				cell: ({ row }) => row.original.name,
				meta: { mobileHeader: true, mobileOrder: 1 },
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => <Badge>{row.original.status}</Badge>,
				meta: { mobileStatus: true, mobileOrder: 2 },
			},
			{
				accessorKey: "createdAt",
				header: "Criado em",
				cell: ({ row }) => row.original.createdAt,
				meta: { mobileLabel: "Criado em", mobileOrder: 3 },
			},
		],
		[],
	);

	const renderActions = (row: Row<ItemDto>) => (
		<Button type="button" variant="ghost" size="icon" aria-label={`Abrir acoes de ${row.original.name}`}>
			<MoreHorizontal className="h-4 w-4" />
		</Button>
	);

	if (isError) return <ErrorState onRetry={refetch} />;

	if (!isLoading && data.length === 0) {
		return <EmptyState title="Nenhum item" message="Ajuste os filtros ou crie o primeiro registro." />;
	}

	return (
		<ResponsiveTableCustom
			columns={columns}
			data={data}
			isPending={isLoading}
			pagination={pagination}
			onPageChange={(page) => updatePagination({ page })}
			onSizeChange={(size) => updatePagination({ size })}
			renderActions={renderActions}
		/>
	);
};
```

## Column Meta For Mobile

Use these `ColumnDef.meta` flags to make the mobile card layout useful:

- `mobileHeader: true`: main title line for the mobile card.
- `mobileStatus: true`: status/badge shown near the mobile card header.
- `mobileOrder: number`: order for fields in the mobile card.
- `mobileHidden: true`: hide noisy desktop-only columns on mobile.
- `mobileLabel: string`: label override when the desktop header is not enough.
- `mobileValueClassName: string`: value alignment/wrapping override for mobile.

Every responsive table should have at least one `mobileHeader`. Status columns should use `mobileStatus` when present.

## Pagination

For paginated screens:

1. Use `usePaginatedData`.
2. Keep pages 0-based.
3. Pass `pagination` to `ResponsiveTableCustom`.
4. Wire handlers as `onPageChange={(page) => updatePagination({ page })}` and `onSizeChange={(size) => updatePagination({ size })}`.
5. Prefer the table skeleton from `ResponsiveTableCustom`; do not add a separate generic rectangle skeleton above the table when the table can render its own skeleton.

## Actions

- Use `renderActions` for per-row actions.
- Prefer `DropdownMenu` for multiple actions.
- Stop propagation inside action controls when the row also has `onRowClick`; `ResponsiveTableCustom` handles this for the `renderActions` container.
- Use accessible labels on icon-only action buttons.

## Empty, Loading, And Error States

- Use `ErrorState` or `QueryErrorState` before rendering the table on query errors.
- Use `EmptyState` outside the table when the whole screen has no results and needs a CTA.
- Let `ResponsiveTableCustom` handle loading skeletons when the table shape should remain visible.
- Keep copy user-facing and localized when working in a feature that already uses i18n.

## Do Not

```tsx
<Card>
	<Table>
		<TableHeader>
			<TableRow>...</TableRow>
		</TableHeader>
		<TableBody>
			{data.map((item) => (
				<TableRow key={item.id}>...</TableRow>
			))}
		</TableBody>
	</Table>
	<TableFooter pagination={pagination} />
</Card>
```

Replace that shape with `ResponsiveTableCustom`.
