import type { ApprovalItemDraft, ApprovalItemStatus } from "../types";

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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Lista localizada no texto cru, com o intervalo que ela ocupa — `start`/`end` são índices em `raw`. */
type LocatedItems = { values: unknown[]; start: number; end: number };

const sliceParse = (raw: string, open: string, close: string): LocatedItems | undefined => {
	const start = raw.indexOf(open);
	const end = raw.lastIndexOf(close);
	if (start === -1 || end <= start) return undefined;
	try {
		return { values: [JSON.parse(raw.slice(start, end + 1))], start, end: end + 1 };
	} catch {
		return undefined;
	}
};

/**
 * Tenta o parse direto e, falhando, recorta do primeiro delimitador ao último — cobre o caso de o agente
 * escrever uma frase antes ou depois do JSON, que é o desvio mais comum quando o prompt pede só JSON.
 *
 * **Um objeto solto vale como lista de um** (`{…}` ⇒ `[{…}]`). Modelo que recebeu "devolva a lista de
 * chamados" e encontrou exatamente um responde com o objeto cru muito mais vezes do que com um array de um
 * elemento; exigir o array fazia o lote de um item cair no checkpoint booleano, com o JSON inteiro empurrado
 * pro `summary` e truncado em 500 chars. O array é tentado **antes**, para `{"chamados": [ … ]}` render a
 * lista de dentro em vez de um item único cujo `data` é o invólucro.
 *
 * Devolve também o intervalo ocupado no texto original, para `stripRejectedApprovalItems` poder reescrever
 * só a lista e preservar a prosa/fence em volta. Ponto único de parse: filtrar por um caminho diferente do
 * que extraiu os itens abriria a porta pro filtro discordar da lista que o usuário decidiu.
 */
const locateItems = (raw: string): LocatedItems | undefined => {
	const stripped = stripFence(raw);
	const offset = raw.indexOf(stripped);
	let whole: unknown;
	try {
		whole = JSON.parse(stripped);
	} catch {
		// Segue para o recorte por delimitador.
	}
	if (offset !== -1 && Array.isArray(whole)) {
		return { values: whole, start: offset, end: offset + stripped.length };
	}

	const sliced = sliceParse(raw, "[", "]");
	if (sliced && Array.isArray(sliced.values[0])) {
		return { values: sliced.values[0] as unknown[], start: sliced.start, end: sliced.end };
	}

	if (offset !== -1 && isPlainObject(whole) && Object.keys(whole).length > 0) {
		return { values: [whole], start: offset, end: offset + stripped.length };
	}

	const object = sliceParse(raw, "{", "}");
	return object && isPlainObject(object.values[0]) && Object.keys(object.values[0]).length > 0
		? object
		: undefined;
};

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
 * — inclusive para array de strings/números, que não tem campo nenhum para um humano decidir em cima. Um
 * objeto JSON solto conta como lista de um (ver `locateItems`).
 */
export const parseApprovalItems = (raw: string | null | undefined): ApprovalItemDraft[] => {
	if (!raw?.trim()) return [];
	const parsed = locateItems(raw)?.values;
	if (!parsed || parsed.length === 0) return [];

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
 * Resultado do filtro de itens reprovados. `unreviewed` conta o rabo da lista que nunca chegou ao pedido
 * (acima de `MAX_APPROVAL_ITEMS`) e por isso segue no contexto sem ninguém ter decidido sobre ele — quem
 * chama registra isso no log, porque cortar em silêncio leria como "revisei tudo".
 */
export type RejectedItemsFilter = {
	content: string;
	removed: number;
	unreviewed: number;
};

/**
 * Materializa a segunda metade da D16 (.specs/001-aprovacoes-externas-teams): "aprovado → segue com o
 * subconjunto aprovado". Devolve o artefato do passo anterior reescrito **sem** os itens reprovados, para
 * virar o contexto do próximo agent. Sem isso a reprovação por item ficava só no log e no `RunRejection`
 * (auditoria/treinamento da spec 002) e o agent reprocessava exatamente o que acabou de ser reprovado.
 *
 * Filtra por **exclusão** dos `rejected`, nunca por inclusão dos `approved`: `pending` é um estado válido
 * de item, e incluir só o que passou apagaria em silêncio o que ninguém decidiu.
 *
 * `null` = não deu para filtrar com segurança (nada reprovado, artefato que não é mais a lista que gerou os
 * itens, ou contagem que não alinha). Nunca chuta: devolver a lista errada é pior que devolver a íntegra.
 */
export const stripRejectedApprovalItems = (
	raw: string | null | undefined,
	items: readonly { status: ApprovalItemStatus }[],
): RejectedItemsFilter | null => {
	if (!raw?.trim() || items.length === 0) return null;
	const rejected = new Set(items.flatMap((item, index) => (item.status === "rejected" ? [index] : [])));
	if (rejected.size === 0) return null;

	const located = locateItems(raw);
	if (!located) return null;
	const { values, start, end } = located;
	// Mesmas guardas de `parseApprovalItems`: lista mista nunca gerou itens, então um artefato misto aqui não
	// é a lista que o usuário decidiu.
	if (values.length === 0 || !values.every(isPlainObject)) return null;
	// Os itens saem de `slice(0, MAX_APPROVAL_ITEMS)` sobre este mesmo array e o backend preserva a ordem no
	// read-modify-write do `decideItem`, então índice de item ⇒ índice no array. Um array menor que os itens,
	// ou maior sem ser pelo teto, significa que este não é o artefato de origem — aí não há alinhamento.
	if (values.length < items.length) return null;
	if (values.length > items.length && items.length !== MAX_APPROVAL_ITEMS) return null;

	const kept = values.filter((_, index) => !rejected.has(index));
	return {
		content: `${raw.slice(0, start)}${JSON.stringify(kept, null, 2)}${raw.slice(end)}`,
		removed: rejected.size,
		unreviewed: values.length - items.length,
	};
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
