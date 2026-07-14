import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";

import { cn } from "@/app/utils/cn";
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
import { TableSkeleton } from "./tableSkeleton";

type ColumnMeta = {
	className?: string;
};

type DataTableProps<TData, TValue> = {
	className?: string;
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	url?: string;
	onRowClick?: (row: TData) => void;
	isPending?: boolean;
	columnsVisible?: Record<string, boolean>;
	state?: {
		expanded?: ExpandedState;
	};
	onRowBlur?: (row: TData) => void;
	onExpandedChange?: OnChangeFn<ExpandedState>;
	getSubRows?: (row: TData, index: number) => TData[] | undefined;
	getRowCanExpand?: (row: Row<TData>) => boolean;
	getRowProps?: (row: TData) => React.HTMLAttributes<HTMLTableRowElement> & Record<string, any>;
	addRow?: (parentId: number, depth: number, newItem: any) => void;
	removeRow?: (index: number, depth: number, id: number) => void;
	updateRow?: (updateFunction: any, dados: any) => void;
	updateData?: React.Dispatch<React.SetStateAction<any[]>>;
	noMaxTable?: boolean;
	renderActions?: (row: Row<TData>) => React.ReactNode;
	/** Linhas do skeleton enquanto isPending — combine com o page size para não saltar o layout ao carregar. */
	skeletonRows?: number;
};

export const TableData = <TData, TValue>({
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
	addRow,
	updateRow,
	className,
	renderActions,
	skeletonRows,
}: DataTableProps<TData, TValue>) => {
	const table = useReactTable({
		data,
		columns,
		state: {
			columnVisibility: columnsVisible,
			expanded: state?.expanded,
		},
		onExpandedChange: onExpandedChange,
		getSubRows: getSubRows,
		getRowCanExpand: getRowCanExpand,
		getExpandedRowModel: getExpandedRowModel(),
		getCoreRowModel: getCoreRowModel(),
		meta: {
			addRow, // Para adicionar subitens
			updateRow, // Para editar linhas
		},
	});

	return (
		<div
			className={cn(
				"bg-background m-0 w-full overflow-auto px-0",
				className,
				// noMaxTable ? "" : "max-h-(--maxHeight-table)",
			)}
		>
			<Table className="w-full">
				<TableHeader className="bg-muted/60 sticky top-0 z-10 h-10 border-b backdrop-blur">
					{table.getHeaderGroups()?.map((headerGroup) => (
						<TableRow key={headerGroup.id} className="hover:bg-transparent">
							{headerGroup?.headers?.map((header) => (
								<TableHead
									key={header.id}
									className="text-muted-foreground h-11 truncate text-xs font-semibold uppercase"
									style={{
										width: header.getSize() !== 150 ? header.getSize() : undefined,
									}}
								>
									{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
								</TableHead>
							))}
							{renderActions && (
								<TableHead className="w-px">
									<span className="sr-only">Ações</span>
								</TableHead>
							)}
						</TableRow>
					))}
				</TableHeader>
				{isPending ? (
					<TableSkeleton columns={columns} data={[]} rows={skeletonRows} />
				) : (
					<TableBody className="h-full">
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className={cn("h-12 hover:bg-muted/45", onRowClick && "focus-visible:ring-ring cursor-pointer focus-visible:ring-2 focus-visible:-outline-offset-2")}
									data-state={row.getIsSelected() && "selected"}
									role={onRowClick ? "button" : undefined}
									tabIndex={onRowClick ? 0 : undefined}
									onClick={() => onRowClick && onRowClick(row.original)}
									onKeyDown={(event) => {
										if (!onRowClick) return;
										if (event.key !== "Enter" && event.key !== " ") return;
										event.preventDefault();
										onRowClick(row.original);
									}}
									onBlur={() => onRowBlur && onRowBlur(row.original)}
									{...getRowProps?.(row.original)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											className={cn((cell.column.columnDef.meta as ColumnMeta)?.className, "truncate py-3.5")}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
									{renderActions && (
										<TableCell className="py-3.5 text-right" onClick={(event) => event.stopPropagation()}>
											{renderActions(row)}
										</TableCell>
									)}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columns.length + (renderActions ? 1 : 0)} className="text-muted-foreground h-28 text-center">
									Nenhum resultado encontrado. Ajuste os filtros ou crie o primeiro registro.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				)}
			</Table>
		</div>
	);
};
