import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

import type { OverlayMode } from "@/app/providers/ui-overlay-preference";
import { cn } from "@/app/utils/cn";
import { cva } from "class-variance-authority";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/45 backdrop-blur-sm",
				className,
			)}
			{...props}
		/>
	);
}

type Placement = "center" | "right" | "left";

const contentVariants = cva(
	"fixed z-[60] bg-background text-foreground shadow-xl shadow-foreground/10 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out flex flex-col",
	{
		variants: {
			placement: {
				center:
					"left-1/2 top-1/2 w-[calc(100vw-1rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-5 " +
					"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
				right:
					"right-0 top-0 h-full w-[calc(100vw-10%)] sm:w-[calc(100vw-20%)] max-w-md border-l p-5 " +
					"data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
				left:
					"left-0 top-0 h-full  w-[calc(100vw-10%)] sm:w-[calc(100vw-20%)] max-w-md border-r p-5 " +
					"data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
			},
			size: {
				sm: "",
				md: "",
				lg: "",
				xl: "",
			},
		},
		compoundVariants: [
			{ placement: "center", size: "sm", className: "max-w-sm" },
			{ placement: "center", size: "md", className: "max-w-md" },
			{ placement: "center", size: "lg", className: "max-w-2xl" },
			{ placement: "center", size: "xl", className: "max-w-4xl" },

			{ placement: "left", size: "sm", className: "max-w-sm" },
			{ placement: "left", size: "md", className: "max-w-md" },
			{ placement: "left", size: "lg", className: "max-w-2xl" },
			{ placement: "left", size: "xl", className: "max-w-4xl" },

			{ placement: "right", size: "sm", className: "max-w-sm" },
			{ placement: "right", size: "md", className: "max-w-md" },
			{ placement: "right", size: "lg", className: "max-w-2xl" },
			{ placement: "right", size: "xl", className: "max-w-4xl" },
		],
		defaultVariants: { placement: "center", size: "md" },
	},
);

function DialogContent({
	className,
	children,
	effectivePlacement,
	showCloseButton = true,
	size = "md",
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	showCloseButton?: boolean;
	mode?: OverlayMode;
	effectivePlacement?: Placement;
	size?: "sm" | "md" | "lg" | "xl" | null;
}) {
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay />
			<DialogPrimitive.Content
				className={cn(contentVariants({ placement: effectivePlacement, size }), className)}
				onInteractOutside={(e) => {
					const target = e.target as HTMLElement | null;
					if (target?.closest("[data-sonner-toaster]")) {
						e.preventDefault();
					}
					if (target?.closest("[tabs-trigger]")) {
						e.preventDefault();
					}
					if (target?.closest("[tabs-list]")) {
						e.preventDefault();
					}
				}}
				onPointerDownOutside={(e) => {
					const target = e.target as HTMLElement | null;
					if (target?.closest("[data-sonner-toaster]")) {
						e.preventDefault();
					}
					if (target?.closest("[tabs-trigger]")) {
						e.preventDefault();
					}
					if (target?.closest("[tabs-list]")) {
						e.preventDefault();
					}
				}}
				data-slot="dialog-content"
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:bg-accent absolute top-4 right-4 rounded-lg p-1 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
					>
						<XIcon size={16} />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 pr-8 text-left", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn("flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end", className)}
			{...props}
		/>
	);
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("text-lg leading-tight font-semibold", className)}
			{...props}
		/>
	);
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn("text-muted-foreground text-sm leading-relaxed", className)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
