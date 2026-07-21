import { useMemo } from "react";
import { activityLabel } from "@/components/orchestrator/run-transcript";
import type { AgentStatus, RunEvent, Squad } from "@/features/security/orchestrator-shared/types";
import type { OfficeSeatView } from "./office-types";

export type BubbleTone = "neutral" | "warning" | "success";
export type BubbleKind = "speech" | "checkpoint" | "question";

export type ActorBubble = {
	tone: BubbleTone;
	kind: BubbleKind;
	text: string;
	options?: string[];
	toolLabel?: string;
	streaming?: boolean;
};

export type ActorScene = {
	seatId: string;
	agent: OfficeSeatView["agent"];
	status: AgentStatus;
	bubble?: ActorBubble;
};

export type CoordinatorScene = { thinking: boolean };

export type OfficeMode = "config" | "live";

const LIVE_STATUSES = new Set<Squad["runtime"]["status"]>(["running", "checkpoint", "awaiting_input"]);

/** Último evento de fala (kind "agent") deste seat — vira o texto do balão quando não há streaming. */
const lastAgentEventFor = (events: RunEvent[], seatId: string): RunEvent | undefined =>
	[...events].reverse().find((e) => e.kind === "agent" && e.seatId === seatId);

const checkpointText = (agentName: string, kind: "before" | "after" | null): string =>
	kind === "after" ? `Aprovar para eu seguir?` : `Posso agir, ${agentName.split(" ")[0]}?`;

/**
 * Traduz o `Runtime` (fonte de verdade da execução) num modelo de cena declarativo — posição, pose
 * (via `AgentAvatar`/`poseForStatus`), aura e balão de cada assento. Não escreve no runtime, só lê;
 * quem produz esse estado é o runner (`orchestrator-runtime.ts`).
 */
export const useOfficeChoreography = (
	squad: Squad,
	seatsView: OfficeSeatView[],
): { actors: ActorScene[]; coordinator: CoordinatorScene; mode: OfficeMode } => {
	const { runtime, seats } = squad;

	return useMemo(() => {
		const mode: OfficeMode = LIVE_STATUSES.has(runtime.status) ? "live" : "config";

		const actors: ActorScene[] = seats.map((seat) => {
			const view = seatsView.find((s) => s.seatId === seat.id);
			const status = view?.status ?? "idle";
			const isPending = runtime.pendingSeatId === seat.id;

			let bubble: ActorBubble | undefined;
			if (runtime.pendingQuestion && runtime.pendingQuestion.seatId === seat.id) {
				bubble = {
					tone: "warning",
					kind: "question",
					text: runtime.pendingQuestion.question,
					options: runtime.pendingQuestion.options,
				};
			} else if (status === "checkpoint" && isPending) {
				bubble = {
					tone: "warning",
					kind: "checkpoint",
					text: checkpointText(view?.agent?.name ?? "agente", runtime.pendingCheckpointKind),
				};
			} else if (status === "working" && isPending) {
				const runningTool = [...runtime.liveActivity]
					.reverse()
					.find((a) => a.kind === "tool" && a.status === "running");
				bubble = {
					tone: "neutral",
					kind: "speech",
					text: runtime.streamingText || lastAgentEventFor(runtime.events, seat.id)?.content || "Trabalhando…",
					toolLabel: runningTool ? activityLabel(runningTool) : undefined,
					streaming: Boolean(runtime.streamingText),
				};
			}
			// Sem bolha para status "done": o rótulo do nome já diz "Concluído", e mostrar o output inteiro
			// de TODO agente já finalizado ao mesmo tempo (não só o que está falando agora) lota a cena de
			// balões de 240px sobrepostos — o conteúdo completo continua acessível ao clicar no assento.

			return { seatId: seat.id, agent: view?.agent ?? null, status, bubble };
		});

		return { actors, coordinator: { thinking: runtime.coordinatorThinking }, mode };
	}, [runtime, seats, seatsView]);
};
