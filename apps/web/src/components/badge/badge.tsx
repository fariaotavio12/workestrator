import { cn } from "@/app/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

const badgeVariants = cva(
	"inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-normal leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring/20 focus:ring-offset-0",
	{
		variants: {
			variant: {
				default: "border-primary bg-primary text-primary-foreground",
				secondary: "border-border bg-muted text-foreground hover:bg-accent",
				destructive: "border-destructive bg-destructive text-destructive-foreground",
				outline: "border-border bg-background text-foreground",
				success: "border-primary bg-primary text-primary-foreground",
				violet: "border-violet bg-violet text-violet-foreground",
				warning: "border-border bg-muted text-foreground",
				info: "border-primary bg-primary text-primary-foreground",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

const Badge = ({ className, variant, ...props }: BadgeProps) => (
	<div className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
