import { cn } from "@/app/utils/cn";
import type { HTMLAttributes } from "react";

export const TableRoot = ({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) => {
	return (
		<div
			className={cn(
				"border-border/80 bg-background shadow-foreground/5 flex w-full flex-col overflow-hidden rounded-lg border shadow-sm",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
};
