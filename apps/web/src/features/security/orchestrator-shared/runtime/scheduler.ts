// Scheduler local — dispara squads com `trigger: { type: "schedule", enabled: true }` sem precisar
// que o usuário clique em "Rodar". Módulo-level (não hook), mesma filosofia de `orchestrator-runtime.ts`
// — funciona destacado de qualquer componente, chamado uma vez do shell do app (`OrchestratorScheduler`,
// montado em `security/layout.tsx`). Só dispara enquanto a janela do Workestrator estiver aberta — é a
// decisão travada desde o início do plano (execução sempre local); não existe daemon em background/tray.
import { tanStackQueryClient } from "@/app/api/clients";
import { squadDetailKeys } from "@/features/security/squad-detail/api";
import type { SquadDetail } from "@/features/security/squad-detail/api";
import { fetchSquads, squadsKeys } from "@/features/security/squads/api";
import type { SquadSummary } from "@/features/security/squads/api";
import { loadRunConfig } from "./config-cache";
import { isRunActive, startRun } from "./orchestrator-runtime";

const POLL_INTERVAL_MS = 30_000;

const EVERY_TO_MS: Record<"5m" | "1h" | "daily", number> = {
	"5m": 5 * 60 * 1000,
	"1h": 60 * 60 * 1000,
	daily: 24 * 60 * 60 * 1000,
};

/**
 * Lógica pura de decisão — separada do polling/IO pra ser testável sem fake timers/promises.
 * `lastFiredAt` é mutado como efeito colateral intencional (grava o momento do disparo, e também o
 * baseline na primeira vez que vê o squad — sem isso, todo squad agendado rodaria de novo assim que
 * o app fosse reaberto, mesmo que já tivesse rodado fora do app, ex.: no dia anterior).
 */
export const computeDueSquads = (
	squads: SquadSummary[],
	now: number,
	lastFiredAt: Map<string, number>,
	isActive: (squadId: string) => boolean,
): SquadSummary[] =>
	squads.filter((squad) => {
		if (squad.trigger.type !== "schedule" || !squad.trigger.enabled) return false;

		const last = lastFiredAt.get(squad.id);
		if (last === undefined) {
			lastFiredAt.set(squad.id, now);
			return false;
		}
		if (now - last < EVERY_TO_MS[squad.trigger.every]) return false;

		return !isActive(squad.id);
	});

/**
 * Lógica pura de seleção do briefing — separada da leitura do cache pra ser testável isoladamente.
 * Prioridade: briefing salvo pelo usuário (ver RunDialog) > `description` do squad > texto genérico.
 */
export const resolveScheduledBriefing = (squad: SquadSummary, detail: SquadDetail | undefined): string =>
	detail?.savedBriefing?.trim() || squad.description.trim() || `Execução agendada de "${squad.name}".`;

/** squadId -> timestamp (ms) do último disparo — só em memória, reseta a cada boot do app. */
const lastFiredAt = new Map<string, number>();

let timer: ReturnType<typeof setInterval> | null = null;

const fireScheduledRun = async (squad: SquadSummary): Promise<void> => {
	lastFiredAt.set(squad.id, Date.now());
	// Squad detail já traz os agentes com as ferramentas resolvidas; providers vêm junto no mesmo gate.
	await loadRunConfig(squad.id);
	const detail = tanStackQueryClient.getQueryData<SquadDetail>(squadDetailKeys.detail(squad.id));
	// Sem o detalhe não dá nem pra resolver o briefing — tenta de novo no próximo tick.
	if (!detail) return;
	startRun(squad.id, resolveScheduledBriefing(squad, detail), "schedule");
};

const tick = async (): Promise<void> => {
	let squads: SquadSummary[];
	try {
		squads = await tanStackQueryClient.fetchQuery({ queryKey: squadsKeys.list(), queryFn: fetchSquads, staleTime: 0 });
	} catch {
		return;
	}

	const due = computeDueSquads(squads, Date.now(), lastFiredAt, isRunActive);
	for (const squad of due) void fireScheduledRun(squad);
};

/** Idempotente — chamar do shell do app (`OrchestratorScheduler`). */
export const startScheduler = (): void => {
	if (timer) return;
	timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
};

export const stopScheduler = (): void => {
	if (!timer) return;
	clearInterval(timer);
	timer = null;
};
