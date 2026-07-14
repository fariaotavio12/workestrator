import { cn } from "@/app/utils/cn";
import { CheckCircle2, CircleDashed, XCircle } from "lucide-react";

export type ConnectionStatus = "connected" | "failed" | "not_configured";

const CONFIG: Record<ConnectionStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
	connected: { label: "Conectado", className: "border-success/25 bg-success/10 text-success", icon: CheckCircle2 },
	failed: { label: "Falha na conexão", className: "border-destructive/25 bg-destructive/10 text-destructive", icon: XCircle },
	not_configured: {
		label: "Não configurado",
		className: "border-border bg-muted text-muted-foreground",
		icon: CircleDashed,
	},
};

type Props = {
	status: ConnectionStatus;
	className?: string;
};

export const ConnectionStatusPill = ({ status, className }: Props) => {
	const { label, className: statusClassName, icon: Icon } = CONFIG[status];
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
				statusClassName,
				className,
			)}
		>
			<Icon className="size-3.5" />
			{label}
		</span>
	);
};
