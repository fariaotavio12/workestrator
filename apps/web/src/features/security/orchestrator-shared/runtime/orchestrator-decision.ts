// Parser da decisão do agent coordenador (modo orquestrado) — o CLI devolve texto livre, então
// extraímos o(s) bloco(s) JSON e validamos o formato esperado antes de confiar na decisão.
export type CoordinatorDecision = {
	next: string;
	reason?: string;
	/**
	 * Números dos passos do histórico (1-based, como o coordenador vê) cujo conteúdo o agente escolhido
	 * precisa. O runtime monta o contexto do agente a partir desses passos (fallback: só o passo anterior).
	 */
	contextSteps?: number[];
};

/** Normaliza `context_steps` da decisão: só inteiros positivos, únicos; qualquer coisa fora disso vira undefined. */
const parseContextSteps = (value: unknown): number[] | undefined => {
	if (!Array.isArray(value)) return undefined;
	const nums = value
		.map((v) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : Number.NaN))
		.filter((n) => Number.isInteger(n) && n > 0);
	return nums.length > 0 ? [...new Set(nums)] : undefined;
};

/** Motivo do "done" sintético emitido quando nenhuma decisão foi interpretável — o runtime usa isso pra
 * distinguir um encerramento real do coordenador de uma falha de parse (e aí logar a saída crua). */
export const UNPARSEABLE_DECISION_REASON = "Não consegui interpretar a decisão do coordenador — encerrando.";

/**
 * Extrai todo bloco `{...}` balanceado de nível superior do texto (respeitando literais de string,
 * pra chaves dentro de um valor tipo `"reason": "ele disse {oi}"` não desalinharem a contagem).
 * Não usa um regex ganancioso (`/\{[\s\S]*\}/`) porque o próprio prompt do coordenador mostra o
 * formato esperado com chaves literais como exemplo (`buildCoordinatorPrompt`) — se o modelo ecoa
 * esse exemplo antes da decisão real, o texto fica com mais de um bloco `{...}`, e um regex do
 * primeiro `{` ao último `}` junta os dois num JSON inválido.
 */
const extractBalancedJsonBlocks = (raw: string): string[] => {
	const blocks: string[] = [];
	let depth = 0;
	let start = -1;
	let inString = false;
	let escaped = false;

	for (let i = 0; i < raw.length; i++) {
		const char = raw[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (char === "\\") escaped = true;
			else if (char === '"') inString = false;
			continue;
		}
		if (char === '"') {
			inString = true;
			continue;
		}
		if (char === "{") {
			if (depth === 0) start = i;
			depth++;
		} else if (char === "}" && depth > 0) {
			depth--;
			if (depth === 0 && start !== -1) {
				blocks.push(raw.slice(start, i + 1));
				start = -1;
			}
		}
	}
	return blocks;
};

/**
 * Último recurso quando o `JSON.parse` estrito falha: extrai `next`/`reason` direto por regex. Cobre os
 * modos de falha mais comuns de LLM que quebram o JSON estrito mas não a intenção — sobretudo `reason`
 * com quebra de linha/tab literal dentro da string (JSON não permite control char cru em string, mas o
 * modelo escreve um motivo de várias frases o tempo todo), vírgula sobrando, ou texto solto ao redor.
 * Ancorado em `"next"` pra não confundir com outra chave; pega a última ocorrência (a decisão real vem
 * depois de um eventual eco do formato de exemplo do prompt).
 */
const extractDecisionByRegex = (raw: string): CoordinatorDecision | null => {
	const nextMatches = [...raw.matchAll(/"next"\s*:\s*"([^"]+)"/g)];
	const nextMatch = nextMatches.at(-1);
	const next = nextMatch?.[1]?.trim();
	if (!next) return null;
	// `reason` casa qualquer coisa até a próxima aspa não-escapada — control chars crus inclusos.
	const reasonMatch = raw.match(/"reason"\s*:\s*"((?:[^"\\]|\\.)*)"/);
	const reason = reasonMatch?.[1]?.trim();
	return { next, reason: reason || undefined };
};

/** Nunca lança — decisão não interpretável cai em "done" (encerra o run em vez de travar num loop). */
export const parseCoordinatorDecision = (raw: string): CoordinatorDecision => {
	const blocks = extractBalancedJsonBlocks(raw);
	// Do último bloco pro primeiro: quando há mais de um (ex.: o modelo ecoou o formato de exemplo do
	// prompt antes de responder), a decisão real tende a ser a última coisa dita.
	for (let i = blocks.length - 1; i >= 0; i--) {
		try {
			const parsed = JSON.parse(blocks[i]) as { next?: unknown; reason?: unknown; context_steps?: unknown };
			if (typeof parsed.next === "string" && parsed.next.trim()) {
				return {
					next: parsed.next.trim(),
					reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
					contextSteps: parseContextSteps(parsed.context_steps),
				};
			}
		} catch {
			// bloco não era JSON válido — tenta o anterior
		}
	}
	// Nenhum bloco passou no JSON estrito — tenta o fallback tolerante antes de desistir.
	const lenient = extractDecisionByRegex(raw);
	if (lenient) return lenient;
	return { next: "done", reason: UNPARSEABLE_DECISION_REASON };
};
