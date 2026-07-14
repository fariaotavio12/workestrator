import { cn } from "@/app/utils/cn";

type LoadingSpinnerProps = {
	size?: "xs" | "sm" | "md" | "lg";
	containerClassName?: React.HTMLAttributes<HTMLDivElement>["className"];
	className?: React.HTMLAttributes<HTMLDivElement>["className"];
};

const SIZE_MAP: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
	xs: "h-4 w-4",
	sm: "h-6 w-6",
	md: "h-8 w-8",
	lg: "h-12 w-12",
};

export const LoadingSpinner = ({ size = "md", containerClassName, className }: LoadingSpinnerProps) => (
	<div className={cn("flex h-64 items-center justify-center", containerClassName)}>
		<div className={cn(SIZE_MAP[size], "border-muted-foreground animate-spin rounded-full border-2", className, "border-t-transparent")} role="status" />
	</div>
);
