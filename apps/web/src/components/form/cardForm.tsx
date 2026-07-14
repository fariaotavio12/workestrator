import { cn } from "@/app/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";

const cardFormVariants = cva(
	"bg-card text-card-foreground overflow-hidden rounded-lg border shadow-sm shadow-foreground/5",
	{
		variants: {
			isFirst: {
				true: "",
				false: "",
			},
			isLast: {
				true: "",
				false: "",
			},
		},
		defaultVariants: {
			isFirst: false,
			isLast: false,
		},
	},
);

const wrapperVariants = cva("flex gap-5 p-5 lg:p-6", {
	variants: {
		layout: {
			side: "flex-col md:flex-row",
			below: "flex-col",
		},
	},
	defaultVariants: {
		layout: "side",
	},
});

const headerVariants = cva("flex flex-col gap-3", {
	variants: {
		layout: {
			side: "md:w-1/4",
			below: "",
		},
	},
	defaultVariants: {
		layout: "side",
	},
});

const bodyVariants = cva("flex flex-row flex-wrap items-start gap-4", {
	variants: {
		layout: {
			side: "md:w-3/4 md:pl-8",
			below: "",
		},
	},
	defaultVariants: {
		layout: "side",
	},
});

export type CardFormProps = HTMLAttributes<HTMLDivElement> &
	VariantProps<typeof cardFormVariants> &
	VariantProps<typeof wrapperVariants> & {
		title: string;
		caption: string;
		icon: ReactNode;
		buttons?: ReactNode;
		layout?: "side" | "below";
	};

export const CardForm = ({
	className,
	title,
	caption,
	icon,
	buttons,
	isFirst = false,
	isLast = false,
	layout = "side",
	children,
	...props
}: CardFormProps) => {
	return (
		<div className={cn(cardFormVariants({ isFirst, isLast }), className)} {...props}>
			<div className={wrapperVariants({ layout })}>
				<div className={headerVariants({ layout })}>
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 text-primary border-primary/20 flex h-9 w-9 items-center justify-center rounded-lg border">
							{icon}
						</div>
						<h2 className="text-base leading-tight font-semibold">{title}</h2>
					</div>
					<p className="text-muted-foreground text-sm leading-relaxed">{caption}</p>
				</div>

				<div className={bodyVariants({ layout })}>{children}</div>
			</div>

			{buttons && <div className="bg-muted/25 mt-auto flex border-t px-5 py-4">{buttons}</div>}
		</div>
	);
}
