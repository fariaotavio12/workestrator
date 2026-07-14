import * as React from "react";

import type { ApiRequestSortParam } from "@/app/api/types/api-request";
import { cn } from "@/app/utils/cn";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useCallback, type ReactNode } from "react";

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
	({ className, ...props }, ref) => (
		<table ref={ref} className={cn("relative w-full caption-bottom text-sm", className)} {...props} />
	),
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
	({ className, ...props }, ref) => (
		<thead ref={ref} className={cn("bg-background [&_tr]:border-b", className)} {...props} />
	),
);
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
	({ className, ...props }, ref) => (
		<tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
	),
);
TableBody.displayName = "TableBody";

export const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
	({ className, ...props }, ref) => <tfoot ref={ref} className={cn("bg-background border-t", className)} {...props} />,
);
TableFooter.displayName = "TableFooter";

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
	({ className, ...props }, ref) => (
		<tr
			ref={ref}
			className={cn(
				"hover:bg-accent/60 data-[state=selected]:bg-accent/70 h-0 min-h-0 border-b transition-colors",
				className,
			)}
			{...props}
		/>
	),
);
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
	({ className, ...props }, ref) => (
		<th
			ref={ref}
			className={cn(
				"text-muted-foreground h-10 px-4 text-left align-middle text-xs font-semibold uppercase [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		/>
	),
);
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
	({ className, ...props }, ref) => (
		<td ref={ref} className={cn("px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
	),
);
TableCell.displayName = "TableCell";

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
	({ className, ...props }, ref) => <caption ref={ref} className={cn("mt-4 text-sm", className)} {...props} />,
);
TableCaption.displayName = "TableCaption";

type DeepKeyOf<T> = T extends object
	? {
			[K in keyof T]: T[K] extends object ? `${string & K}.${string & DeepKeyOf<T[K]>}` | (string & K) : string & K;
		}[keyof T]
	: never;

type TableHeaderProps = {
	position?: "start" | "center" | "end";
	children?: ReactNode;
	label?: string;
};

export const TableHeaderV2 = ({ position, children, label }: TableHeaderProps) => {
	return (
		<div
			className={cn(
				"text-muted-foreground text-xs font-semibold uppercase",
				position === "start" ? "ml-3 text-left" : "",
				position === "center" ? "text-center" : "",
				position === "end" ? "mr-3 text-right" : "",
			)}
		>
			{label ?? children}
		</div>
	);
};

type SortableTHProps<T> = React.HTMLAttributes<HTMLDivElement> & {
	sortField: DeepKeyOf<T>;
	value?: ApiRequestSortParam<T> | undefined;
	onSortChange: (next: ApiRequestSortParam<T> | undefined) => void;
	children?: ReactNode;
};

const nextDirection = (current?: "asc" | "desc") => {
	if (current === "asc") return "desc";
	if (current === "desc") return undefined;
	return "asc";
}

export const SortableTH = <T,>({
	sortField,
	value,
	onSortChange,
	children,
	className,
	...props
}: SortableTHProps<T>) => {
	const isActive = value?.by === sortField;
	const direction = isActive ? value?.direction : undefined;

	const handleToggle = useCallback(() => {
		const next = nextDirection(direction);
		onSortChange(next ? { by: sortField as keyof T, direction: next } : undefined);
	}, [direction, onSortChange, sortField]);

	return (
		<div
			role="button"
			onClick={handleToggle}
			className={cn(
				"hover:bg-accent hover:text-foreground flex h-4/6 justify-between hover:cursor-pointer",
				"group inline-flex w-full items-center gap-1 rounded-md px-2 py-1 select-none",
				"transition-colors duration-150",
				"focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
				isActive ? "text-foreground" : "text-foreground/70",
				className,
			)}
			{...props}
		>
			{children}
			<span>
				{direction === "asc" && <ChevronUpIcon className="animate-in fade-in-0 zoom-in-95 mx-1 h-4 w-3" />}
				{direction === "desc" && <ChevronDownIcon className="animate-in fade-in-0 zoom-in-95 mx-1 h-4 w-3" />}
				{!direction && <CaretSortIcon className="h-4 w-4" />}
			</span>
		</div>
	);
};

type TableCellProps = {
	children: ReactNode;
	position?: "start" | "center" | "end";
	className?: string;
};

export const TableCellV2 = ({ position, children, className }: TableCellProps) => {
	return (
		<div className={cn("text-sm", position === "start" ? "ml-3" : position === "end" ? "mr-3" : "", className)}>
			{children}
		</div>
	);
};
