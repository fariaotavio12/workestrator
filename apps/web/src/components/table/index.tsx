import { TableMobileData } from "@/components/table/tableMobileData";
import { TableData } from "./tableData";
import { TableFooter } from "./tableFooter";
export * from "./table";
export * from "./responsiveTableCustom";
import { TableRoot } from "./tableRoot";
import { TableSkeleton } from "./tableSkeleton";

export const TableCustom = {
	Root: TableRoot,
	Data: TableData,
	MobileData: TableMobileData,
	Footer: TableFooter,
	Skeleton: TableSkeleton,
};
