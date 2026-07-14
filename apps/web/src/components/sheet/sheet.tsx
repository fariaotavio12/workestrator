import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, X } from "lucide-react";
import * as React from "react";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
	React.ComponentRef<typeof SheetPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Overlay
		className={cn(
			"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-49 bg-black/35 backdrop-blur-[2px]",
			className,
		)}
		{...props}
		ref={ref}
	/>
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
	"fixed z-50 bg-background p-6 shadow-[0_12px_32px_rgba(0,0,0,0.16)] transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
	{
		variants: {
			side: {
				top: "border-border inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
				bottom:
					"border-border inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
				left: "border-border inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
				right:
					"border-border inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
			},
		},
		defaultVariants: {
			side: "right",
		},
	},
);

type SheetContentProps = {
	noClose?: boolean;
	overlayClassName?: string;
} & React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> &
	VariantProps<typeof sheetVariants>;

const SheetContent = React.forwardRef<React.ComponentRef<typeof SheetPrimitive.Content>, SheetContentProps>(
	({ side = "right", className, children, noClose, overlayClassName, ...props }, ref) => (
		<SheetPortal>
			<SheetOverlay className={overlayClassName} />
			<SheetPrimitive.Content
				ref={ref}
				className={cn(sheetVariants({ side }), className)}
				onPointerDownOutside={(e) => {
					const target = e.target as HTMLElement;
					if (target?.closest("[data-sonner-toaster], [data-sonner-toast]")) {
						e.preventDefault();
					}
				}}
				{...props}
			>
				{children}
				{!noClose && (
					<SheetPrimitive.Close className="text-muted-foreground hover:bg-muted hover:text-foreground focus:ring-ring/20 absolute top-5 right-5 z-10 flex size-9 items-center justify-center rounded-full transition-colors focus:ring-2 focus:outline-none disabled:pointer-events-none">
						<X className="h-4 w-4" />
						<span className="sr-only">Close</span>
					</SheetPrimitive.Close>
				)}
			</SheetPrimitive.Content>
		</SheetPortal>
	),
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("flex flex-col gap-2 text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

type SheetSectionProps = { label: string } & React.HTMLAttributes<HTMLDivElement>;

/** Agrupa campos do corpo de um `AppSheet` sob um rótulo com divisória — quebra formulários longos em blocos. */
const SheetSection = ({ label, className, children, ...props }: SheetSectionProps) => (
	<div className={cn("flex flex-col gap-3", className)} {...props}>
		<div className="flex items-center gap-3">
			<span className="text-muted-foreground shrink-0 text-xs font-semibold tracking-wide uppercase">{label}</span>
			<div className="border-border h-px flex-1" />
		</div>
		<div className="flex flex-col gap-4">{children}</div>
	</div>
);
SheetSection.displayName = "SheetSection";

const SheetTitle = React.forwardRef<
	React.ComponentRef<typeof SheetPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Title
		ref={ref}
		className={cn("text-foreground text-lg leading-[1.2] font-semibold", className)}
		{...props}
	/>
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
	React.ComponentRef<typeof SheetPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
	<SheetPrimitive.Description
		ref={ref}
		className={cn("text-muted-foreground text-sm leading-6", className)}
		{...props}
	/>
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

type AppSheetProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	children: React.ReactNode;
	loading?: boolean;
	footer?: React.ReactNode;
	actionLabel?: string;
	actionDisabled?: boolean;
	showCancel?: boolean;
	showFooter?: boolean;
	contentClassName?: string;
	bodyClassName?: string;
	headerClassName?: string;
	descriptionClassName?: string;
	overlayClassName?: string;
	headerLeading?: React.ReactNode;
	headerTrailing?: React.ReactNode;
	onAction?: () => void;
};

const AppSheet = ({
	open,
	onOpenChange,
	trigger,
	title,
	description,
	children,
	loading,
	footer,
	actionLabel,
	actionDisabled,
	showCancel = true,
	showFooter = true,
	contentClassName,
	bodyClassName,
	headerClassName,
	descriptionClassName,
	overlayClassName,
	headerLeading,
	headerTrailing,
	onAction,
}: AppSheetProps) => (
	<Sheet open={open} onOpenChange={onOpenChange}>
		{trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
		<SheetContent
			side="right"
			className={cn("flex w-full flex-col p-0 sm:max-w-xl", contentClassName)}
			overlayClassName={overlayClassName}
		>
			<SheetHeader className={cn("border-border shrink-0 border-b p-6 pr-16", headerClassName)}>
				<div className="flex w-full items-start justify-between gap-6">
					<div className="flex min-w-0 items-center gap-4">
						{headerLeading}
						<div className="min-w-0">
							<SheetTitle>{title}</SheetTitle>
							{description && <SheetDescription className={descriptionClassName}>{description}</SheetDescription>}
						</div>
					</div>
					{headerTrailing}
				</div>
			</SheetHeader>

			<div className={cn("flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6", bodyClassName)}>
				{loading ? (
					<div className="flex flex-1 items-center justify-center">
						<Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
					</div>
				) : (
					children
				)}
			</div>

			{showFooter && (
				<div className="border-border bg-background flex justify-end gap-3 border-t px-6 py-5 sm:px-8">
					{footer ?? (
						<>
							{showCancel && (
								<SheetClose asChild>
									<Button variant="outline" size="sm">
										Cancelar
									</Button>
								</SheetClose>
							)}
							{onAction && (
								<Button size="sm" disabled={actionDisabled || loading} onClick={onAction}>
									{actionLabel ?? "Confirmar"}
								</Button>
							)}
						</>
					)}
				</div>
			)}
		</SheetContent>
	</Sheet>
);

export {
	AppSheet,
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetSection,
	SheetTitle,
	SheetTrigger,
};
