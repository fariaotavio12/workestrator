import type { ApprovalItemDraft } from "../types";

/**
 * Extração dos itens decidíveis de um checkpoint (.specs/001-aprovacoes-externas-teams, design D15) a partir
 * da saída do passo anterior. Fica fora de `orchestrator-runtime.ts` para ser testável sem subir o motor
 * inteiro — é lógica pura, sem estado nem rede.
 *
 * **Nunca lança e nunca é obrigatório:** quando a saída não é uma lista JSON (o caso comum — agente que
 * responde em prosa), devolve `[]` e o checkpoint segue sendo o aprovar/reprovar booleano de sempre. É o que
 * garante que nenhum squad existente muda de comportamento ao ganhar essa capacidade.
 */

/** Espelha `app.approval.items-max-count` no backend — cortar aqui evita um 422 que abortaria o aviso. */
export const MAX_APPROVAL_ITEMS = 200;

const MAX_LABEL_CHARS = 120;

/**
 * Chaves que costumam carregar a identidade de negócio e o rótulo. Heurística de propósito: o mesmo
 * checkpoint serve para qualquer domínio (chamado de T.I., post, pedido), então cravar nome de campo aqui
 * amarraria o produto ao caso de uso de um squad só. Sem match, o item cai em "Item N".
 */
const REF_KEY = /(^|[_\s-])(num|numero|número|id|processo|codigo|código|ticket|chamado|protocolo|ref)/i;
const LABEL_KEY = /(nome|name|titulo|título|assunto|necessidade|descri|subject|title|resumo)/i;

/** Modelos entregam o JSON dentro de um fence markdown com muita frequência (```json … ```). */
const stripFence = (raw: string): string => {
	const trimmed = raw.trim();
	const fenced = /^```[a-z]*\s*\n?([\s\S]*?)\n?```$/i.exec(trimmed);
	return (fenced?.[1] ?? trimmed).trim();
};

/**
 * Tenta o parse direto e, falhando, recorta do primeiro `[` ao último `]` — cobre o caso de o agente
 * escrever uma frase antes ou depois do array, que é o desvio mais comum quando o prompt pede só JSON.
 */
const extractArray = (text: string): unknown => {
	try {
		return JSON.parse(text);
	} catch {
		// Segue para o recorte por delimitador.
	}
	const start = text.indexOf("[");
	const end = text.lastIndexOf("]");
	if (start === -1 || end <= start) return undefined;
	try {
		return JSON.parse(text.slice(start, end + 1));
	} catch {
		return undefined;
	}
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Só string/number viram `ref`/`label` — objeto ou array aninhado renderizaria "[object Object]" na tela. */
const readableValue = (value: unknown): string | undefined => {
	if (typeof value === "string") return value.trim() || undefined;
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return undefined;
};

const pickByKey = (data: Record<string, unknown>, pattern: RegExp): string | undefined => {
	for (const [key, value] of Object.entries(data)) {
		if (!pattern.test(key)) continue;
		const readable = readableValue(value);
		if (readable) return readable;
	}
	return undefined;
};

const truncate = (text: string): string =>
	text.length <= MAX_LABEL_CHARS ? text : `${text.slice(0, MAX_LABEL_CHARS - 1)}…`;

/**
 * `raw` é o conteúdo do artefato do passo anterior. Devolve `[]` sempre que não houver uma lista de objetos
 * — inclusive para array de strings/números, que não tem campo nenhum para um humano decidir em cima.
 */
export const parseApprovalItems = (raw: string | null | undefined): ApprovalItemDraft[] => {
	if (!raw?.trim()) return [];
	const parsed = extractArray(stripFence(raw));
	if (!Array.isArray(parsed) || parsed.length === 0) return [];

	const objects = parsed.filter(isPlainObject);
	// Lista mista (alguns objetos, outros não) é sinal de que o parse pegou a coisa errada — melhor cair no
	// checkpoint booleano do que abrir uma revisão por item com metade dos itens faltando.
	if (objects.length !== parsed.length) return [];

	return objects.slice(0, MAX_APPROVAL_ITEMS).map((data, index) => {
		const ref = pickByKey(data, REF_KEY);
		const label = pickByKey(data, LABEL_KEY);
		return {
			ref,
			label: truncate(label ?? ref ?? `Item ${index + 1}`),
			data,
		};
	});
};

/**
 * Resumo legível para o `summary` do pedido — os dados em si viajam em `items[]`, que não é truncado. Antes
 * disso o `summary` levava o JSON cru do agente e o teto de 500 chars do backend o cortava no meio da
 * palavra, deixando o aviso no Teams ilegível.
 */
export const summarizeApprovalItems = (items: ApprovalItemDraft[]): string => {
	const noun = items.length === 1 ? "item" : "itens";
	const refs = items.map((item) => item.ref).filter((ref): ref is string => Boolean(ref));
	if (refs.length === 0) return `${items.length} ${noun} para revisar.`;

	const shown = refs.slice(0, 5);
	const remaining = items.length - shown.length;
	const list = shown.join(", ");
	return remaining > 0
		? `${items.length} ${noun} para revisar: ${list} e mais ${remaining}.`
		: `${items.length} ${noun} para revisar: ${list}.`;
};
