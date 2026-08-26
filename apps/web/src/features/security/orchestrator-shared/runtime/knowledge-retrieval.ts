import type { ChunkSearchResult } from "@/features/security/knowledge/api";

/** ~4 chars por token — mesma aproximação usada no chunking do backend. */
const CHARS_PER_TOKEN = 4;

/** Orçamento padrão do bloco de contexto recuperado, em tokens. Mantém o prompt previsível. */
export const DEFAULT_RETRIEVAL_BUDGET_TOKENS = 1800;

/** Orçamento da consulta enviada ao embedding. Ver `buildRetrievalQuery`. */
export const DEFAULT_QUERY_CHAR_BUDGET = 1200;

/**
 * A consulta que vai ao embedding. O que o agente **precisa fazer** vem primeiro (nome, papel e briefing
 * do run); a saída do passo anterior entra depois, e só com o que couber.
 *
 * Antes a consulta era só a saída do passo anterior. Isso fazia o agente ser buscado com o texto que
 * *outro* agente produziu — do passo 2 em diante a base era consultada com um assunto que não era o dele,
 * e os trechos certos nunca subiam. Truncar também importa: artefato grande diluía o pouco de sinal que
 * havia e ainda arriscava estourar o limite do provider de embeddings.
 */
export const buildRetrievalQuery = (
	agent: { name: string; role?: string },
	briefing: string | undefined,
	previousOutput: string | undefined,
	budgetChars: number = DEFAULT_QUERY_CHAR_BUDGET,
): string => {
	const identity = [agent.name, agent.role?.trim()].filter(Boolean).join(" — ");
	const head = [identity, briefing?.trim()].filter(Boolean).join("\n").slice(0, budgetChars);
	const remaining = budgetChars - head.length;
	const tail = remaining > 0 ? (previousOutput?.trim() ?? "").slice(0, remaining) : "";
	return [head, tail].filter(Boolean).join("\n").trim();
};

/**
 * Monta o bloco "Contexto recuperado da base de conhecimento" com orçamento **rígido** de tokens:
 * deduplica por `chunkId`, cita a origem (`filename`) de cada trecho e retorna "" quando não há nada a
 * injetar.
 *
 * A ordem não é score puro. Primeiro entra o melhor trecho de **cada base** anexada, depois o resto por
 * score. Sem isso, uma base cujos trechos pontuam sistematicamente mais alto — na prática a base de lições
 * do treinamento, que é gerada a partir do próprio run e por isso é sempre a mais parecida com a consulta —
 * ocupava todas as vagas e as outras bases do agente sumiam do prompt sem nenhum sinal.
 */
export const buildRetrievalBlock = (
	chunks: ChunkSearchResult[],
	budgetTokens: number = DEFAULT_RETRIEVAL_BUDGET_TOKENS,
): string => {
	if (chunks.length === 0) return "";

	const budgetChars = budgetTokens * CHARS_PER_TOKEN;
	const ordered = [...chunks].sort((a, b) => b.score - a.score);

	// Melhor trecho de cada base, na ordem de score entre eles; o resto disputa as vagas restantes.
	const bestPerCollection: ChunkSearchResult[] = [];
	const rest: ChunkSearchResult[] = [];
	const collectionSeen = new Set<string>();
	for (const chunk of ordered) {
		if (chunk.collectionId && !collectionSeen.has(chunk.collectionId)) {
			collectionSeen.add(chunk.collectionId);
			bestPerCollection.push(chunk);
		} else {
			rest.push(chunk);
		}
	}

	const seen = new Set<string>();
	const parts: string[] = [];
	let usedChars = 0;

	for (const chunk of [...bestPerCollection, ...rest]) {
		if (seen.has(chunk.chunkId)) continue;
		const entry = `[${chunk.filename}]\n${chunk.content.trim()}`;
		// Sempre inclui ao menos o trecho de maior score; os demais só entram se couberem no budget.
		if (parts.length > 0 && usedChars + entry.length > budgetChars) continue;
		parts.push(entry);
		seen.add(chunk.chunkId);
		usedChars += entry.length;
	}

	if (parts.length === 0) return "";
	return (
		"Contexto recuperado da base de conhecimento (use se for útil; cite a origem quando fizer sentido):\n" +
		`"""\n${parts.join("\n\n---\n\n")}\n"""`
	);
};
