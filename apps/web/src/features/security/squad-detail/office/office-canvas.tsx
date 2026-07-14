import { Loader2 } from "lucide-react";
import { cn } from "@/app/utils/cn";
import { Typography } from "@/components/typography";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { AnimatedPerson } from "./animated-person";
import { COORDINATOR_POINT } from "./office-geometry";
import { COORDINATOR_PERSON, personForCharacter, type PersonKey } from "./office-assets";
import { CoordinatorStation } from "./coordinator-station";
import { OfficeFloor } from "./office-floor";
import { SpeechBubble } from "./speech-bubble";
import { Workstation } from "./workstation";
import { useOfficeChoreography, type ActorScene } from "./use-office-choreography";
import type { CoordinatorView, OfficeSeatView } from "./office-types";

export type { OfficeSeatView, CoordinatorView } from "./office-types";

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

/**
 * Escritório espacial do squad — visão única: em `idle` serve pra configurar (sentar/editar agente),
 * em execução vira o "jogo" (coordenador decidindo, agente caminhando até o centro, balões de fala).
 * Todo o comportamento é derivado do `Runtime` via `useOfficeChoreography` — este componente só monta.
 */
export const OfficeCanvas = ({
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
	const isDesktop = useMediaQuery("(min-width: 640px)");
	const { actors, coordinator: coordinatorScene } = useOfficeChoreography(squad, seats);

	if (!isDesktop) {
		return (
			<OfficeCompactList
				actors={actors}
				coordinatorThinking={coordinatorScene.thinking}
				coordinatorModel={coordinator.model}
				onCoordinatorClick={onCoordinatorClick}
				onSeatClick={onSeatClick}
				onAnswerQuestion={onAnswerQuestion}
				onApproveCheckpoint={onApproveCheckpoint}
				onRejectCheckpoint={onRejectCheckpoint}
				className={className}
			/>
		);
	}

	return (
		<OfficeFloor className={className}>
			<CoordinatorStation
				position={COORDINATOR_POINT}
				model={coordinator.model}
				thinking={coordinatorScene.thinking}
				onClick={onCoordinatorClick}
			/>

			{actors.map((actor) => (
				<Workstation
					key={actor.seatId}
					position={actor.position}
					personKey={actor.agent ? personForCharacter(actor.agent.character) : null}
					status={actor.status}
					accentColor={actor.agent?.accentColor ?? "var(--muted-foreground)"}
					name={actor.agent?.name}
					role={actor.agent?.role}
					issue={actor.agent?.issue}
					bubble={actor.bubble}
					onClick={() => onSeatClick?.(actor.seatId)}
					onAnswer={onAnswerQuestion}
					onApproveCheckpoint={onApproveCheckpoint}
					onRejectCheckpoint={onRejectCheckpoint}
				/>
			))}
		</OfficeFloor>
	);
};

/** Retrato pequeno de um personagem na lista compacta — mesma moldura de tamanho/borda do avatar antigo. */
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
		<AnimatedPerson personKey={personKey} pose="front" displayWidth={28} />
	</div>
);

/** Fallback mobile (< sm): escritório espacial não cabe — vira lista vertical compacta com os mesmos dados. */
const OfficeCompactList = ({
	actors,
	coordinatorThinking,
	coordinatorModel,
	onCoordinatorClick,
	onSeatClick,
	onAnswerQuestion,
	onApproveCheckpoint,
	onRejectCheckpoint,
	className,
}: {
	actors: ActorScene[];
	coordinatorThinking: boolean;
	coordinatorModel: string;
	onCoordinatorClick?: () => void;
	onSeatClick?: (seatId: string) => void;
	onAnswerQuestion?: (answer: string) => void;
	onApproveCheckpoint?: () => void;
	onRejectCheckpoint?: () => void;
	className?: string;
}) => (
	<div className={cn("flex flex-col gap-2", className)}>
		<button
			type="button"
			onClick={onCoordinatorClick}
			className="border-primary/30 bg-primary/5 flex items-center gap-3 rounded-xl border p-3 text-left"
		>
			<CompactAvatar personKey={COORDINATOR_PERSON} accentColor="var(--primary)" />
			<div className="min-w-0 flex-1">
				<Typography variant="title-sm">Coordenador</Typography>
				<Typography variant="caption" className="text-muted-foreground truncate font-mono">
					{coordinatorModel}
				</Typography>
			</div>
			{coordinatorThinking && (
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
