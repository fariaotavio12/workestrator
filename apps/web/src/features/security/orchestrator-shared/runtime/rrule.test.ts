import { describe, expect, it } from "vitest";
import {
	describeRrule,
	isRruleDue,
	nextRruleOccurrence,
	nextRruleOccurrences,
	normalizeRrule,
	parseRrule,
	validateRrule,
} from "./rrule";

// Datas construídas em hora local de propósito: a regra é interpretada no fuso do usuário, então o
// teste tem de valer em qualquer máquina (UTC, UTC-3, …).
const local = (y: number, m: number, d: number, h = 0, min = 0): number =>
	new Date(y, m - 1, d, h, min, 0, 0).getTime();

describe("normalizeRrule", () => {
	it("junta o bloco iCalendar sem espaços sobrando nem linhas vazias", () => {
		expect(normalizeRrule("  DTSTART:20260105T093000 \n\n  RRULE:FREQ=WEEKLY  \n")).toBe(
			"DTSTART:20260105T093000\nRRULE:FREQ=WEEKLY",
		);
	});
});

describe("parseRrule", () => {
	it("recusa entrada vazia", () => {
		const result = parseRrule("   ", local(2026, 1, 1));
		expect(result.ok).toBe(false);
	});

	it("recusa regra sem FREQ", () => {
		const result = parseRrule("BYHOUR=9", local(2026, 1, 1));
		expect(result).toEqual({ ok: false, error: "A regra precisa de FREQ (ex.: FREQ=DAILY)." });
	});

	it("recusa propriedade desconhecida", () => {
		const result = parseRrule("FREQ=DAILY;BANANA=1", local(2026, 1, 1));
		expect(result.ok).toBe(false);
	});

	it("aceita a regra com e sem o prefixo RRULE:", () => {
		expect(parseRrule("FREQ=DAILY", local(2026, 1, 1)).ok).toBe(true);
		expect(parseRrule("RRULE:FREQ=DAILY", local(2026, 1, 1)).ok).toBe(true);
	});
});

describe("nextRruleOccurrence", () => {
	it("resolve BYHOUR em hora local, não em UTC", () => {
		const from = local(2026, 1, 1, 8, 0);
		expect(nextRruleOccurrence("FREQ=DAILY;BYHOUR=9;BYMINUTE=0", from)).toBe(local(2026, 1, 1, 9, 0));
	});

	it("passa para o dia seguinte quando o horário do dia já passou", () => {
		const from = local(2026, 1, 1, 10, 0);
		expect(nextRruleOccurrence("FREQ=DAILY;BYHOUR=9;BYMINUTE=0", from)).toBe(local(2026, 1, 2, 9, 0));
	});

	it("respeita o DTSTART escrito pelo usuário em vez da âncora do scheduler", () => {
		const next = nextRruleOccurrence(
			"DTSTART:20260105T093000\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO",
			local(2026, 1, 1),
		);
		expect(next).toBe(local(2026, 1, 5, 9, 30));
	});

	it("usa a âncora como início quando a regra não traz DTSTART", () => {
		const anchor = local(2026, 3, 10, 14, 0);
		expect(nextRruleOccurrence("FREQ=DAILY;INTERVAL=3", anchor)).toBe(local(2026, 3, 13, 14, 0));
	});

	it("devolve null quando a regra já se esgotou (COUNT)", () => {
		const anchor = local(2026, 1, 1, 0, 0);
		expect(nextRruleOccurrence("FREQ=DAILY;COUNT=2", local(2026, 1, 10), anchor)).toBeNull();
	});
});

describe("nextRruleOccurrences", () => {
	it("lista as próximas ocorrências em ordem", () => {
		const from = local(2026, 1, 1, 8, 0);
		expect(nextRruleOccurrences("FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=9;BYMINUTE=0", from, 3)).toEqual([
			local(2026, 1, 2, 9, 0),
			local(2026, 1, 5, 9, 0),
			local(2026, 1, 7, 9, 0),
		]);
	});

	it("devolve lista vazia para regra inválida", () => {
		expect(nextRruleOccurrences("lixo", local(2026, 1, 1))).toEqual([]);
	});
});

describe("isRruleDue", () => {
	const rule = "FREQ=MINUTELY;INTERVAL=15";
	const last = local(2026, 1, 1, 10, 0);

	it("não dispara antes da próxima ocorrência", () => {
		expect(isRruleDue(rule, last, last + 14 * 60 * 1000)).toBe(false);
	});

	it("dispara exatamente na ocorrência", () => {
		expect(isRruleDue(rule, last, last + 15 * 60 * 1000)).toBe(true);
	});

	it("dispara também quando o tick atrasou e a ocorrência já passou", () => {
		expect(isRruleDue(rule, last, last + 47 * 60 * 1000)).toBe(true);
	});

	it("nunca dispara com regra inválida", () => {
		expect(isRruleDue("FREQ=BANANA", last, last + 24 * 60 * 60 * 1000)).toBe(false);
	});
});

describe("validateRrule", () => {
	it("aprova uma regra válida e devolve descrição e próximas datas", () => {
		const result = validateRrule("FREQ=DAILY;BYHOUR=9;BYMINUTE=0", local(2026, 1, 1, 8, 0));
		expect(result.valid).toBe(true);
		if (!result.valid) return;
		expect(result.nextOccurrences).toHaveLength(3);
		expect(result.description).toContain("09:00");
	});

	it("reprova regra que não gera execução futura", () => {
		const result = validateRrule("FREQ=DAILY;COUNT=1", local(2026, 1, 1, 8, 0));
		expect(result).toEqual({ valid: false, error: "Essa regra não gera nenhuma execução futura." });
	});
});

describe("describeRrule", () => {
	const now = local(2026, 1, 1, 8, 0);

	it("descreve intervalo simples", () => {
		expect(describeRrule("FREQ=MINUTELY;INTERVAL=15", now)).toBe("A cada 15 minutos");
	});

	it("descreve dias da semana e horário", () => {
		expect(describeRrule("FREQ=WEEKLY;BYDAY=MO,FR;BYHOUR=7;BYMINUTE=30", now)).toBe(
			"A cada semana, seg, sex, às 07:30",
		);
	});

	it("descreve dia do mês", () => {
		expect(describeRrule("FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=6;BYMINUTE=0", now)).toBe("A cada mês, no dia 1, às 06:00");
	});

	it("não inventa dia da semana quando a regra não traz BYDAY", () => {
		expect(describeRrule("FREQ=WEEKLY", now)).toBe("A cada semana");
	});

	it("devolve string vazia para regra inválida", () => {
		expect(describeRrule("lixo", now)).toBe("");
	});
});
