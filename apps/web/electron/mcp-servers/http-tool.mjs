#!/usr/bin/env node
// Servidor MCP local genérico "http-tool" (Etapa 3 do plano) — o runner spawna um processo desse
// arquivo por agent/run que tenha scripts `kind: "http"` anexados, passando a definição de cada
// tool via env var (JSON) em vez de argumentos de linha de comando (evita limite de tamanho e
// escaping de aspas). Plain JS (não TS) de propósito: roda direto via `node`/Electron
// `ELECTRON_RUN_AS_NODE=1`, sem precisar de um passo de build/transpile separado.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/** @typedef {{ name: string, description?: string, method: string, urlTemplate: string, headers?: Record<string,string>, bodySchema?: string, responseMap?: string }} HttpToolDef */

/** @type {HttpToolDef[]} */
const toolDefs = JSON.parse(process.env.WORKESTRATOR_HTTP_TOOL_CONFIG ?? "[]");

/** Substitui `{{variavel}}` na URL pelos valores informados na chamada da tool. */
const applyUrlTemplate = (template, variables) =>
	template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key) => (variables?.[key] != null ? String(variables[key]) : ""));

/** Extrai um caminho tipo "data.items" de um objeto — melhor esforço, sem dependência externa. */
const extractPath = (value, dotPath) => {
	if (!dotPath?.trim()) return value;
	return dotPath
		.split(".")
		.reduce((acc, key) => (acc != null && typeof acc === "object" ? acc[key] : undefined), value);
};

const server = new McpServer({ name: "workestrator-http-tool", version: "1.0.0" });

for (const def of toolDefs) {
	server.registerTool(
		def.name,
		{
			description: def.description
				? `${def.description} (${def.method} ${def.urlTemplate})`
				: `Request declarativo: ${def.method} ${def.urlTemplate}`,
			inputSchema: {
				variables: z
					.record(z.string(), z.string())
					.optional()
					.describe("Valores para substituir {{placeholders}} na URL."),
				body: z.unknown().optional().describe("Corpo da requisição (JSON), quando o método aceitar body."),
			},
		},
		async ({ variables, body }) => {
			const url = applyUrlTemplate(def.urlTemplate, variables);
			try {
				const res = await fetch(url, {
					method: def.method || "GET",
					headers: { "Content-Type": "application/json", ...(def.headers ?? {}) },
					body: body !== undefined && def.method !== "GET" ? JSON.stringify(body) : undefined,
				});
				const raw = await res.text();
				let parsed;
				try {
					parsed = JSON.parse(raw);
				} catch {
					parsed = raw;
				}
				if (!res.ok) {
					return {
						isError: true,
						content: [{ type: "text", text: `HTTP ${res.status}: ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}` }],
					};
				}
				const mapped = extractPath(parsed, def.responseMap);
				return { content: [{ type: "text", text: typeof mapped === "string" ? mapped : JSON.stringify(mapped, null, 2) }] };
			} catch (error) {
				return { isError: true, content: [{ type: "text", text: `Falha ao chamar ${url}: ${error instanceof Error ? error.message : error}` }] };
			}
		},
	);
}

const transport = new StdioServerTransport();
await server.connect(transport);
