import { cn } from "@/app/utils/cn";
import { Button, Skeleton, Typography } from "@/components";
import { renderSquadIcon } from "@/components/orchestrator/icon-picker/render-squad-icon";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { ArrowLeft, Bot, History, Pencil, Play, Plus, Share2, Users } from "lucide-react";

const STATUS: Record<Squad["runtime"]["status"], { label: string; dot: string; pill: string }> = {
	idle: { label: "Ocioso", dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground" },
	running: { label: "Rodando", dot: "bg-primary", pill: "bg-primary/10 text-primary" },
	paused: { label: "Pausado", dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground" },
	completed: { label: "Concluido", dot: "bg-success", pill: "bg-success/12 text-success" },
	checkpoint: { label: "Checkpoint", dot: "bg-warning", pill: "bg-warning/15 text-warning" },
	awaiting_input: { label: "Aguardando resposta", dot: "bg-warning", pill: "bg-warning/15 text-warning" },
	aborted: { label: "Abortado", dot: "bg-destructive", pill: "bg-destructive/10 text-destructive" },
};

type StatusPillProps = {
	status: Squad["runtime"]["status"];
};

const StatusPill = ({ status }: StatusPillProps) => {
	const s = STATUS[status];

	return (
		<span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1", s.pill)}>
			<span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
			<Typography variant="caption" as="span">
				{s.label}
			</Typography>
		</span>
	);
};

type SquadDetailHeaderProps = {
	squad: Squad;
	occupiedSeats: number;
	isRunning: boolean;
	isSeatFull: boolean;
	isAddingSeat: boolean;
	isRunDisabled: boolean;
	runDisabledTitle?: string;
	onBack: () => void;
	onEdit: () => void;
	onAddSeat: () => void;
	onNewAgent: () => void;
	onOpenHistory: () => void;
	onShare: () => void;
	onRun: () => void;
};

export const SquadDetailHeader = ({
	squad,
	occupiedSeats,
	isRunning,
	isSeatFull,
	isAddingSeat,
	isRunDisabled,
	runDisabledTitle,
	onBack,
	onEdit,
	onAddSeat,
	onNewAgent,
	onOpenHistory,
	onShare,
	onRun,
}: SquadDetailHeaderProps) => (
	<header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pt-6 sm:px-6">
		<div className="flex min-w-0 items-center gap-3">
			<Button variant="ghost" size="icon-sm" aria-label="Voltar para squads" onClick={onBack}>
				<ArrowLeft />
			</Button>
			<div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg text-xl" aria-hidden>
				{renderSquadIcon(squad.icon, "size-4")}
			</div>
			<div className="flex min-w-0 flex-col gap-1">
				<div className="flex min-w-0 items-center gap-2">
					<Typography variant="title-sm" className="truncate">
						{squad.name}
					</Typography>
					<StatusPill status={squad.runtime.status} />
				</div>
				<div className="text-muted-foreground flex items-center gap-1.5">
					<Users className="size-3.5" />
					<Typography variant="caption" as="span">
						{occupiedSeats}/{squad.seats.length} cadeiras
					</Typography>
				</div>
			</div>
		</div>

		<div className="flex flex-wrap items-center gap-1">
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Editar squad"
				title="Editar squad"
				disabled={isRunning}
				onClick={onEdit}
			>
				<Pencil />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Adicionar cadeira"
				title="Adicionar cadeira"
				disabled={isSeatFull || isRunning || isAddingSeat}
				onClick={onAddSeat}
			>
				<Plus />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Novo agent"
				title="Novo agent"
				disabled={isRunning}
				onClick={onNewAgent}
			>
				<Bot />
			</Button>
			<Button variant="ghost" size="icon-sm" aria-label="Histórico" title="Histórico" onClick={onOpenHistory}>
				<History />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Compartilhar squad"
				title="Compartilhar squad"
				onClick={onShare}
			>
				<Share2 />
			</Button>
			<Button size="sm" className="ml-1" disabled={isRunDisabled} title={runDisabledTitle} onClick={onRun}>
				<Play />
				Rodar
			</Button>
		</div>
	</header>
);

export const SquadDetailHeaderSkeleton = () => (
	<header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pt-6 sm:px-6">
		<div className="flex min-w-0 items-center gap-3">
			<Skeleton className="size-8 rounded-lg" />
			<Skeleton className="size-9 rounded-lg" />
			<div className="flex flex-col gap-1.5">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-3 w-24" />
			</div>
		</div>
		<div className="flex items-center gap-2">
			<Skeleton className="h-9 w-20 rounded-full" />
			<Skeleton className="h-9 w-24 rounded-full" />
			<Skeleton className="h-9 w-20 rounded-full" />
		</div>
	</header>
);
