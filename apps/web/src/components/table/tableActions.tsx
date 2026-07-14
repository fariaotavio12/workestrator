import { Button } from "@/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/dropdown";
import type { Row } from "@tanstack/react-table";
import { EllipsisVertical } from "lucide-react";
import { Link } from "react-router-dom";

export type ColumnAction = {
	label?: string;
	onClick?: (row: any) => void;
	variant?: "default" | "destructive" | "success" | "warning";
	separator?: boolean;
	icon?: React.ReactNode;
	conditionalRenderingFunctions?: ((row: any) => boolean)[];
	link?: (row: any) => string;
};

type ColumnActionDropdownProps = {
	columnActions?: ColumnAction[];
	row: Row<any>;
	subtle?: boolean;
};

export const TableActionsDropdown = ({ columnActions, row }: ColumnActionDropdownProps) => {
	const filteredActions = columnActions?.filter((action) => {
		if (!action.conditionalRenderingFunctions) return true;
		return action.conditionalRenderingFunctions.every((fn) => fn(row.original));
	});

	if (filteredActions?.length == 0) return null;

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button size={"icon"} variant={"ghost"}>
					<EllipsisVertical
					// className={cn(
					// 	"inline-block h-4 w-4",
					// 	subtle && "text-muted-foreground/50 group-hover:text-foreground",
					// )}
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="center"
				sideOffset={8} // distância vertical/horizontal do assistenteão
				alignOffset={-20} // distância extra de alinhamento horizontal
				className="mr-4"
			>
				{filteredActions?.map((action, index) => (
					<>
						{action.separator && <DropdownMenuSeparator />}
						<DropdownMenuItem variant={action.variant}>
							{action.link != undefined ? (
								<Link className="flex w-full items-center gap-2 hover:cursor-pointer" to={action.link(row)}>
									{action.icon}
									{action.label}
								</Link>
							) : (
								<div
									className="flex w-full items-center gap-2 hover:cursor-pointer"
									key={index}
									onClick={() => action.onClick?.(row)}
								>
									{action.icon}
									{action.label}
								</div>
							)}
						</DropdownMenuItem>
					</>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

