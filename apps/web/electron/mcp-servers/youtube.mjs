#!/usr/bin/env node
// Conector YouTube (Etapa 4 do plano) — MCP server local que envolve o binário `yt-dlp` já
// instalado na máquina (não empacotado com o app: licença/tamanho/atualização do próprio yt-dlp
// ficam por conta do usuário, mesma filosofia dos CLIs de provider em `electron/runner/runner.ts`).
// Plain JS de propósito, igual `http-tool.mjs` — roda direto via `node`/`ELECTRON_RUN_AS_NODE=1`.
//
// Sem API key, sem servidor próprio: cada tool spawna `yt-dlp` com as flags certas e devolve o
// JSON que ele já produz. Modo "oficial" (Data API v3) é opcional — só liga se
// WORKESTRATOR_YOUTUBE_API_KEY estiver definida (`search_official`/`get_metadata_official`),
// cobrindo o caso de compliance/metadados estruturados sem depender de scraping.
import { spawn } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const YT_DLP_BIN = process.env.WORKESTRATOR_YT_DLP_BIN || "yt-dlp";
const YOUTUBE_API_KEY = process.env.WORKESTRATOR_YOUTUBE_API_KEY;
const YOUTUBE_DATA_API_BASE = "https://www.googleapis.com/youtube/v3";

/** Aceita URL completa (watch?v=, youtu.be/, shorts/) ou já o ID de 11 caracteres. */
const extractVideoId = (urlOrId) => {
	const match = /(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/.exec(urlOrId);
	return match?.[1] ?? urlOrId;
};

/** Roda `yt-dlp` e devolve stdout — lança com uma mensagem legível se o binário não existir no PATH. */
const runYtDlp = (args) =>
	new Promise((resolve, reject) => {
		const child = spawn(YT_DLP_BIN, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
		child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
		child.on("error", (err) => {
			reject(
				new Error(
					`"${YT_DLP_BIN}" não encontrado no PATH (${err.message}). Instale com "pip install yt-dlp" ou defina ` +
						"WORKESTRATOR_YT_DLP_BIN com o caminho do binário.",
				),
			);
		});
		child.on("close", (code) => {
			if (code !== 0) {
				reject(new Error(stderr.trim() || `yt-dlp saiu com código ${code} sem saída.`));
				return;
			}
			resolve(stdout);
		});
	});

const textResult = (text) => ({ content: [{ type: "text", text }] });
const errorResult = (text) => ({ isError: true, content: [{ type: "text", text }] });

const server = new McpServer({ name: "workestrator-youtube", version: "1.0.0" });

server.registerTool(
	"search",
	{
		description: "Busca vídeos no YouTube por termo (via yt-dlp, sem API key).",
		inputSchema: {
			query: z.string().describe("Termo de busca."),
			limit: z.number().int().positive().max(25).optional().describe("Quantidade de resultados (padrão 5)."),
		},
	},
	async ({ query, limit = 5 }) => {
		try {
			const stdout = await runYtDlp([`ytsearch${limit}:${query}`, "--dump-json", "--no-warnings", "--flat-playlist"]);
			const results = stdout
				.trim()
				.split("\n")
				.filter(Boolean)
				.map((line) => JSON.parse(line))
				.map((r) => ({ id: r.id, title: r.title, url: r.url ?? `https://www.youtube.com/watch?v=${r.id}`, duration: r.duration }));
			return textResult(JSON.stringify(results, null, 2));
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	},
);

server.registerTool(
	"get_metadata",
	{
		description: "Metadados de um vídeo (título, canal, duração, views, descrição) via yt-dlp.",
		inputSchema: { url: z.string().describe("URL ou ID do vídeo do YouTube.") },
	},
	async ({ url }) => {
		try {
			const stdout = await runYtDlp([url, "--dump-json", "--no-warnings", "--skip-download"]);
			const info = JSON.parse(stdout);
			const metadata = {
				id: info.id,
				title: info.title,
				channel: info.channel ?? info.uploader,
				duration: info.duration,
				viewCount: info.view_count,
				uploadDate: info.upload_date,
				description: info.description,
			};
			return textResult(JSON.stringify(metadata, null, 2));
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	},
);

server.registerTool(
	"get_transcript",
	{
		description:
			"Transcript/legenda de um vídeo (prioriza legenda manual, cai para auto-caption) via yt-dlp. " +
			"Sem fallback de Whisper nesta versão — vídeo sem nenhuma legenda retorna erro (ver plano Etapa 4).",
		inputSchema: {
			url: z.string().describe("URL ou ID do vídeo do YouTube."),
			lang: z.string().optional().describe("Idioma da legenda (padrão \"en\")."),
		},
	},
	async ({ url, lang = "en" }) => {
		try {
			const stdout = await runYtDlp([
				url,
				"--skip-download",
				"--write-sub",
				"--write-auto-sub",
				"--sub-lang",
				lang,
				"--sub-format",
				"json3",
				"--dump-json",
				"--no-warnings",
			]);
			const info = JSON.parse(stdout.trim().split("\n").pop() ?? "{}");
			const subs = info.subtitles?.[lang] ?? info.automatic_captions?.[lang];
			if (!subs) {
				return errorResult(
					`Nenhuma legenda em "${lang}" encontrada para este vídeo. Sem fallback de transcrição por áudio ` +
						"(Whisper) implementado — ver plano Etapa 4.",
				);
			}
			return textResult(
				`Legenda disponível em ${subs.map((s) => s.ext).join(", ")} — este server só confirma a existência; baixe ` +
					"a URL diretamente pra obter o conteúdo completo:\n" +
					JSON.stringify(subs, null, 2),
			);
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	},
);

server.registerTool(
	"get_comments",
	{
		description: "Comentários de um vídeo via yt-dlp (--write-comments).",
		inputSchema: {
			url: z.string().describe("URL ou ID do vídeo do YouTube."),
			limit: z.number().int().positive().max(100).optional().describe("Quantidade de comentários (padrão 20)."),
		},
	},
	async ({ url, limit = 20 }) => {
		try {
			const stdout = await runYtDlp([url, "--skip-download", "--write-comments", "--dump-json", "--no-warnings"]);
			const info = JSON.parse(stdout);
			const comments = (info.comments ?? []).slice(0, limit).map((c) => ({
				author: c.author,
				text: c.text,
				likeCount: c.like_count,
			}));
			return textResult(JSON.stringify(comments, null, 2));
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	},
);

// Modo "oficial" (Data API v3) — só registra se houver key. Quota: search.list custa 100 unidades
// (10k/dia padrão), videos.list custa 1 — ver plano §2.4. Só metadados de qualquer vídeo público;
// não cobre legenda/transcript de vídeo de terceiro (a API não expõe isso, ver pesquisa do plano).
if (YOUTUBE_API_KEY) {
	server.registerTool(
		"search_official",
		{
			description: "Busca vídeos via YouTube Data API v3 (oficial, com key — custa 100 unidades de quota por chamada).",
			inputSchema: {
				query: z.string().describe("Termo de busca."),
				limit: z.number().int().positive().max(25).optional().describe("Quantidade de resultados (padrão 5)."),
			},
		},
		async ({ query, limit = 5 }) => {
			try {
				const url = `${YOUTUBE_DATA_API_BASE}/search?part=snippet&type=video&maxResults=${limit}&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
				const res = await fetch(url);
				const body = await res.json();
				if (!res.ok) return errorResult(`YouTube Data API v3: ${body.error?.message ?? `HTTP ${res.status}`}`);
				const results = (body.items ?? []).map((item) => ({
					id: item.id.videoId,
					title: item.snippet.title,
					channel: item.snippet.channelTitle,
					url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
				}));
				return textResult(JSON.stringify(results, null, 2));
			} catch (error) {
				return errorResult(error instanceof Error ? error.message : String(error));
			}
		},
	);

	server.registerTool(
		"get_metadata_official",
		{
			description:
				"Metadados estruturados de um vídeo via YouTube Data API v3 (oficial, com key — custa 1 unidade de quota).",
			inputSchema: { url: z.string().describe("URL ou ID do vídeo do YouTube.") },
		},
		async ({ url }) => {
			try {
				const videoId = extractVideoId(url);
				const apiUrl = `${YOUTUBE_DATA_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
				const res = await fetch(apiUrl);
				const body = await res.json();
				if (!res.ok) return errorResult(`YouTube Data API v3: ${body.error?.message ?? `HTTP ${res.status}`}`);
				const video = body.items?.[0];
				if (!video) return errorResult(`Vídeo "${videoId}" não encontrado (removido, privado, ou ID inválido).`);
				const metadata = {
					id: video.id,
					title: video.snippet.title,
					channel: video.snippet.channelTitle,
					duration: video.contentDetails.duration,
					viewCount: video.statistics.viewCount,
					likeCount: video.statistics.likeCount,
					uploadDate: video.snippet.publishedAt,
					description: video.snippet.description,
				};
				return textResult(JSON.stringify(metadata, null, 2));
			} catch (error) {
				return errorResult(error instanceof Error ? error.message : String(error));
			}
		},
	);
}

const transport = new StdioServerTransport();
await server.connect(transport);
