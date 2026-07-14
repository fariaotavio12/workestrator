import { Skeleton } from "@/components/skeleton";
import { TableBody, TableCell, TableRow } from "@/components/table";
import { type ColumnDef } from "@tanstack/react-table";

type DataTableProps<TData, TValue> = {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	/** Linhas a exibir enquanto carrega. Combine com o page size real para evitar salto de layout ao chegar os dados. */
	rows?: number;
};

// Larguras alternadas para o skeleton não parecer uma grade uniforme e artificial.
const BAR_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-full", "w-5/6"];

export const TableSkeleton = <TData, TValue>({ columns, data, rows = 5 }: DataTableProps<TData, TValue>) => {
	void data;

	return (
		<TableBody className="h-auto">
			{Array.from({ length: rows }, (_, rowIndex) => (
				<TableRow key={rowIndex} className="h-12">
					{columns.map((column, columnIndex) => (
						<TableCell key={`${String(column.id ?? columnIndex)}-${rowIndex}`}>
							<Skeleton className={`h-3.5 ${BAR_WIDTHS[(rowIndex + columnIndex) % BAR_WIDTHS.length]}`} />
						</TableCell>
					))}
				</TableRow>
			))}
		</TableBody>
	);
}
