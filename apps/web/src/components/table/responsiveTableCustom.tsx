import { useIsMobile } from "@/app/hooks/useIsMobile";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { TableCustom } from "./index";
import type { TablePagination } from "./tableFooter";

type ResponsiveTableCustomProps<TData, TValue> = {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	isPending?: boolean;
	onRowClick?: (row: TData) => void;
	onRowBlur?: (row: TData) => void;
	columnsVisible?: Record<string, boolean>;
	pagination: TablePagination;
	onPageChange: (page: number) => void;
	onSizeChange: (size: number) => void;
	renderActions?: (row: Row<TData>) => React.ReactNode;
};

export const ResponsiveTableCustom = <TData, TValue>({
	columns,
	data,
	isPending,
	onRowClick,
	onRowBlur,
	columnsVisible,
	pagination,
	onPageChange,
	onSizeChange,
	renderActions,
}: ResponsiveTableCustomProps<TData, TValue>) => {
	const isMobile = useIsMobile();

	if (isMobile) {
		return (
			<div className="overflow-hidden rounded-lg border bg-background">
				<TableCustom.MobileData
					className="border-0"
					columns={columns}
					data={data}
					isPending={isPending}
					onRowClick={onRowClick}
					onRowBlur={onRowBlur}
					columnsVisible={columnsVisible}
					renderActions={renderActions}
					skeletonRows={Math.min(pagination.size, 6)}
				/>

				<TableCustom.Footer onPageChange={onPageChange} onSizeChange={onSizeChange} pagination={pagination} />
			</div>
		);
	}

	return (
		<TableCustom.Root className="bg-background">
			<TableCustom.Data
				columns={columns}
				data={data}
				isPending={isPending}
				onRowClick={onRowClick}
				onRowBlur={onRowBlur}
				columnsVisible={columnsVisible}
				renderActions={renderActions}
				skeletonRows={pagination.size}
			/>
			<TableCustom.Footer onPageChange={onPageChange} onSizeChange={onSizeChange} pagination={pagination} />
		</TableCustom.Root>
	);
}
