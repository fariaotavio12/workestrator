import type { ChunkSearchResult } from "@/features/security/knowledge/api";

/** ~4 chars por token — mesma aproximação usada no chunking do backend. */
const CHARS_PER_TOKEN = 4;

/** Orçamento padrão do bloco de contexto recuperado, em tokens. Mantém o prompt previsível. */
export const DEFAULT_RETRIEVAL_BUDGET_TOKENS = 1800;

/**
 * Monta o bloco "Contexto recuperado da base de conhecimento" com orçamento **rígido** de tokens:
 * inclui os trechos de maior score até esgotar o budget, deduplica por `chunkId` e cita a origem
 * (`filename`) de cada trecho. Isso mantém o contexto injetado limitado e previsível,
 * independentemente do tamanho da base — evitando estouro de contexto. Retorna "" quando não há nada
 * a injetar.
 */
export const buildRetrievalBlock = (
	chunks: ChunkSearchResult[],
	budgetTokens: number = DEFAULT_RETRIEVAL_BUDGET_TOKENS,
): string => {
	if (chunks.length === 0) return "";

	const budgetChars = budgetTokens * CHARS_PER_TOKEN;
	const ordered = [...chunks].sort((a, b) => b.score - a.score);
	const seen = new Set<string>();
	const parts: string[] = [];
	let usedChars = 0;

	for (const chunk of ordered) {
		if (seen.has(chunk.chunkId)) continue;
		const entry = `[${chunk.filename}]\n${chunk.content.trim()}`;
		// Sempre inclui ao menos o trecho de maior score; os demais só entram se couberem no budget.
		if (parts.length > 0 && usedChars + entry.length > budgetChars) break;
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
