import { describe, expect, it } from "vitest";
import type { ChunkSearchResult } from "@/features/security/knowledge/api";
import { buildRetrievalBlock } from "./knowledge-retrieval";

const chunk = (over: Partial<ChunkSearchResult> = {}): ChunkSearchResult => ({
	chunkId: "c1",
	documentId: "d1",
	filename: "doc.pdf",
	content: "conteúdo",
	score: 0.5,
	...over,
});

describe("buildRetrievalBlock", () => {
	it("retorna string vazia sem trechos", () => {
		expect(buildRetrievalBlock([])).toBe("");
	});

	it("cita a origem (filename) e o conteúdo do trecho", () => {
		const block = buildRetrievalBlock([chunk({ filename: "guia.pdf", content: "passo a passo" })]);
		expect(block).toContain("[guia.pdf]");
		expect(block).toContain("passo a passo");
		expect(block).toContain("Contexto recuperado da base de conhecimento");
	});

	it("ordena por score decrescente", () => {
		const block = buildRetrievalBlock([
			chunk({ chunkId: "a", filename: "baixo.pdf", score: 0.1 }),
			chunk({ chunkId: "b", filename: "alto.pdf", score: 0.9 }),
		]);
		expect(block.indexOf("[alto.pdf]")).toBeLessThan(block.indexOf("[baixo.pdf]"));
	});

	it("deduplica trechos pelo chunkId", () => {
		const block = buildRetrievalBlock([
			chunk({ chunkId: "dup", content: "unico" }),
			chunk({ chunkId: "dup", content: "unico" }),
		]);
		expect(block.match(/unico/g)?.length).toBe(1);
	});

	it("respeita o orçamento de tokens descartando os trechos de menor score", () => {
		const big = "x".repeat(4000); // ~1000 tokens por trecho
		const block = buildRetrievalBlock(
			[
				chunk({ chunkId: "top", filename: "top.pdf", content: big, score: 0.9 }),
				chunk({ chunkId: "mid", filename: "mid.pdf", content: big, score: 0.5 }),
				chunk({ chunkId: "low", filename: "low.pdf", content: big, score: 0.1 }),
			],
			1200, // ~4800 chars de budget — cabe só ~1 trecho grande
		);
		expect(block).toContain("[top.pdf]");
		expect(block).not.toContain("[low.pdf]");
	});

	it("sempre inclui ao menos o trecho de maior score mesmo se ele estourar o budget", () => {
		const huge = "y".repeat(10000);
		const block = buildRetrievalBlock([chunk({ chunkId: "only", filename: "grande.pdf", content: huge })], 100);
		expect(block).toContain("[grande.pdf]");
	});
});
