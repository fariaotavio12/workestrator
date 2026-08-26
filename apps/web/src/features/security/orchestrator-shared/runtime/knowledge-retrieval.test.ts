import { describe, expect, it } from "vitest";
import type { ChunkSearchResult } from "@/features/security/knowledge/api";
import { buildRetrievalBlock, buildRetrievalQuery } from "./knowledge-retrieval";

const chunk = (over: Partial<ChunkSearchResult> = {}): ChunkSearchResult => ({
	chunkId: "c1",
	documentId: "d1",
	collectionId: "col1",
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

	it("garante uma vaga para cada base antes de completar por score", () => {
		// Cenário real: a base de lições do treinamento pontua mais alto que a base de negócio, porque foi
		// gerada a partir do próprio run. Sem a reserva por base, ela levava as 5 vagas sozinha.
		const block = buildRetrievalBlock([
			chunk({ chunkId: "l1", collectionId: "licoes", filename: "licao-1.md", score: 0.98 }),
			chunk({ chunkId: "l2", collectionId: "licoes", filename: "licao-2.md", score: 0.97 }),
			chunk({ chunkId: "l3", collectionId: "licoes", filename: "licao-3.md", score: 0.96 }),
			chunk({ chunkId: "e1", collectionId: "executores", filename: "executores-ti.csv", score: 0.42 }),
		]);
		expect(block).toContain("[executores-ti.csv]");
	});

	it("mantém a base de menor score mesmo quando a outra estoura o orçamento sozinha", () => {
		const big = "x".repeat(4000);
		const block = buildRetrievalBlock(
			[
				chunk({ chunkId: "l1", collectionId: "licoes", filename: "licao.md", content: big, score: 0.9 }),
				chunk({
					chunkId: "e1",
					collectionId: "executores",
					filename: "executores.csv",
					content: "Ana, Beto",
					score: 0.3,
				}),
			],
			1100, // ~4400 chars — cabe o trecho grande e ainda sobra pro pequeno
		);
		expect(block).toContain("[licao.md]");
		expect(block).toContain("[executores.csv]");
	});
});

describe("buildRetrievalQuery", () => {
	const agent = { name: "Bruno", role: "aciona o executor certo do T.I." };

	it("põe identidade e briefing do agente antes da saída do passo anterior", () => {
		const query = buildRetrievalQuery(agent, "abrir chamado de rede", "resultado do passo anterior");
		expect(query.indexOf("Bruno")).toBeLessThan(query.indexOf("resultado do passo anterior"));
		expect(query).toContain("aciona o executor certo do T.I.");
		expect(query).toContain("abrir chamado de rede");
	});

	it("trunca a saída do passo anterior no orçamento, preservando identidade e briefing", () => {
		const query = buildRetrievalQuery(agent, "abrir chamado", "z".repeat(5000), 200);
		expect(query.length).toBeLessThanOrEqual(201);
		expect(query).toContain("Bruno");
		expect(query).toContain("abrir chamado");
	});

	it("ainda consulta quando só há a saída do passo anterior", () => {
		const query = buildRetrievalQuery({ name: "Bruno" }, undefined, "lista de chamados");
		expect(query).toContain("Bruno");
		expect(query).toContain("lista de chamados");
	});

	it("não devolve consulta vazia quando o passo anterior veio vazio", () => {
		// O bug do `??`: string vazia não caía no briefing e a busca era pulada em silêncio.
		expect(buildRetrievalQuery(agent, "abrir chamado de rede", "")).toContain("abrir chamado de rede");
	});
});
