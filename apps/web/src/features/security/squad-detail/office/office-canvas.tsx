import { cn } from "@/app/utils/cn";
import { Typography } from "@/components/typography";
import { AlertTriangle, Plus, Settings2, Sparkles } from "lucide-react";
import { AgentAvatar } from "@/components/orchestrator";
import { COORDINATOR_CHARACTER } from "@/features/security/orchestrator-shared/data/constants";
import type { AgentStatus, CharacterName } from "@/features/security/orchestrator-shared/types";

export type OfficeSeatView = {
	seatId: string;
	agent:
		| {
				name: string;
				role: string;
				character: CharacterName;
				accentColor: string;
				model: string;
				/** Provider/modelo quebrado (ver `squad-readiness.ts`) — mostra aviso no card. */
				issue?: string;
		  }
		| null;
	status: AgentStatus;
};

export type CoordinatorView = { model: string; maxSteps: number };

type Props = {
	seats: OfficeSeatView[];
	coordinator?: CoordinatorView;
	onCoordinatorClick?: () => void;
	onSeatClick?: (seatId: string) => void;
	className?: string;
};

const STATUS: Record<AgentStatus, { label: string; dot: string; pill: string }> = {
	idle: { label: "Ocioso", dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground" },
	working: { label: "Trabalhando", dot: "bg-primary", pill: "bg-primary/10 text-primary" },
	done: { label: "Concluido", dot: "bg-success", pill: "bg-success/12 text-success" },
	checkpoint: { label: "Checkpoint", dot: "bg-warning", pill: "bg-warning/15 text-warning" },
};

const StatusPill = ({ status }: { status: AgentStatus }) => {
	const s = STATUS[status];
	return (
		<span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", s.pill)}>
			<span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
			<Typography variant="caption" as="span">
				{s.label}
			</Typography>
		</span>
	);
};

/** Board espacial do squad: um card por cadeira. Ocupada mostra agent + provedor + status; vazia convida a sentar. */
export const OfficeCanvas = ({ seats, coordinator, onCoordinatorClick, onSeatClick, className }: Props) => (
	<div
		className={cn(
			"bg-muted/30 h-full w-full overflow-auto rounded-xl border p-4 sm:p-6",
			"[background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:20px_20px]",
			className,
		)}
	>
		{coordinator && (
			<button
				type="button"
				onClick={onCoordinatorClick}
				className="border-primary/30 bg-primary/5 hover:border-primary/50 focus-visible:ring-ring/30 mb-4 flex w-full flex-wrap items-center gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
			>
				<AgentAvatar character={COORDINATOR_CHARACTER} accentColor="var(--primary)" size={44} className="rounded-lg" />
				<div className="flex min-w-0 flex-1 flex-col">
					<div className="flex items-center gap-2">
						<Typography variant="title-sm">Coordenador</Typography>
						<span className="bg-primary/10 text-primary rounded-full px-2 py-0.5">
							<Typography variant="caption" as="span">
								Sempre ativo
							</Typography>
						</span>
					</div>
					<Typography variant="caption" className="text-muted-foreground">
						Decide qual agente age a cada passo, ate a tarefa acabar.
					</Typography>
				</div>
				<span className="text-muted-foreground flex items-center gap-1.5">
					<Sparkles className="size-3.5 shrink-0" />
					<Typography variant="caption" as="span" className="truncate font-mono">
						{coordinator.model}
					</Typography>
				</span>
				<Settings2 className="text-muted-foreground size-4 shrink-0" />
			</button>
		)}

		{coordinator && (
			<Typography variant="caption" className="text-muted-foreground mb-2 block px-0.5">
				Agentes
			</Typography>
		)}

		<div className="grid grid-cols-[repeat(auto-fill,minmax(248px,1fr))] gap-3">
			{seats.map((seat) =>
				seat.agent ? (
					<button
						key={seat.seatId}
						type="button"
						onClick={() => onSeatClick?.(seat.seatId)}
						title={seat.agent.issue}
						className={cn(
							"bg-card hover:border-ring focus-visible:ring-ring/30 flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
							seat.agent.issue && "border-warning/50",
						)}
					>
						<div className="flex min-w-0 items-center gap-3">
							<AgentAvatar
								character={seat.agent.character}
								accentColor={seat.agent.accentColor}
								size={44}
								className="rounded-lg"
							/>
							<div className="flex min-w-0 flex-1 flex-col">
								<Typography variant="title-sm" className="truncate">
									{seat.agent.name}
								</Typography>
								<Typography variant="caption" className="text-muted-foreground truncate">
									{seat.agent.role}
								</Typography>
							</div>
							{seat.agent.issue && (
								<AlertTriangle className="text-warning size-4 shrink-0" aria-label={seat.agent.issue} />
							)}
						</div>
						<div className="flex items-center justify-between gap-2">
							<span className="text-muted-foreground flex min-w-0 items-center gap-1.5">
								<Sparkles className="size-3.5 shrink-0" />
								<Typography variant="caption" as="span" className="truncate font-mono">
									{seat.agent.model}
								</Typography>
							</span>
							<StatusPill status={seat.status} />
						</div>
					</button>
				) : (
					<button
						key={seat.seatId}
						type="button"
						onClick={() => onSeatClick?.(seat.seatId)}
						className="border-border text-muted-foreground hover:border-ring hover:text-foreground focus-visible:ring-ring/30 flex min-h-[112px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-colors focus-visible:ring-2 focus-visible:outline-none"
					>
						<Plus className="size-5" />
						<Typography variant="caption" as="span">
							Sentar agente
						</Typography>
					</button>
				),
			)}
		</div>
	</div>
);
