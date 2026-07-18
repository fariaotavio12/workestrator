import { Loader2 } from "lucide-react";
import { cn } from "@/app/utils/cn";
import { Typography } from "@/components/typography";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { personForCharacter, personSrc, type PersonKey } from "@/features/security/orchestrator-shared/data/characters";
import { SpeechBubble } from "./speech-bubble";
import { useOfficeChoreography } from "./use-office-choreography";
import type { CoordinatorView, OfficeSeatView } from "./office-types";

type Props = {
	squad: Squad;
	seats: OfficeSeatView[];
	coordinator: CoordinatorView;
	onCoordinatorClick?: () => void;
	onSeatClick?: (seatId: string) => void;
	onAnswerQuestion?: (answer: string) => void;
	onApproveCheckpoint?: () => void;
	onRejectCheckpoint?: () => void;
	className?: string;
};

/** Retrato pequeno de um personagem (pose estática frontal) na lista compacta. */
const CompactAvatar = ({
	personKey,
	accentColor,
	className,
}: {
	personKey: PersonKey;
	accentColor?: string;
	className?: string;
}) => (
	<div
		className={cn("bg-muted/40 flex size-10 shrink-0 items-end justify-center overflow-hidden rounded-lg border-2", className)}
		style={{ borderColor: accentColor }}
	>
		<img
			src={personSrc(personKey, "front")}
			alt=""
			draggable={false}
			className="h-9 w-auto select-none [image-rendering:pixelated]"
		/>
	</div>
);

/**
 * Fallback mobile (< sm) do escritório: a cena espacial não cabe, então vira uma lista vertical
 * compacta com os mesmos dados de coreografia (status, balões, sentar agente).
 */
export const OfficeCompactList = ({
	squad,
	seats,
	coordinator,
	onCoordinatorClick,
	onSeatClick,
	onAnswerQuestion,
	onApproveCheckpoint,
	onRejectCheckpoint,
	className,
}: Props) => {
	const { actors, coordinator: coordinatorScene } = useOfficeChoreography(squad, seats);

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<button
				type="button"
				onClick={onCoordinatorClick}
				className="border-primary/30 bg-primary/5 flex items-center gap-3 rounded-xl border p-3 text-left"
			>
				<CompactAvatar personKey="01_manager-navy" accentColor="var(--primary)" />
				<div className="min-w-0 flex-1">
					<Typography variant="title-sm">Coordenador</Typography>
					<Typography variant="caption" className="text-muted-foreground truncate font-mono">
						{coordinator.model}
					</Typography>
				</div>
				{coordinatorScene.thinking && (
					<span className="text-primary flex shrink-0 items-center gap-1.5">
						<Loader2 className="size-3.5 animate-spin" />
						<Typography variant="caption" as="span">
							decidindo…
						</Typography>
					</span>
				)}
			</button>

			{actors.map((actor) =>
				actor.agent ? (
					<div key={actor.seatId} className="flex flex-col gap-2">
						<button
							type="button"
							onClick={() => onSeatClick?.(actor.seatId)}
							title={actor.agent.issue}
							className={cn(
								"bg-card hover:border-ring flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
								actor.agent.issue && "border-warning/50",
							)}
						>
							<CompactAvatar
								personKey={personForCharacter(actor.agent.character)}
								accentColor={actor.agent.accentColor}
								className={actor.status === "idle" ? "opacity-70" : undefined}
							/>
							<div className="min-w-0 flex-1">
								<Typography variant="title-sm" className="truncate">
									{actor.agent.name}
								</Typography>
								<Typography variant="caption" className="text-muted-foreground truncate">
									{actor.agent.role}
								</Typography>
								<Typography variant="caption" className="text-muted-foreground/70 truncate font-mono">
									{actor.agent.model}
								</Typography>
							</div>
						</button>
						{actor.bubble && (
							<SpeechBubble
								bubble={actor.bubble}
								inline
								onAnswer={onAnswerQuestion}
								onApproveCheckpoint={onApproveCheckpoint}
								onRejectCheckpoint={onRejectCheckpoint}
							/>
						)}
					</div>
				) : (
					<button
						key={actor.seatId}
						type="button"
						onClick={() => onSeatClick?.(actor.seatId)}
						className="border-border text-muted-foreground hover:border-ring hover:text-foreground flex min-h-16 items-center justify-center gap-1.5 rounded-xl border border-dashed"
					>
						<Typography variant="caption" as="span">
							Sentar agente
						</Typography>
					</button>
				),
			)}
		</div>
	);
};
