// Suporte a RRULE (RFC 5545) para o gatilho "Agendado". Módulo puro — nenhum IO, nenhum estado; o
// scheduler (`scheduler.ts`) e o formulário do squad (`squad-form-dialog`) consomem as mesmas funções,
// pra o que a UI mostra de preview ser exatamente o que o scheduler vai disparar.
//
// Fuso: a regra é interpretada em **hora local** do usuário (`FREQ=DAILY;BYHOUR=9` = 09:00 na máquina
// dele, não 09:00 UTC). A lib `rrule` trabalha em UTC quando não recebe `tzid`, então convertemos os
// instantes pro "domínio flutuante" (componentes locais reempacotados como UTC) antes de calcular e
// desfazemos a conversão no resultado. Sem isso, quem estiver em UTC-3 receberia o disparo às 06:00.
import { RRuleSet, rrulestr } from "rrule";

/** Máximo de ocorrências que o preview da UI pede de uma vez. */
const MAX_PREVIEW = 5;

const FLOATING_DTSTART_KEY = "DTSTART";

const toFloating = (ms: number): Date => {
	const d = new Date(ms);
	return new Date(
		Date.UTC(
			d.getFullYear(),
			d.getMonth(),
			d.getDate(),
			d.getHours(),
			d.getMinutes(),
			d.getSeconds(),
			d.getMilliseconds(),
		),
	);
};

const fromFloating = (d: Date): number =>
	new Date(
		d.getUTCFullYear(),
		d.getUTCMonth(),
		d.getUTCDate(),
		d.getUTCHours(),
		d.getUTCMinutes(),
		d.getUTCSeconds(),
		d.getUTCMilliseconds(),
	).getTime();

/**
 * Normaliza o que o usuário digitou: tira espaços em volta de cada linha, descarta linhas vazias e
 * junta com `\n` (a lib aceita bloco iCalendar multi-linha: `DTSTART:...` + `RRULE:...`).
 */
export const normalizeRrule = (input: string): string =>
	input
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.join("\n");

const hasOwnDtstart = (text: string): boolean =>
	text.split("\n").some((line) => line.toUpperCase().startsWith(FLOATING_DTSTART_KEY));

const hasFreq = (text: string): boolean => /(^|[;:\s])FREQ=/i.test(text);

type ParseResult = { ok: true; rule: ReturnType<typeof rrulestr> } | { ok: false; error: string };

/**
 * Compila a RRULE. `anchorMs` só é usado quando o texto não traz `DTSTART` próprio — a lib deixa a
 * opção `dtstart` **sobrescrever** o `DTSTART` do texto, então passar sempre jogaria fora a âncora
 * que o usuário escreveu de propósito (ex.: `INTERVAL=2` semanal a partir de uma segunda específica).
 */
export const parseRrule = (input: string, anchorMs: number): ParseResult => {
	const text = normalizeRrule(input);
	if (!text) return { ok: false, error: "Informe a regra RRULE." };
	if (!hasFreq(text)) return { ok: false, error: "A regra precisa de FREQ (ex.: FREQ=DAILY)." };

	try {
		const rule = hasOwnDtstart(text) ? rrulestr(text) : rrulestr(text, { dtstart: toFloating(anchorMs) });
		return { ok: true, rule };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : "RRULE inválida." };
	}
};

/** Próxima ocorrência estritamente depois de `afterMs`, ou `null` se a regra já se esgotou. */
export const nextRruleOccurrence = (input: string, afterMs: number, anchorMs = afterMs): number | null => {
	const parsed = parseRrule(input, anchorMs);
	if (!parsed.ok) return null;
	const next = parsed.rule.after(toFloating(afterMs));
	return next ? fromFloating(next) : null;
};

/** As próximas ocorrências a partir de `fromMs` — alimenta o preview do formulário. */
export const nextRruleOccurrences = (input: string, fromMs: number, count = 3): number[] => {
	const parsed = parseRrule(input, fromMs);
	if (!parsed.ok) return [];

	const result: number[] = [];
	let cursor = toFloating(fromMs);
	for (let i = 0; i < Math.min(count, MAX_PREVIEW); i += 1) {
		const next = parsed.rule.after(cursor);
		if (!next) break;
		result.push(fromFloating(next));
		cursor = next;
	}
	return result;
};

/** `true` quando existe uma ocorrência no intervalo `(lastMs, nowMs]` — decisão de disparo. */
export const isRruleDue = (input: string, lastMs: number, nowMs: number): boolean => {
	const next = nextRruleOccurrence(input, lastMs);
	return next !== null && next <= nowMs;
};

export type RruleValidation =
	| { valid: true; description: string; nextOccurrences: number[] }
	| { valid: false; error: string };

/** Validação para a UI: compila, descreve em português e já devolve as próximas ocorrências. */
export const validateRrule = (input: string, nowMs: number): RruleValidation => {
	const parsed = parseRrule(input, nowMs);
	if (!parsed.ok) return { valid: false, error: parsed.error };

	const nextOccurrences = nextRruleOccurrences(input, nowMs, 3);
	if (nextOccurrences.length === 0) return { valid: false, error: "Essa regra não gera nenhuma execução futura." };

	return { valid: true, description: describeRrule(input, nowMs), nextOccurrences };
};

const FREQ_UNIT: Record<number, [singular: string, plural: string]> = {
	0: ["ano", "anos"],
	1: ["mês", "meses"],
	2: ["semana", "semanas"],
	3: ["dia", "dias"],
	4: ["hora", "horas"],
	5: ["minuto", "minutos"],
	6: ["segundo", "segundos"],
};

const WEEKDAY_LABEL = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

const MONTH_LABEL = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const pad = (n: number): string => String(n).padStart(2, "0");

/** `true` quando a regra digitada traz a propriedade explicitamente (e não herdada do dtstart). */
const wrote = (input: string, property: string): boolean =>
	input
		.toUpperCase()
		.split(/[;:\s]+/)
		.some((token) => token.startsWith(`${property}=`));

const asList = (value: number | number[] | null | undefined): number[] => {
	if (value === null || value === undefined) return [];
	return Array.isArray(value) ? value : [value];
};

/** Resumo em português da regra — texto curto de apoio, não substitui o preview de datas. */
export const describeRrule = (input: string, nowMs: number): string => {
	const parsed = parseRrule(input, nowMs);
	if (!parsed.ok) return "";

	// Bloco com várias RRULE/EXDATE vira RRuleSet: descrever "a regra" não faz sentido — o preview de
	// datas continua valendo e é a fonte de verdade pro usuário.
	if (parsed.rule instanceof RRuleSet) return "";

	const options = parsed.rule.options;
	const parts: string[] = [];
	const interval = options.interval || 1;
	const unit = FREQ_UNIT[options.freq];
	if (unit) parts.push(interval === 1 ? `A cada ${unit[0]}` : `A cada ${interval} ${unit[1]}`);

	const months = asList(options.bymonth);
	if (months.length > 0) parts.push(`em ${months.map((m) => MONTH_LABEL[m - 1] ?? m).join(", ")}`);

	const monthDays = asList(options.bymonthday);
	if (monthDays.length > 0) parts.push(`no dia ${monthDays.join(", ")}`);

	// BYDAY/BYHOUR só entram na descrição quando o usuário escreveu — a lib preenche esses campos a
	// partir do dtstart, e repetir isso viraria ruído ("A cada semana, seg, às 08:00" para `FREQ=WEEKLY`,
	// onde "seg" e "08:00" são só o instante em que a regra foi criada, não uma escolha do usuário.)
	if (wrote(input, "BYDAY")) {
		const weekdays = asList(options.byweekday);
		if (weekdays.length > 0) parts.push(weekdays.map((d) => WEEKDAY_LABEL[d] ?? d).join(", "));
	}

	const hours = asList(options.byhour);
	const minutes = asList(options.byminute);
	if (options.freq <= 3 && wrote(input, "BYHOUR") && hours.length > 0) {
		const times = hours.flatMap((h) =>
			minutes.length > 0 ? minutes.map((m) => `${pad(h)}:${pad(m)}`) : [`${pad(h)}:00`],
		);
		parts.push(`às ${times.join(", ")}`);
	}

	if (options.count) parts.push(`${options.count} execuções no total`);
	if (options.until) parts.push(`até ${new Date(fromFloating(options.until)).toLocaleDateString("pt-BR")}`);

	return parts.join(", ");
};

/** Formata uma ocorrência pro preview (dia da semana + data + hora, hora local). */
export const formatOccurrence = (ms: number): string =>
	new Date(ms).toLocaleString("pt-BR", {
		weekday: "short",
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});

/** Exemplos prontos oferecidos no formulário — cobrem os pedidos mais comuns sem consultar a RFC. */
export const RRULE_EXAMPLES: { label: string; value: string }[] = [
	{ label: "A cada 15 minutos", value: "FREQ=MINUTELY;INTERVAL=15" },
	{ label: "De hora em hora, 8h–18h", value: "FREQ=HOURLY;BYHOUR=8,9,10,11,12,13,14,15,16,17,18" },
	{ label: "Todo dia às 9h", value: "FREQ=DAILY;BYHOUR=9;BYMINUTE=0" },
	{ label: "Dias úteis às 8h", value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;BYHOUR=8;BYMINUTE=0" },
	{ label: "Segundas às 7h30", value: "FREQ=WEEKLY;BYDAY=MO;BYHOUR=7;BYMINUTE=30" },
	{ label: "Dia 1º de cada mês às 6h", value: "FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=6;BYMINUTE=0" },
];
