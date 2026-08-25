// Rótulos do gatilho agendado, compartilhados pelas telas que mostram a cadência do squad (card da
// listagem em grid e a linha compacta de `page-squads`). Fica aqui, e não em cada tela, pra `custom`
// (RRULE) ser descrito do mesmo jeito nas duas.
import type { ScheduleEvery, Trigger } from "@/features/security/orchestrator-shared/types";
import { describeRrule } from "./rrule";

type ScheduleTrigger = Extract<Trigger, { type: "schedule" }>;

const FIXED_EVERY_LABEL: Record<Exclude<ScheduleEvery, "custom">, string> = {
	"5m": "a cada 5 min",
	"1h": "a cada 1 hora",
	daily: "diário",
};

/** Cadência em texto corrido: "a cada 5 min", "diário" ou o resumo da RRULE personalizada. */
export const scheduleLabel = (trigger: ScheduleTrigger): string => {
	if (trigger.every !== "custom") return FIXED_EVERY_LABEL[trigger.every];
	return describeRrule(trigger.rrule ?? "", Date.now()) || "regra personalizada";
};

/** Versão curta pra badge/linha compacta. */
export const scheduleShortLabel = (trigger: ScheduleTrigger): string =>
	trigger.every === "custom" ? "RRULE" : trigger.every;
