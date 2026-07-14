import { Check, Compass, Loader2, X } from "lucide-react";
import { createElement, useEffect, useRef, useState } from "react";
import { cn } from "@/app/utils/cn";
import { Terminal } from "@/components/terminal/terminal";
import { ThinkingBlock } from "@/components/thinking-block/thinking-block";
import { Typography } from "@/components/typography";
import type { Agent, LiveActivityItem, RunEvent, Squad } from "@/features/security/orchestrator-shared/types";
import { AgentAvatar } from "../agent-avatar";
import { activityIcon, activityLabel } from "./activity-label";
import { AgentTurn } from "./agent-turn";

type Props = { squad: Squad; onPreviewHtml?: (html: string) => void; className?: string };

/** Cronômetro ao vivo (mm ss / ss) a partir de um instante ISO — tica de 1 em 1s enquanto montado. */
const useElapsed = (startedAt: string | null): string => {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!startedAt) return;
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [startedAt]);
	if (!startedAt) return "";
	const secs = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
	const mins = Math.floor(secs / 60);
	return mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;
};

/** Transcript ao vivo da execução: eventos concluídos + o card do agente ativo com sua timeline de ações. */
export const RunTranscript = ({ squad, onPreviewHtml, className }: Props) => {
	const {
		events,
		streamingText,
		perAgentStatus,
		status,
		liveActivity,
		liveTerminal,
		coordinatorThinking,
		stepStartedAt,
	} = squad.runtime;
	const endRef = useRef<HTMLDivElement>(null);

	// Auto-scroll pro fim, mas só se o usuário já estiver perto do fim — se ele rolou pra cima pra ler algo,
	// não arranca a visão dele de volta pra baixo.
	useEffect(() => {
		const end = endRef.current;
		if (!end) return;
		let scroller: HTMLElement | null = end.parentElement;
		while (scroller) {
			const canScroll = scroller.scrollHeight > scroller.clientHeight;
			if (canScroll && /(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) break;
			scroller = scroller.parentElement;
		}
		if (!scroller) {
			end.scrollIntoView({ block: "end" });
			return;
		}
		const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
		if (distanceFromBottom < 120) end.scrollIntoView({ block: "end" });
	}, [events.length, streamingText, liveActivity.length, liveTerminal, coordinatorThinking]);

	const agentOf = (agentId?: string) => (agentId ? squad.agents.find((a) => a.id === agentId) : undefined);

	const workingSeatId = Object.entries(perAgentStatus).find(([, s]) => s === "working")?.[0];
	const workingSeat = workingSeatId ? squad.seats.find((s) => s.id === workingSeatId) : undefined;
	const workingAgent = agentOf(workingSeat?.agentId ?? undefined);
	const isRunning = status === "running";

	if (events.length === 0 && !isRunning) {
		return (
			<Typography variant="body-sm" className={cn("text-muted-foreground", className)}>
				Aguardando o coordenador iniciar…
			</Typography>
		);
	}

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{events.map((event) => (
				<RunEventItem
					key={event.id}
					event={event}
					agentName={agentOf(event.agentId)?.name}
					squad={squad}
					onPreviewHtml={onPreviewHtml}
				/>
			))}

			{isRunning && coordinatorThinking && <CoordinatorDecidingChip />}

			{isRunning && !coordinatorThinking && workingAgent && (
				<LiveAgentCard
					agent={workingAgent}
					activity={liveActivity}
					terminal={liveTerminal}
					streamingText={streamingText ?? ""}
					stepStartedAt={stepStartedAt}
				/>
			)}
			<div ref={endRef} />
		</div>
	);
};

/** Chip do coordenador enquanto ele decide o próximo passo — preenche o intervalo entre agentes. */
const CoordinatorDecidingChip = () => (
	<div className="border-border bg-muted/40 flex items-center gap-2 rounded-lg border px-3 py-2">
		<Compass className="text-muted-foreground size-4 shrink-0" />
		<Typography variant="body-sm" className="text-muted-foreground">
			Coordenador decidindo o próximo passo…
		</Typography>
		<Loader2 className="text-muted-foreground ml-auto size-4 shrink-0 animate-spin" />
	</div>
);

/** Rótulo curto do estado do agente, derivado do que está acontecendo agora. */
const currentStatusLabel = (activity: LiveActivityItem[], streamingText: string): string => {
	if (activity.some((a) => a.kind === "tool" && a.status === "running")) return "Rodando ferramenta";
	if (streamingText.trim()) return "Escrevendo";
	if (activity.some((a) => a.kind === "thinking")) return "Pensando";
	return "Iniciando…";
};

/** Card do agente ativo: identidade + status ao vivo + timeline de ações + streaming da resposta. */
const LiveAgentCard = ({
	agent,
	activity,
	terminal,
	streamingText,
	stepStartedAt,
}: {
	agent: Agent;
	activity: LiveActivityItem[];
	terminal: string;
	streamingText: string;
	stepStartedAt: string | null;
}) => {
	const elapsed = useElapsed(stepStartedAt);
	return (
		<div className="border-primary/40 bg-card flex flex-col gap-3 rounded-xl border p-3">
			<div className="flex items-center gap-3">
				<AgentAvatar character={agent.character} accentColor={agent.accentColor} size={30} />
				<div className="min-w-0">
					<Typography variant="title-sm" as="span">
						{agent.name}
					</Typography>
					<Typography variant="caption" as="div" className="text-muted-foreground truncate">
						{agent.role}
					</Typography>
				</div>
				<span className="bg-primary/10 text-primary ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1">
					<Loader2 className="size-3 animate-spin" />
					<Typography variant="caption" as="span">
						{currentStatusLabel(activity, streamingText)}
						{elapsed ? ` · ${elapsed}` : ""}
					</Typography>
				</span>
			</div>

			{activity.length > 0 && (
				<div className="flex flex-col gap-1">
					{activity.map((item) =>
						item.kind === "thinking" ? (
							<ThinkingBlock key={item.id} title="Pensando">
								{item.detail ?? ""}
							</ThinkingBlock>
						) : (
							<ActivityRow key={item.id} item={item} />
						),
					)}
				</div>
			)}

			{terminal && <Terminal content={terminal} className="max-h-40" />}

			{streamingText && (
				<Typography variant="body-sm" className="text-muted-foreground whitespace-pre-wrap">
					{streamingText}
					<span className="bg-foreground ml-0.5 inline-block h-4 w-1.5 animate-pulse align-middle" />
				</Typography>
			)}
		</div>
	);
};

/** Uma linha de ação (ferramenta/saída) com ícone, rótulo genérico e status rodando→concluído/erro. */
const ActivityRow = ({ item }: { item: LiveActivityItem }) => {
	return (
		<div className="bg-muted/40 flex items-center gap-2 rounded-md px-2 py-1.5">
			{createElement(activityIcon(item), { className: "text-muted-foreground size-3.5 shrink-0" })}
			<Typography variant="caption" as="span" className="min-w-0 flex-1 truncate">
				{activityLabel(item)}
			</Typography>
			{item.status === "running" && <Loader2 className="text-primary size-3.5 shrink-0 animate-spin" />}
			{item.status === "done" && <Check className="text-success size-3.5 shrink-0" />}
			{item.status === "error" && <X className="text-destructive size-3.5 shrink-0" />}
		</div>
	);
};

const RunEventItem = ({
	event,
	agentName,
	squad,
	onPreviewHtml,
}: {
	event: RunEvent;
	agentName?: string;
	squad: Squad;
	onPreviewHtml?: (html: string) => void;
}) => {
	const agent = event.agentId ? squad.agents.find((a) => a.id === event.agentId) : undefined;

	if (event.kind === "agent") {
		return (
			<AgentTurn
				name={agentName ?? event.title}
				role={agent?.role}
				character={agent?.character}
				accentColor={agent?.accentColor}
				content={event.content}
				onPreviewHtml={onPreviewHtml}
			/>
		);
	}

	if (event.kind === "error") {
		return <AgentTurn name={event.title} content={event.content} tone="error" />;
	}

	if (event.kind === "coordinator") {
		return (
			<div className="flex items-center gap-2">
				<span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full">
					<Compass className="size-3.5" />
				</span>
				<div className="min-w-0 flex-1">
					<Typography variant="caption" className="text-muted-foreground">
						{event.title}
					</Typography>
					{event.reason && (
						<ThinkingBlock title="Raciocínio do coordenador" className="mt-1">
							{event.reason}
						</ThinkingBlock>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex justify-center">
			<Typography
				variant="caption"
				className="text-muted-foreground bg-muted/60 max-w-prose rounded-full px-3 py-1 text-center"
			>
				{event.title}
				{event.content ? ` — ${event.content}` : ""}
			</Typography>
		</div>
	);
};
