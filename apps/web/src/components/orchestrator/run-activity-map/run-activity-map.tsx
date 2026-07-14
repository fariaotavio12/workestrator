import { Check, Loader2 } from "lucide-react";
import { cn } from "@/app/utils/cn";
import { Typography } from "@/components/typography";
import { poseForStatus } from "@/features/security/orchestrator-shared/data/characters";
import { COORDINATOR_CHARACTER } from "@/features/security/orchestrator-shared/data/constants";
import type { AgentStatus, Squad } from "@/features/security/orchestrator-shared/types";
import { AgentAvatar } from "../agent-avatar";

type Props = { squad: Squad; className?: string };

/**
 * Mapa ao vivo do run — genérico pra qualquer squad: um nó por agente sentado (avatar + nome + estado)
 * mais o nó do coordenador. O foco (destaque) acompanha o fluxo: coordenador decidindo → agente
 * trabalhando → de volta ao coordenador.
 */
export const RunActivityMap = ({ squad, className }: Props) => {
	const { perAgentStatus, coordinatorThinking } = squad.runtime;

	// Agentes sentados, na ordem do grid (linha, depois coluna) — mesma leitura do escritório.
	const seated = squad.seats
		.slice()
		.sort((a, b) => a.row - b.row || a.col - b.col)
		.flatMap((seat) => {
			const agent = squad.agents.find((a) => a.id === seat.agentId);
			return agent ? [{ seat, agent }] : [];
		});

	return (
		<div className={cn("flex flex-col gap-1", className)}>
			<CoordinatorNode active={coordinatorThinking} />

			{seated.map((entry, index) => (
				<AgentNode
					key={entry.seat.id}
					name={entry.agent.name}
					role={entry.agent.role}
					character={entry.agent.character}
					accentColor={entry.agent.accentColor}
					state={perAgentStatus[entry.seat.id] ?? "idle"}
					last={index === seated.length - 1}
				/>
			))}
		</div>
	);
};

/**
 * Nó do coordenador — destacado enquanto ele decide o próximo passo. Mesmo avatar (`COORDINATOR_CHARACTER`)
 * e padrão visual usados no card do coordenador no escritório do squad (`office-canvas.tsx`), não um ícone
 * genérico — o coordenador é ilustrado como um personagem, igual aos agents.
 */
const CoordinatorNode = ({ active }: { active: boolean }) => (
	<div className="flex gap-2.5">
		<div className="flex flex-col items-center">
			<span className="relative shrink-0">
				<AgentAvatar
					character={COORDINATOR_CHARACTER}
					accentColor={active ? "var(--primary)" : "var(--border)"}
					pose={active ? "talk" : "blink"}
					size={28}
					className={cn("rounded-lg", !active && "opacity-60")}
				/>
			</span>
			<span className={cn("min-h-3.5 w-px flex-1", active ? "bg-primary/40" : "bg-border")} />
		</div>
		<div className="pt-1 pb-2">
			<Typography variant="caption" as="div" className={active ? "text-primary" : "text-muted-foreground"}>
				Coordenador
			</Typography>
			{active && (
				<span className="text-primary flex items-center gap-1">
					<Loader2 className="size-3 animate-spin" />
					<Typography variant="caption" as="span">
						decidindo…
					</Typography>
				</span>
			)}
		</div>
	</div>
);

const STATE_HINT: Record<AgentStatus, string> = {
	working: "trabalhando",
	done: "concluído",
	checkpoint: "aguardando aprovação",
	idle: "",
};

/** Nó de um agente no mapa — avatar (pose por estado), nome e micro-status. */
const AgentNode = ({
	name,
	role,
	character,
	accentColor,
	state,
	last,
}: {
	name: string;
	role: string;
	character: NonNullable<Squad["agents"][number]>["character"];
	accentColor: string;
	state: AgentStatus;
	last: boolean;
}) => {
	const working = state === "working";
	const done = state === "done";
	const dim = state === "idle";
	const pose = poseForStatus(state);

	return (
		<div className="flex gap-2.5">
			<div className="flex flex-col items-center">
				<span className="relative shrink-0">
					<AgentAvatar
						character={character}
						accentColor={working ? accentColor : "var(--border)"}
						pose={pose}
						size={28}
						className={cn(dim && "opacity-60")}
					/>
					{done && (
						<span className="bg-success text-success-foreground absolute -right-1 -bottom-1 flex size-3.5 items-center justify-center rounded-full">
							<Check className="size-2.5" />
						</span>
					)}
				</span>
				{!last && <span className="bg-border min-h-3.5 w-px flex-1" />}
			</div>
			<div className="min-w-0 pt-0.5 pb-2">
				<Typography
					variant="caption"
					as="div"
					className={cn("truncate", working ? "text-foreground" : "text-muted-foreground")}
				>
					{name}
				</Typography>
				<Typography variant="caption" as="div" className="text-muted-foreground/70 truncate">
					{working ? (
						<span className="text-primary flex items-center gap-1">
							<Loader2 className="size-3 animate-spin" />
							{STATE_HINT.working}
						</span>
					) : (
						STATE_HINT[state] || role
					)}
				</Typography>
			</div>
		</div>
	);
};
