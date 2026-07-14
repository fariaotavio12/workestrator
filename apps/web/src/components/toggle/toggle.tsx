"use client";

import { cn } from "@/app/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";
import * as React from "react";

const toggleVariants = cva(
	"hover:text-foreground aria-pressed:bg-accent focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[state=on]:bg-accent data-[state=on]:text-accent-foreground text-button-sm gap-1 rounded-lg transition-all [&_svg:not([class*='size-'])]:size-4 group/toggle hover:bg-accent inline-flex items-center justify-center whitespace-nowrap outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline: "border-border bg-card hover:bg-accent border shadow-sm shadow-foreground/5",
			},
			size: {
				default: "h-8 min-w-8 px-2",
				sm: "text-caption-sm h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-1.5",
				lg: "h-9 min-w-9 px-2.5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Toggle({
	className,
	variant = "default",
	size = "default",
	...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive.Root data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />
	);
}

export { Toggle, toggleVariants };
