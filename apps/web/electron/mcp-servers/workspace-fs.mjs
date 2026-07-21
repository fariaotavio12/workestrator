#!/usr/bin/env node
// MCP server built-in de filesystem + renderização de slides, sempre disponível pra agents
// `canExecute` em providers openai-compat (Ollama/vLLM/...) — ao contrário da Claude CLI, esses
// providers não ganham Bash/Read/Write nativo com `canExecute`, então sem isso o agent só descrevia
// arquivos em texto e nunca os gravava de verdade. Injetado incondicionalmente por `runner.ts`
// (`resolveOpenAiTools`), independente de o agent ter algum script `mcp` anexado — ver plano de
// correção do squad de carrossel. Mesma convenção de `http-tool.mjs`/`youtube.mjs`: plain JS, roda
// via `node`/`ELECTRON_RUN_AS_NODE=1`.
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const WORKSPACE_DIR = process.env.WORKESTRATOR_WORKSPACE_DIR;
if (!WORKSPACE_DIR) {
	console.error("WORKESTRATOR_WORKSPACE_DIR não definida — encerrando.");
	process.exit(1);
}

const textResult = (text) => ({ content: [{ type: "text", text }] });
const errorResult = (text) => ({ isError: true, content: [{ type: "text", text }] });

/** Resolve um caminho relativo dentro do workspace — nunca deixa escapar via `..`/caminho absoluto. */
const resolveInWorkspace = (relPath) => {
	const resolved = path.resolve(WORKSPACE_DIR, relPath);
	if (resolved !== WORKSPACE_DIR && !resolved.startsWith(WORKSPACE_DIR + path.sep)) {
		throw new Error(`Caminho "${relPath}" sai da pasta de trabalho — não permitido.`);
	}
	return resolved;
};

const listFilesRecursive = (dir, base = dir) => {
	const out = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === ".git" || entry.name === "node_modules") continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...listFilesRecursive(full, base));
		else out.push(path.relative(base, full).split(path.sep).join("/"));
	}
	return out;
};

const server = new McpServer({ name: "workestrator-workspace-fs", version: "1.0.0" });

server.registerTool(
	"write_file",
	{
		description: "Grava um arquivo de texto na pasta de trabalho deste run (cria pastas pai se preciso).",
		inputSchema: {
			// Todos os parâmetros de localização/conteúdo aceitam sinônimos comuns (ver list_files acima
			// pra contexto) — um nome fora do schema é descartado sem erro, então é melhor cobrir os
			// sinônimos óbvios do que confiar que o modelo sempre usa o nome exato.
			path: z.string().optional().describe('Caminho relativo à pasta de trabalho, ex.: "output/slides/slide-01.html".'),
			file: z.string().optional().describe('Alias de "path".'),
			filepath: z.string().optional().describe('Alias de "path".'),
			content: z.string().optional().describe("Conteúdo completo do arquivo."),
			text: z.string().optional().describe('Alias de "content".'),
		},
	},
	async ({ path: relPath, file, filepath, content, text }) => {
		try {
			const target = relPath ?? file ?? filepath;
			const body = content ?? text;
			if (!target) return errorResult('Parâmetro obrigatório faltando: informe "path" com o caminho do arquivo.');
			if (body == null) return errorResult('Parâmetro obrigatório faltando: informe "content" com o conteúdo do arquivo.');
			const filePath = resolveInWorkspace(target);
			await mkdir(path.dirname(filePath), { recursive: true });
			await writeFile(filePath, body, "utf-8");
			return textResult(`Arquivo "${target}" gravado (${body.length} caracteres).`);
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	},
);

server.registerTool(
	"read_file",
	{
		description: "Lê o conteúdo de um arquivo de texto da pasta de trabalho deste run.",
		inputSchema: {
			path: z.string().optional().describe("Caminho relativo à pasta de trabalho."),
			file: z.string().optional().describe('Alias de "path".'),
			filepath: z.string().optional().describe('Alias de "path".'),
		},
	},
	async ({ path: relPath, file, filepath }) => {
		try {
			const target = relPath ?? file ?? filepath;
			if (!target) return errorResult('Parâmetro obrigatório faltando: informe "path" com o caminho do arquivo.');
			const filePath = resolveInWorkspace(target);
			if (!existsSync(filePath)) return errorResult(`Arquivo "${target}" não existe na pasta de trabalho.`);
			return textResult(await readFile(filePath, "utf-8"));
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	},
);

server.registerTool(
	"list_files",
	{
		description: "Lista (recursivo) os arquivos que já existem de verdade na pasta de trabalho deste run.",
		inputSchema: {
			// Aceita "path" (mesmo nome de write_file/read_file) e os sinônimos mais comuns que modelos
			// locais mais fracos chamam por conta própria — sem isso, um parâmetro com nome diferente do
			// schema é simplesmente descartado pela validação (some silenciosamente), a tool cai no default
			// e lista o workspace inteiro em vez da pasta pedida, sem nenhum erro visível (observado ao
			// vivo: `workspace__list_files{directory:"output/slides/"}`).
			path: z.string().optional().describe('Subpasta relativa (padrão: raiz da pasta de trabalho), ex.: "output".'),
			dir: z.string().optional().describe('Alias de "path".'),
			directory: z.string().optional().describe('Alias de "path".'),
			folder: z.string().optional().describe('Alias de "path".'),
		},
	},
	async ({ path: relPath, dir, directory, folder }) => {
		try {
			const target = resolveInWorkspace(relPath ?? dir ?? directory ?? folder ?? ".");
			if (!existsSync(target)) return textResult("[]");
			return textResult(JSON.stringify(listFilesRecursive(target), null, 2));
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	},
);

server.registerTool(
	"render_slides",
	{
		description:
			"Renderiza sozinho todo HTML de uma pasta (padrão output/slides) em imagens JPEG (padrão output/images), " +
			"na ordem alfabética dos nomes de arquivo. Não precisa de URL file:// nem de navegação/screenshot manual.",
		inputSchema: {
			inputDir: z.string().optional().describe('Pasta com os HTMLs (padrão "output/slides").'),
			outputDir: z.string().optional().describe('Pasta de destino dos JPEGs (padrão "output/images").'),
			width: z.number().int().positive().optional().describe("Largura do viewport em pixels (padrão 1080)."),
			height: z.number().int().positive().optional().describe("Altura do viewport em pixels (padrão 1440)."),
		},
	},
	async ({ inputDir = "output/slides", outputDir = "output/images", width = 1080, height = 1440 }) => {
		let chromium;
		try {
			({ chromium } = await import("playwright"));
		} catch {
			return errorResult('Playwright não está instalado. Rode "npm install" no projeto e tente de novo.');
		}
		try {
			const srcDir = resolveInWorkspace(inputDir);
			const destDir = resolveInWorkspace(outputDir);
			if (!existsSync(srcDir)) return errorResult(`Pasta "${inputDir}" não existe — nenhum HTML pra renderizar.`);
			const htmlFiles = readdirSync(srcDir)
				.filter((f) => f.toLowerCase().endsWith(".html"))
				.sort();
			if (htmlFiles.length === 0) return errorResult(`Nenhum arquivo .html encontrado em "${inputDir}".`);
			await mkdir(destDir, { recursive: true });

			const browser = await chromium.launch();
			try {
				const page = await browser.newPage({ viewport: { width, height } });
				const generated = [];
				for (const file of htmlFiles) {
					const jpgName = file.replace(/\.html?$/i, ".jpg");
					await page.goto(`file://${path.join(srcDir, file)}`);
					await page.screenshot({ path: path.join(destDir, jpgName), type: "jpeg" });
					generated.push(path.join(outputDir, jpgName).split(path.sep).join("/"));
				}
				return textResult(JSON.stringify(generated, null, 2));
			} finally {
				await browser.close();
			}
		} catch (error) {
			const detail = error instanceof Error ? error.message : String(error);
			if (/executable doesn.?t exist|browsertype\.launch/i.test(detail)) {
				return errorResult(
					`O navegador do Playwright não está instalado nesta máquina. Rode "npx playwright install chromium" e tente de novo. Detalhe: ${detail}`,
				);
			}
			return errorResult(detail);
		}
	},
);

const transport = new StdioServerTransport();
await server.connect(transport);
