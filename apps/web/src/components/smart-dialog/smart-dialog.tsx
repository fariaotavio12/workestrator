import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/dialog/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

type Placement = "center" | "right" | "left";

export const SmartOverlayClose = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Close>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, children, ...props }, ref) => (
	<DialogPrimitive.Close
		ref={ref}
		className={cn(
			"rounded-sm opacity-70 transition-opacity hover:opacity-100",
			"focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none",
			className,
		)}
		{...props}
	>
		{children}
	</DialogPrimitive.Close>
));
SmartOverlayClose.displayName = "SmartOverlayClose";

type SmartOverlayProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: React.ReactNode;
	title?: React.ReactNode;
	description?: React.ReactNode;
	children: React.ReactNode;
	forcePlacement?: Placement;
	headerIcon?: React.ReactNode;
	size?: "sm" | "md" | "lg" | "xl" | null;
	className?: string;
	footer?: React.ReactNode;
};

export const SmartOverlay = ({
	open,
	onOpenChange,
	trigger,
	title,
	description,
	headerIcon,
	children,
	forcePlacement = "center",
	size = "md",
	className,
	footer,
}: SmartOverlayProps) => {
	const hasHeader = Boolean(title);
	const hasBody = children !== null && children !== undefined && children !== false;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}

			<DialogContent
				className={cn("bg-background flex flex-col gap-0 overflow-hidden p-0", className)}
				effectivePlacement={forcePlacement}
				size={size}
				showCloseButton={false}
			>
				{hasHeader ? (
					<div className="flex shrink-0 items-start justify-between gap-3 border-b px-5 pt-5 pb-4">
						<div className="flex min-w-0 items-start gap-2">
							{headerIcon && <span className="text-muted-foreground mt-0.5 shrink-0 [&>svg]:size-5">{headerIcon}</span>}
							<div className="min-w-0">
								<DialogTitle className="text-base leading-5 font-semibold">{title}</DialogTitle>
								{description && (
									<DialogDescription className="text-muted-foreground mt-1 text-sm leading-relaxed">
										{description}
									</DialogDescription>
								)}
							</div>
						</div>
						<DialogClose asChild>
							<Button variant="ghost" size="icon-sm" className="-mt-1 -mr-1 shrink-0">
								<XIcon size={16} strokeWidth={1.5} />
								<span className="sr-only">Fechar</span>
							</Button>
						</DialogClose>
					</div>
				) : (
					<>
						<DialogTitle className="sr-only">Janela</DialogTitle>
						<DialogClose asChild>
							<Button variant="ghost" size="icon-sm" className="absolute top-3 right-3 z-10">
								<XIcon size={16} strokeWidth={1.5} />
								<span className="sr-only">Fechar</span>
							</Button>
						</DialogClose>
					</>
				)}

				{hasBody && <div className={cn("min-h-0 flex-1 overflow-y-auto", hasHeader && "px-5 py-4")}>{children}</div>}

				{footer && <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4">{footer}</div>}
			</DialogContent>
		</Dialog>
	);
};
