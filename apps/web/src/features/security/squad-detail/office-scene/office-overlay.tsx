import { Loader2, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/app/utils/cn";
import { Typography } from "@/components/typography";
import type { AgentStatus } from "@/features/security/orchestrator-shared/types";
import { SpeechBubble } from "../office/speech-bubble";
import type { ActorScene } from "../office/use-office-choreography";
import type { OfficeBus, ProjectionMap } from "./event-bus";

type Props = {
	bus: OfficeBus;
	actors: ActorScene[];
	coordinatorThinking: boolean;
	coordinatorModel: string;
	onCoordinatorClick?: () => void;
	onSeatClick?: (seatId: string) => void;
	onAnswerQuestion?: (answer: string) => void;
	onApproveCheckpoint?: () => void;
	onRejectCheckpoint?: () => void;
};

const statusLabel = (status: AgentStatus, role?: string): string => {
	if (status === "working") return "Trabalhando";
	if (status === "checkpoint") return "Aguardando aprovação";
	if (status === "done") return "Concluído";
	return role ?? "Ocioso";
};

/** Rótulo flutuante (nome + status). Centrado pelo container que o empilha acima da cabeça. */
const NameLabel = ({
	name,
	sub,
	accentColor,
	spinning,
}: {
	name: string;
	sub: string;
	accentColor: string;
	spinning?: boolean;
}) => (
	<span className="pointer-events-none flex flex-col items-center rounded-md bg-black/35 px-2 py-0.5 backdrop-blur-[1px]">
		<span className="flex items-center gap-1">
			<span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} aria-hidden />
			<Typography variant="caption" as="span" className="max-w-32 truncate font-medium text-white">
				{name}
			</Typography>
		</span>
		<span className="flex items-center gap-1 text-white/75">
			{spinning && <Loader2 className="size-2.5 shrink-0 animate-spin" />}
			<Typography variant="caption" as="span" className="truncate">
				{sub}
			</Typography>
		</span>
	</span>
);

/**
 * Overlay DOM sobre o canvas: um botão de clique por baia + coordenador (a11y preservada), rótulos de
 * nome e os balões interativos (`SpeechBubble`). Posicionado pelas projeções mundo→tela da cena, que
 * só mudam em resize — sem tremor. Recebe pointer-events só nos elementos interativos.
 */
export const OfficeOverlay = ({
	bus,
	actors,
	coordinatorThinking,
	coordinatorModel,
	onCoordinatorClick,
	onSeatClick,
	onAnswerQuestion,
	onApproveCheckpoint,
	onRejectCheckpoint,
}: Props) => {
	const [proj, setProj] = useState<ProjectionMap | null>(null);

	useEffect(() => bus.on("scene:projections", setProj), [bus]);

	if (!proj) return null;

	const actorBySeat = new Map(actors.map((a) => [a.seatId, a]));

	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			{/* Coordenador. */}
			<button
				type="button"
				onClick={onCoordinatorClick}
				aria-label={`Coordenador — ${coordinatorThinking ? "decidindo o próximo passo" : "aguardando"}`}
				className="pointer-events-auto absolute rounded-lg focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
				style={{
					left: proj.coordinator.x,
					top: proj.coordinator.y,
					width: proj.coordinator.w,
					height: proj.coordinator.h,
				}}
			/>
			<div
				className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1"
				style={{ left: proj.bubbleAnchors.coordinator?.x ?? 0, top: (proj.bubbleAnchors.coordinator?.y ?? 0) - 6 }}
			>
				{coordinatorThinking && (
					<span className="bg-primary text-primary-foreground pointer-events-none flex items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap">
						<Loader2 className="size-3 animate-spin" />
						<Typography variant="caption" as="span">
							decidindo…
						</Typography>
					</span>
				)}
				<NameLabel name="Coordenador" sub={coordinatorModel} accentColor="var(--primary)" />
			</div>

			{/* Baias. */}
			{Object.entries(proj.desks).map(([seatId, rect]) => {
				const actor = actorBySeat.get(seatId);
				const agent = actor?.agent ?? null;
				const status = actor?.status ?? "idle";
				const anchor = proj.bubbleAnchors[seatId];
				return (
					<div key={seatId}>
						<button
							type="button"
							onClick={() => onSeatClick?.(seatId)}
							title={agent?.issue}
							aria-label={agent ? `${agent.name} — ${statusLabel(status, agent.role)}` : "Sentar agente"}
							className={cn(
								"pointer-events-auto absolute flex items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none",
								!agent && "border-muted-foreground/50 hover:border-ring border border-dashed",
							)}
							style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
						>
							{!agent && (
								<span className="bg-background/70 text-muted-foreground flex size-8 items-center justify-center rounded-full border border-dashed">
									<Plus className="size-4" />
								</span>
							)}
						</button>

						{/* Nome e balão empilhados acima da cabeça: o balão sobe junto e nunca cobre o rótulo. */}
						{anchor && (agent || actor?.bubble) && (
							<div
								className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1"
								style={{ left: anchor.x, top: anchor.y - 6 }}
							>
								{actor?.bubble && (
									<div className="pointer-events-auto w-60">
										<SpeechBubble
											bubble={actor.bubble}
											inline
											onAnswer={onAnswerQuestion}
											onApproveCheckpoint={onApproveCheckpoint}
											onRejectCheckpoint={onRejectCheckpoint}
										/>
									</div>
								)}
								{agent && (
									<NameLabel
										name={agent.name}
										sub={statusLabel(status, agent.role)}
										accentColor={agent.accentColor}
										spinning={status === "working"}
									/>
								)}
							</div>
						)}
					</div>
				);
			})}

			{/* Marca de canto discreta (identidade do "jogo"). */}
			<span className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 text-white/30">
				<Sparkles className="size-3" />
			</span>
		</div>
	);
};
