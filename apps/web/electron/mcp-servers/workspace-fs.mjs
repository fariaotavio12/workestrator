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
			path: z.string().describe('Caminho relativo à pasta de trabalho, ex.: "output/slides/slide-01.html".'),
			content: z.string().describe("Conteúdo completo do arquivo."),
		},
	},
	async ({ path: relPath, content }) => {
		try {
			const filePath = resolveInWorkspace(relPath);
			await mkdir(path.dirname(filePath), { recursive: true });
			await writeFile(filePath, content, "utf-8");
			return textResult(`Arquivo "${relPath}" gravado (${content.length} caracteres).`);
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	},
);

server.registerTool(
	"read_file",
	{
		description: "Lê o conteúdo de um arquivo de texto da pasta de trabalho deste run.",
		inputSchema: { path: z.string().describe("Caminho relativo à pasta de trabalho.") },
	},
	async ({ path: relPath }) => {
		try {
			const filePath = resolveInWorkspace(relPath);
			if (!existsSync(filePath)) return errorResult(`Arquivo "${relPath}" não existe na pasta de trabalho.`);
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
			// Mesmo nome de parâmetro que write_file/read_file ("path", não "dir") de propósito — modelos
			// locais mais fracos assumem consistência entre as tools por analogia e chamam com o nome
			// errado quando os schemas divergem (observado: `workspace.list_files{path:"..."}`).
			path: z.string().optional().describe('Subpasta relativa (padrão: raiz da pasta de trabalho), ex.: "output".'),
		},
	},
	async ({ path: relPath }) => {
		try {
			const target = resolveInWorkspace(relPath ?? ".");
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
