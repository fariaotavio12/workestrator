import { cn } from "@/app/utils/cn";
import { Label } from "@/components/label";
import type { ReactNode } from "react";

export type FieldWrapperProps = {
	label?: string;
	htmlFor?: string;
	description?: string;
	error?: string | undefined;
	className?: string;
	children: ReactNode;
	showCharCounter?: boolean;
	maxLength?: number;
	length?: number;
};

export const FieldWrapper = ({
	label,
	htmlFor,
	description,
	error,
	className,
	children,
	showCharCounter,
	maxLength = 0,
	length = 0,
}: FieldWrapperProps) => {
	return (
		<div className={cn("relative flex flex-col gap-2 overflow-visible", className)}>
			{label && <Label htmlFor={htmlFor}>{label}</Label>}
			{children}
			{description && !error && <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>}
			{(error != undefined || showCharCounter) && (
				<div className="flex flex-row justify-between">
					{error && <p className="text-destructive text-xs leading-relaxed">{error}</p>}
					{showCharCounter && <p className="text-muted-foreground ml-auto text-xs">{`${length} / ${maxLength}`}</p>}
				</div>
			)}
		</div>
	);
};
