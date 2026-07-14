import { cn } from "@/app/utils/cn";
import {
	AlertCircle,
	CheckCircle2,
	Circle,
	CircleDashed,
	Clock,
	Code2,
	PauseCircle,
	Search,
	XCircle,
} from "lucide-react";
import React from "react";

export type ComboboxStatus =
	| "FINALIZADO"
	| "FINALIZADA"
	| "ANDAMENTO"
	| "ANALISE"
	| "PENDENTE"
	| "PENDENTE_EXECUCAO"
	| "PENDENTE_APROVACAO"
	| "PENDENTE_REQUISITOS"
	| "APROVADO"
	| "APROVADA"
	| "RECUSADO"
	| "CANCELADA"
	| "CANCELADO"
	| "REPROVADA"
	| "REJEITADA"
	| "ATIVO"
	| "ATIVA"
	| "DESATIVADO"
	| "DESATIVADA"
	| "NÃO_INFORMADO"
	| "NOVA"
	| "OCORRENCIA"
	| "ENTREGUE"
	| "EM_ANDAMENTO"
	| "AGUARDANDO_CHECAGEM"
	| "RESOLVIDA"
	| "CONCLUIDA"
	| "NAO_INICIADA"
	| "EXPIRADA"
	| "EM_ESPERA"
	| "CORRETO"
	| "INCORRETO"
	| "VAZIO";

type Size = "sm" | "md" | "lg";
type Mode = "full" | "icon";

type StatusProps = {
	status?: ComboboxStatus;
	size?: Size;
	className?: string;
	mode?: Mode;
};

const sizeConfig: Record<Size, { icon: number; text: string; padding: string }> = {
	sm: { icon: 14, text: "text-xs", padding: "px-2 py-1" },
	md: { icon: 16, text: "text-sm", padding: "px-3 py-1.5" },
	lg: { icon: 18, text: "text-base", padding: "px-4 py-2" },
};

type StatusConfigItem = {
	statusName: string;
	color: string;
	iconColor?: string;
	icon: (iconSize: number) => React.ReactNode;
};

export const statusMap: Record<ComboboxStatus, StatusConfigItem> = {
	EM_ANDAMENTO: {
		statusName: "Em andamento",
		color: "border-info/25 bg-info/10 text-info",
		iconColor: "text-info",
		icon: (s) => <CircleDashed size={s} />,
	},
	ANDAMENTO: {
		statusName: "Andamento",
		color: "border-warning/30 bg-warning/15 text-warning-foreground",
		iconColor: "text-warning-foreground",
		icon: (s) => <CircleDashed size={s} />,
	},
	ANALISE: {
		statusName: "Em análise",
		color: "bg-blue-500",
		icon: (s) => <AlertCircle className="text-background" size={s} />,
	},

	PENDENTE: {
		statusName: "Pendente",
		color: "bg-yellow-500",
		icon: (s) => <Clock className="text-background" size={s} />,
	},
	PENDENTE_EXECUCAO: {
		statusName: "Pend. Execução",
		color: "bg-purple-500",
		icon: (s) => <Clock className="text-background" size={s} />,
	},
	PENDENTE_APROVACAO: {
		statusName: "Pend. Aprovação",
		color: "bg-yellow-500",
		icon: (s) => <Clock className="text-background" size={s} />,
	},
	PENDENTE_REQUISITOS: {
		statusName: "Pend. Requisitos",
		color: "bg-purple-500",
		icon: (s) => <Clock className="text-background" size={s} />,
	},

	APROVADO: {
		statusName: "Aprovado",
		color: "bg-blue-500",
		icon: (s) => <CheckCircle2 className="text-background" size={s} />,
	},
	APROVADA: {
		statusName: "Aprovada",
		color: "bg-blue-500",
		icon: (s) => <CheckCircle2 className="text-background" size={s} />,
	},

	FINALIZADO: {
		statusName: "Finalizado",
		color: "bg-green-500",
		icon: (s) => <CheckCircle2 className="text-background" size={s} />,
	},
	FINALIZADA: {
		statusName: "Finalizada",
		color: "bg-green-500",
		icon: (s) => <CheckCircle2 className="text-background" size={s} />,
	},
	RESOLVIDA: {
		statusName: "Resolvida",
		color: "bg-green-500",
		icon: (s) => <CheckCircle2 className="text-background" size={s} />,
	},
	CONCLUIDA: {
		statusName: "Concluída",
		color: "bg-green-500",
		icon: (s) => <CheckCircle2 className="text-background" size={s} />,
	},
	ENTREGUE: {
		statusName: "Entregue",
		color: "bg-green-500",
		icon: (s) => <CheckCircle2 className="text-background" size={s} />,
	},

	RECUSADO: {
		statusName: "Recusado",
		color: "bg-red-500",
		icon: (s) => <XCircle className="text-background" size={s} />,
	},
	CANCELADA: {
		statusName: "Cancelada",
		color: "bg-red-500",
		icon: (s) => <XCircle className="text-background" size={s} />,
	},
	CANCELADO: {
		statusName: "Cancelado",
		color: "bg-red-500",
		icon: (s) => <XCircle className="text-background" size={s} />,
	},
	REPROVADA: {
		statusName: "Reprovada",
		color: "bg-red-500",
		icon: (s) => <XCircle className="text-background" size={s} />,
	},
	REJEITADA: {
		statusName: "Rejeitada",
		color: "bg-red-500",
		icon: (s) => <XCircle className="text-background" size={s} />,
	},

	ATIVO: {
		statusName: "Ativo",
		color: "bg-blue-500",
		icon: (s) => <CheckCircle2 className="text-background" size={s} />,
	},
	ATIVA: {
		statusName: "Ativa",
		color: "bg-blue-500",
		icon: (s) => <CheckCircle2 className="text-background" size={s} />,
	},
	DESATIVADO: {
		statusName: "Desativado",
		color: "bg-gray-500",
		icon: (s) => <PauseCircle className="text-background" size={s} />,
	},
	DESATIVADA: {
		statusName: "Desativada",
		color: "bg-gray-500",
		icon: (s) => <PauseCircle className="text-background" size={s} />,
	},

	NÃO_INFORMADO: {
		statusName: "Não informado",
		color: "bg-gray-400",
		icon: (s) => <Circle className="text-background" size={s} />,
	},
	VAZIO: {
		statusName: "Vazio",
		color: "bg-gray-400",
		icon: (s) => <Circle className="text-background" size={s} />,
	},

	NOVA: {
		statusName: "Nova",
		color: "bg-blue-500",
		icon: (s) => <Code2 className="text-background" size={s} />,
	},
	OCORRENCIA: {
		statusName: "Ocorrência",
		color: "bg-orange-500",
		icon: (s) => <AlertCircle className="text-background" size={s} />,
	},
	AGUARDANDO_CHECAGEM: {
		statusName: "Aguardando checagem",
		color: "bg-yellow-500",
		icon: (s) => <Search className="text-background" size={s} />,
	},

	NAO_INICIADA: {
		statusName: "Não iniciada",
		color: "bg-red-500",
		icon: (s) => <AlertCircle className="text-background" size={s} />,
	},
	EXPIRADA: {
		statusName: "Expirada",
		color: "bg-red-500",
		icon: (s) => <AlertCircle className="text-background" size={s} />,
	},
	EM_ESPERA: {
		statusName: "Em espera",
		color: "bg-gray-500",
		icon: (s) => <PauseCircle className="text-background" size={s} />,
	},

	CORRETO: {
		statusName: "Correto",
		color: "bg-green-500",
		icon: (s) => <CheckCircle2 className="text-background" size={s} />,
	},
	INCORRETO: {
		statusName: "Incorreto",
		color: "bg-red-500",
		icon: (s) => <XCircle className="text-background" size={s} />,
	},
};

export const StatusProject: React.FC<StatusProps> = ({ status, size = "sm", className, mode = "full" }) => {
	const cfg = sizeConfig[size];

	const currentStatus = (status && statusMap[status]) || statusMap["NÃO_INFORMADO"];
	const statusTone =
		status && ["FINALIZADO", "FINALIZADA", "RESOLVIDA", "CONCLUIDA", "ENTREGUE", "CORRETO"].includes(status)
			? "border-success/25 bg-success/10 text-success"
			: status &&
				  [
						"RECUSADO",
						"CANCELADA",
						"CANCELADO",
						"REPROVADA",
						"REJEITADA",
						"NAO_INICIADA",
						"EXPIRADA",
						"INCORRETO",
				  ].includes(status)
				? "border-destructive/25 bg-destructive/10 text-destructive"
				: status && ["PENDENTE", "PENDENTE_APROVACAO", "AGUARDANDO_CHECAGEM", "ANDAMENTO"].includes(status)
					? "border-warning/30 bg-warning/15 text-warning-foreground"
					: status && ["PENDENTE_EXECUCAO", "PENDENTE_REQUISITOS", "OCORRENCIA"].includes(status)
						? "border-violet/25 bg-violet/10 text-violet"
						: status && ["DESATIVADO", "DESATIVADA", "EM_ESPERA", "VAZIO", "NÃO_INFORMADO"].includes(status)
							? "border-border bg-secondary text-secondary-foreground"
							: "border-info/25 bg-info/10 text-info";

	return (
		<span
			className={cn(
				"inline-flex items-center gap-2 rounded-full border font-medium",
				statusTone,
				cfg.padding,
				cfg.text,
				className,
			)}
			title={currentStatus.statusName}
		>
			{currentStatus.icon(cfg.icon)}
			{mode === "full" && <span className="text-nowrap">{currentStatus.statusName}</span>}
		</span>
	);
};

