import { cn } from "@/app/utils/cn";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent button shadow-sm shadow-foreground/5 ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-60 disabled:shadow-none cursor-pointer box-border",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary-shadow active:bg-blue-shadow",
				destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-shadow",
				outline: "border-border bg-input text-foreground hover:border-locked hover:bg-muted disabled:opacity-60",
				input: "border-input-border bg-input text-foreground hover:border-ring hover:bg-background disabled:opacity-60",
				secondary: "border-border bg-secondary text-secondary-foreground hover:bg-accent",
				ghost:
					"border-transparent text-foreground shadow-none hover:border-border hover:bg-accent hover:text-accent-foreground",
				link: "bg-transparent border-0 p-0 h-auto text-primary no-underline hover:text-primary/80 shadow-none",
				error: "border-destructive/45 bg-destructive/5 text-destructive hover:bg-destructive/10",
				sidebar:
					"justify-start border-transparent text-left shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
			},
			size: {
				default: "h-10 px-6 [&_svg:not([class*='size-'])]:size-4",
				sm: "h-9 px-4 text-xs [&_svg:not([class*='size-'])]:size-4",
				lg: "h-12 px-7 text-sm",
				// icon: "h-8 w-8",
				link: "h-auto p-0",
				icon: "w-9 h-9 size-9 in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-4",
				"icon-xs":
					"w-6 h-6 size-6  rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
				"icon-sm":
					"w-7 h-7 size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-4",
				"icon-lg": "w-9 h-9 size-9 [&_svg:not([class*='size-'])]:size-4",
			},
			isBoxShadow: {
				true: "box",
			},
			isFullWidth: {
				true: "w-full",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
			isBoxShadow: false,
		},
	},
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, isBoxShadow, isFullWidth, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, isBoxShadow, isFullWidth }), className)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
