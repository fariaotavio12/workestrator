import { Badge, Button } from "@/components";
import { Eye, Pause, Play, Plus, RotateCcw, RotateCw, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/app/utils/cn";
import { Typography } from "@/components/typography";
import type { Squad, SquadRuntimeStatus } from "@/features/security/orchestrator-shared/types";
import { Rotas } from "@/app/routing/variables";

const statusVariant: Record<SquadRuntimeStatus, "secondary" | "default" | "success" | "warning" | "destructive"> = {
	idle: "secondary",
	queued: "secondary",
	running: "default",
	paused: "secondary",
	completed: "success",
	checkpoint: "warning",
	awaiting_input: "warning",
	awaiting_auth: "warning",
	awaiting_approval: "warning",
	aborted: "destructive",
};

const statusLabel: Record<SquadRuntimeStatus, string> = {
	idle: "Ocioso",
	queued: "Na fila",
	running: "Rodando",
	paused: "Pausado",
	completed: "Concluído",
	checkpoint: "Aguardando aprovação",
	awaiting_input: "Aguardando resposta",
	awaiting_auth: "Aguardando autenticação",
	awaiting_approval: "Aguardando aprovação",
	aborted: "Abortado",
};

const formatElapsed = (ms: number): string => {
	const s = Math.max(0, Math.round(ms / 1000));
	return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`;
};

type Props = {
	squad: Squad;
	onPause: () => void;
	onResume: () => void;
	onStop: () => void;
	onReset: () => void;
	onNewRun: () => void;
	/** Presente só quando há um run anterior pra retomar (`completed`/`aborted`) — omite o botão se ausente. */
	onContinue?: () => void;
	/** Presente só quando o run anterior tem ao menos um passo pra refazer. */
	onRetryLastStep?: () => void;
	/** Presente só quando há arquivos pra abrir (preview disponível) — omite o botão se ausente. */
	onOpenFiles?: () => void;
	className?: string;
};

/** Barra de status da execução: estado + passo + tempo decorrido ao vivo + controles — pro footer do AppSheet. */
export const RunStatusBar = ({
	squad,
	onPause,
	onResume,
	onStop,
	onReset,
	onNewRun,
	onContinue,
	onRetryLastStep,
	onOpenFiles,
	className,
}: Props) => {
	const { status, currentStep, startedAt } = squad.runtime;
	const isLive =
		status === "queued" ||
		status === "running" ||
		status === "checkpoint" ||
		status === "awaiting_input" ||
		status === "awaiting_auth" ||
		status === "awaiting_approval" ||
		status === "paused";
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (status !== "running") return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [status]);

	const elapsed = startedAt ? formatElapsed(now - new Date(startedAt).getTime()) : null;

	return (
		<div className={cn("flex w-full flex-wrap items-center gap-3", className)}>
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
				<Typography variant="caption" className="text-muted-foreground">
					Passo {currentStep + 1} de até {squad.orchestrator.maxSteps}
				</Typography>
				{elapsed && (
					<Typography variant="caption" className="text-muted-foreground">
						· {elapsed}
					</Typography>
				)}
			</div>

			<div className="ml-auto flex flex-wrap items-center gap-2">
				<Button size="sm" variant="outline" onClick={onNewRun}>
					<Plus />
					Nova execução
				</Button>
				{onOpenFiles && (
					<Button size="sm" variant="outline" onClick={onOpenFiles}>
						<Eye />
						Ver arquivos gerados
					</Button>
				)}
				{status === "running" && (
					<Button size="sm" variant="outline" onClick={onPause}>
						<Pause />
						Pausar
					</Button>
				)}
				{status === "awaiting_auth" && (
					<Button size="sm" variant="outline" asChild>
						<a href={Rotas.protegidas.orchestrator.secrets}>Reconectar conta</a>
					</Button>
				)}
				{(status === "paused" || status === "awaiting_auth") && (
					<Button size="sm" variant="outline" onClick={onResume}>
						<Play />
						{status === "awaiting_auth" ? "Tentar novamente" : "Retomar"}
					</Button>
				)}
				{isLive && (
					<Button size="sm" variant="error" onClick={onStop}>
						<Square />
						Parar
					</Button>
				)}
				{(status === "completed" || status === "aborted") && onContinue && (
					<Button size="sm" onClick={onContinue}>
						<Play />
						Continuar de onde parou
					</Button>
				)}
				{(status === "completed" || status === "aborted") && onRetryLastStep && (
					<Button size="sm" variant="outline" onClick={onRetryLastStep}>
						<RotateCw />
						Refazer último passo
					</Button>
				)}
				{(status === "completed" || status === "aborted") && (
					<Button size="sm" variant="ghost" onClick={onReset}>
						<RotateCcw />
						Limpar painel
					</Button>
				)}
			</div>
		</div>
	);
};
