import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";

export type ToastAction = { label: string; onClick: () => void };

type ToastProps = {
	title?: string;
	message: string;
	type?: "error" | "success" | "warning" | "info";
	action?: ToastAction;
	onClose?: () => void;
};

const Toast = ({ title, message, type, action, onClose }: ToastProps) => {
	const getTone = (): { icon: ReactNode; title: string; accent: string; iconClassName: string } => {
		switch (type) {
			case "success":
				return {
					icon: <CheckCircle2 className="size-4" />,
					title: "Tudo certo",
					accent: "bg-success",
					iconClassName: "border-success/20 bg-success/10 text-success",
				};
			case "error":
				return {
					icon: <AlertCircle className="size-4" />,
					title: "Algo saiu do fluxo",
					accent: "bg-destructive",
					iconClassName: "border-destructive/20 bg-destructive/10 text-destructive",
				};
			case "warning":
				return {
					icon: <TriangleAlert className="size-4" />,
					title: "Atenção",
					accent: "bg-warning",
					iconClassName: "border-warning/30 bg-warning/15 text-warning",
				};
			case "info":
				return {
					icon: <Info className="size-4" />,
					title: "Atualização",
					accent: "bg-info",
					iconClassName: "border-info/20 bg-info/10 text-info",
				};
			default:
				return {
					icon: <Info className="size-4" />,
					title: "Aviso",
					accent: "bg-primary",
					iconClassName: "border-primary/20 bg-primary/10 text-primary",
				};
		}
	};

	const tone = getTone();

	return (
		<div
			className={cn(
				"border-border/80 bg-card text-card-foreground relative grid w-[min(24rem,calc(100vw-2rem))] grid-cols-[auto_1fr_auto] gap-x-3 overflow-hidden rounded-xl border p-3.5 shadow-xl backdrop-blur",
			)}
		>
			<div className={cn("absolute inset-y-0 left-0 w-1", tone.accent)} />
			<div className={cn("mt-0.5 flex size-8 items-center justify-center rounded-lg border", tone.iconClassName)}>
				{tone.icon}
			</div>

			<div className="min-w-0">
				<p className="text-sm leading-5 font-semibold">{title ?? tone.title}</p>
				<p className="text-muted-foreground mt-0.5 text-sm leading-5 whitespace-pre-wrap">{message}</p>
				{action && (
					<Button
						size="sm"
						variant="outline"
						className="mt-2"
						onClick={() => {
							action.onClick();
							onClose?.();
						}}
					>
						{action.label}
					</Button>
				)}
			</div>

			<div className="flex justify-end self-start">
				<Button
					className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 rounded-full"
					variant="ghost"
					size="icon-sm"
					aria-label="Fechar notificação"
					onClick={onClose}
				>
					<X className="size-4" />
				</Button>
			</div>
		</div>
	);
};

export { Toast };
