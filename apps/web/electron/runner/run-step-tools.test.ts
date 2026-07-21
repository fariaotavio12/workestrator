/**
 * Integração da fiação completa de tool calling num provider OpenAI-compat: `handleRunStep` →
 * `resolveOpenAiTools` → loop do `callOpenAiCompat` → execução da tool → resposta final.
 *
 * Os testes unitários cobrem o loop isolado; este cobre o caminho que estava quebrado de verdade —
 * as ferramentas do agent não chegavam no payload do modelo, então ele nunca conseguia usá-las e o
 * passo não fechava. Sobe dois servidores efêmeros em loopback (o "modelo" e a API que a tool
 * chama), sem rede externa.
 */
import { createServer, type Server } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { handleRunStep } from "./runner";

type Listening = { server: Server; port: number };

const listen = (handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<Listening> =>
	new Promise((resolve) => {
		const server = createServer(handler);
		server.listen(0, "127.0.0.1", () => resolve({ server, port: (server.address() as { port: number }).port }));
	});

describe("E2E: agent Ollama com tool HTTP anexada", () => {
	it("chama a tool de verdade e devolve a resposta final", async () => {
		let serpapiHits = 0;
		let serpapiUrl = "";
		const serpapi = await listen((req, res) => {
			serpapiHits++;
			serpapiUrl = req.url ?? "";
			res.setHeader("content-type", "application/json");
			res.end(JSON.stringify({ organic_results: [{ title: "Edital TI - TRF1", link: "https://trf1.jus.br/edital" }] }));
		});

		// "Ollama": 1ª chamada pede a tool, 2ª devolve o texto final.
		let chatCalls = 0;
		const sawToolResult: string[] = [];
		const ollama = await listen((req, res) => {
			if (req.url?.includes("/models")) {
				res.setHeader("content-type", "application/json");
				res.end(JSON.stringify({ data: [{ id: "qwen3" }] }));
				return;
			}
			let raw = "";
			req.on("data", (c) => (raw += c));
			req.on("end", () => {
				const body = JSON.parse(raw) as { tools?: unknown[]; messages: { role: string; content: string }[] };
				chatCalls++;
				res.setHeader("content-type", "text/event-stream");
				if (chatCalls === 1) {
					// A tool HTTP e as quatro tools built-in de workspace precisam chegar juntas ao modelo.
					expect(body.tools).toHaveLength(5);
					expect(
						body.tools?.some(
							(tool) => (tool as { function?: { name?: string } }).function?.name === "buscar-editais",
						),
					).toBe(true);
					const call = { index: 0, id: "call_1", function: { name: "buscar-editais", arguments: '{"variables":{"query":"concursos TI"}}' } };
					res.end(`data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [call] } }] })}\n\ndata: [DONE]\n\n`);
					return;
				}
				sawToolResult.push(body.messages.filter((m) => m.role === "tool").map((m) => m.content).join(""));
				res.end(`data: ${JSON.stringify({ choices: [{ delta: { content: "- Edital TI - TRF1" } }] })}\n\ndata: [DONE]\n\n`);
			});
		});

		const events: { event: string; data: Record<string, unknown> }[] = [];
		const payload = JSON.stringify({
			providerKind: "openai-compat",
			baseUrl: `http://127.0.0.1:${ollama.port}/v1`,
			model: "qwen3",
			systemPrompt: "Você é o Pesquisador de Concursos.",
			prompt: "Busque concursos de TI abertos.",
			canExecute: true,
			scripts: [
				{
					id: "s1",
					name: "buscar editais",
					description: "Busca editais via SerpApi",
					kind: "http",
					method: "GET",
					urlTemplate: `http://127.0.0.1:${serpapi.port}/search.json?q={{query}}`,
					responseMap: "organic_results",
				},
			],
		});
		const req = Object.assign(Readable.from([payload]), { method: "POST" }) as unknown as IncomingMessage;

		const res = {
			statusCode: 0,
			writableEnded: false,
			setHeader: () => {},
			flushHeaders: () => {},
			write: (chunk: string) => {
				events.push({
					event: chunk.match(/^event: (.+)$/m)?.[1] ?? "",
					data: JSON.parse(chunk.match(/^data: (.+)$/m)?.[1] ?? "{}"),
				});
				return true;
			},
			end: () => {
				(res as { writableEnded: boolean }).writableEnded = true;
			},
		} as unknown as ServerResponse;

		await handleRunStep(req, res);

		serpapi.server.close();
		ollama.server.close();

		// A tool foi chamada de verdade, com o termo de busca preenchido pelo modelo.
		expect(serpapiHits).toBe(1);
		expect(serpapiUrl).toContain("q=concursos%20TI");
		// O resultado da tool voltou pro modelo na 2ª rodada.
		expect(sawToolResult[0]).toContain("TRF1");
		// A UI recebeu atividade de ferramenta e a resposta final.
		expect(events.find((e) => e.event === "tool_use")?.data).toMatchObject({ name: "buscar-editais" });
		expect(events.find((e) => e.event === "tool_result")?.data).toMatchObject({ ok: true });
		expect(events.find((e) => e.event === "done")?.data).toMatchObject({ output: "- Edital TI - TRF1" });
	});
});
