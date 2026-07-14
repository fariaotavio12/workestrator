import { cn } from "@/app/utils/cn";
import { Skeleton } from "@/components/skeleton";
import {
	type ColumnDef,
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	type OnChangeFn,
	type Row,
	useReactTable,
} from "@tanstack/react-table";

type MobileTableDataProps<TData, TValue> = {
	className?: string;
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	onRowClick?: (row: TData) => void;
	onRowBlur?: (row: TData) => void;
	isPending?: boolean;
	columnsVisible?: Record<string, boolean>;
	state?: {
		expanded?: ExpandedState;
	};
	onExpandedChange?: OnChangeFn<ExpandedState>;
	getSubRows?: (row: TData) => TData[] | undefined;
	getRowCanExpand?: (row: Row<TData>) => boolean;
	getRowProps?: (row: TData) => React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
	renderActions?: (row: Row<TData>) => React.ReactNode;
	renderFooter?: (row: Row<TData>) => React.ReactNode;
	/** Cards do skeleton enquanto isPending — combine com o page size para não saltar o layout ao carregar. */
	skeletonRows?: number;
};

export const TableMobileData = <TData, TValue>({
	columns,
	data,
	onRowClick,
	onRowBlur,
	isPending,
	columnsVisible,
	state,
	onExpandedChange,
	getSubRows,
	getRowCanExpand,
	getRowProps,
	renderActions,
	renderFooter,
	className,
	skeletonRows = 4,
}: MobileTableDataProps<TData, TValue>) => {
	const table = useReactTable({
		data,
		columns,
		state: {
			columnVisibility: columnsVisible,
			expanded: state?.expanded,
		},
		onExpandedChange,
		getSubRows,
		getRowCanExpand,
		getExpandedRowModel: getExpandedRowModel(),
		getCoreRowModel: getCoreRowModel(),
	});

	if (isPending) {
		return (
			<div className={cn("space-y-3", className)}>
				{Array.from({ length: skeletonRows }, (_, index) => (
					<div key={index} className="bg-background overflow-hidden rounded-lg border shadow-sm">
						<div className="bg-muted/45 flex items-center justify-between border-b px-4 py-3">
							<Skeleton className="h-4 w-28" />
							<div className="flex items-center gap-2">
								<Skeleton className="h-6 w-16 rounded-full" />
								<Skeleton className="h-8 w-8" />
							</div>
						</div>

						{Array.from({ length: 3 }, (__, rowIndex) => (
							<div key={rowIndex} className="grid grid-cols-[120px_1fr] gap-3 border-b px-4 py-3 last:border-b-0">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-3 w-full" />
							</div>
						))}
					</div>
				))}
			</div>
		);
	}

	const rows = table.getRowModel().rows;

	if (!rows.length) {
		return (
			<div className={cn("bg-background text-muted-foreground rounded-lg border p-6 text-center text-sm", className)}>
				Nenhum resultado encontrado. Ajuste os filtros ou crie o primeiro registro.
			</div>
		);
	}

	const headerMap = Object.fromEntries((table.getHeaderGroups()[0]?.headers ?? []).map((h) => [h.column.id, h]));

	return (
		<div className={cn("overflow-hidden rounded-lg border bg-background", className)}>
			{rows.map((row) => {
				const visibleCells = row
					.getVisibleCells()
					.filter((cell) => !cell.column.columnDef.meta?.mobileHidden)
					.sort((cellA, cellB) => {
						const orderA = cellA.column.columnDef.meta?.mobileOrder ?? 999;
						const orderB = cellB.column.columnDef.meta?.mobileOrder ?? 999;
						return orderA - orderB;
					});

				const headerCell =
					visibleCells.find((cell) => cell.column.columnDef.meta?.mobileHeader) ??
					visibleCells.find((cell) => cell.column.columnDef.meta?.mobileTitle);

				const statusCell = visibleCells.find((cell) => cell.column.columnDef.meta?.mobileStatus);

				const contentCells = visibleCells.filter((cell) => {
					const meta = cell.column.columnDef.meta;

					return !meta?.mobileHeader && !meta?.mobileTitle && !meta?.mobileStatus && !meta?.mobileFooter;
				});

				return (
					<div
						key={row.id}
						className={cn(
							"bg-background border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/25",
							onRowClick && "focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:-outline-offset-2",
						)}
						role={onRowClick ? "button" : undefined}
						tabIndex={onRowClick ? 0 : undefined}
						onClick={() => onRowClick?.(row.original)}
						onKeyDown={(event) => {
							if (!onRowClick) return;
							if (event.key !== "Enter" && event.key !== " ") return;
							event.preventDefault();
							onRowClick(row.original);
						}}
						onBlur={() => onRowBlur?.(row.original)}
						{...getRowProps?.(row.original)}
					>
						<div className="flex items-start justify-between gap-3">
							<div className="text-foreground min-w-0 flex-1 text-sm font-semibold">
								{headerCell ? flexRender(headerCell.column.columnDef.cell, headerCell.getContext()) : "-"}
							</div>

							<div className="flex shrink-0 items-center gap-2">
								{statusCell ? <div>{flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}</div> : null}
								{renderActions ? <div onClick={(event) => event.stopPropagation()}>{renderActions(row)}</div> : null}
							</div>
						</div>

						<div className="mt-3 grid gap-2">
							{contentCells.map((cell) => {
								return (
									<div
										key={cell.id}
										className="flex items-start justify-between gap-4"
									>
										<div className="text-muted-foreground shrink-0 text-sm">
											{(() => {
												const header = headerMap[cell.column.id];
												if (header && !header.isPlaceholder) {
													return flexRender(header.column.columnDef.header, header.getContext());
												}
												return cell.column.columnDef.meta?.mobileLabel ?? cell.column.id;
											})()}
										</div>

										<div
											className={cn(
												"text-foreground min-w-0 text-right text-sm wrap-break-word",
												cell.column.columnDef.meta?.mobileValueClassName,
											)}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</div>
									</div>
								);
							})}
						</div>

						{renderFooter ? <div className="mt-3 border-t pt-3">{renderFooter(row)}</div> : null}
					</div>
				);
			})}
		</div>
	);
};
