#!/usr/bin/env node
// Instagram Publisher — MCP server local que envolve o fluxo de publicação de carrossel do Instagram
// (mesma lógica do skill `instagram-publisher` do opensquad). Plain JS de propósito, igual
// `youtube.mjs`/`http-tool.mjs` — roda direto via `node`/`ELECTRON_RUN_AS_NODE=1`.
//
// Por que MCP e não um script `command`/`file`: no runner só tools `mcp`/`http`/`connector` recebem
// segredos injetados (via `.mcp.json` env — ver `buildMcpServerEntry` em runner.ts). Este server lê
// os 3 segredos do `env` do próprio processo, que o runner popula a partir do `env` do Script (com
// placeholders `$<secretId>` resolvidos contra o backend).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const IG_BASE = "https://graph.facebook.com/v21.0";

const textResult = (text) => ({ content: [{ type: "text", text }] });
const errorResult = (text) => ({ isError: true, content: [{ type: "text", text }] });

// ── imgBB (hospedagem pública temporária das imagens) ──────────
async function uploadToImgBB(imagePath, apiKey) {
	const fileBuffer = readFileSync(resolve(imagePath));
	const form = new FormData();
	form.append("key", apiKey);
	form.append("image", fileBuffer.toString("base64"));
	const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
	if (!res.ok) throw new Error(`imgBB upload falhou [${res.status}]: ${await res.text()}`);
	const json = await res.json();
	if (!json.success) throw new Error(`imgBB upload falhou: ${JSON.stringify(json)}`);
	return json.data.url;
}

// ── Instagram Graph API ────────────────────────────────────────
async function createChildContainer(userId, imageUrl, token) {
	const params = new URLSearchParams({ image_url: imageUrl, is_carousel_item: "true", access_token: token });
	const res = await fetch(`${IG_BASE}/${userId}/media?${params}`, { method: "POST" });
	if (!res.ok) throw new Error(`createChildContainer falhou [${res.status}]: ${await res.text()}`);
	return (await res.json()).id;
}

async function getContainerStatus(containerId, token) {
	const params = new URLSearchParams({ fields: "status_code", access_token: token });
	const res = await fetch(`${IG_BASE}/${containerId}?${params}`);
	if (!res.ok) throw new Error(`getContainerStatus falhou [${res.status}]: ${await res.text()}`);
	return (await res.json()).status_code;
}

async function pollUntilFinished(containerId, token, timeoutMs = 60_000, intervalMs = 3_000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const status = await getContainerStatus(containerId, token);
		if (status === "FINISHED") return;
		if (status === "ERROR") throw new Error(`Container ${containerId} entrou em estado ERROR`);
		await new Promise((r) => setTimeout(r, intervalMs));
	}
	throw new Error(`Container ${containerId} expirou após ${timeoutMs}ms`);
}

async function createCarouselContainer(userId, childIds, caption, token) {
	const params = new URLSearchParams({
		media_type: "CAROUSEL",
		children: childIds.join(","),
		caption,
		access_token: token,
	});
	const res = await fetch(`${IG_BASE}/${userId}/media?${params}`, { method: "POST" });
	if (!res.ok) throw new Error(`createCarouselContainer falhou [${res.status}]: ${await res.text()}`);
	return (await res.json()).id;
}

async function publishMedia(userId, containerId, token) {
	const params = new URLSearchParams({ creation_id: containerId, access_token: token });
	const res = await fetch(`${IG_BASE}/${userId}/media_publish?${params}`, { method: "POST" });
	if (!res.ok) throw new Error(`publishMedia falhou [${res.status}]: ${await res.text()}`);
	return (await res.json()).id;
}

async function getPermalink(mediaId, token) {
	const params = new URLSearchParams({ fields: "permalink", access_token: token });
	const res = await fetch(`${IG_BASE}/${mediaId}?${params}`);
	if (!res.ok) return null;
	return (await res.json()).permalink ?? null;
}

const publishLogPath = () => resolve(process.env.WORKESTRATOR_WORKSPACE_DIR || process.cwd(), ".instagram-publish-log.json");

const readPublishLog = () => {
	try {
		return existsSync(publishLogPath()) ? JSON.parse(readFileSync(publishLogPath(), "utf8")) : {};
	} catch {
		return {};
	}
};

const writePublishLog = (log) => writeFileSync(publishLogPath(), JSON.stringify(log, null, 2), "utf8");

async function publishCarousel({ images, caption, dryRun, idempotencyKey }) {
	if (images.length < 2 || images.length > 10) {
		throw new Error(`Carrossel do Instagram exige de 2 a 10 imagens (recebeu ${images.length}).`);
	}
	if (caption.length > 2200) {
		throw new Error(`Legenda excede o limite de 2200 caracteres do Instagram (tem ${caption.length}).`);
	}
	const { INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID, IMGBB_API_KEY } = process.env;
	if (!INSTAGRAM_ACCESS_TOKEN) throw new Error("INSTAGRAM_ACCESS_TOKEN não está definido no ambiente do tool.");
	if (!INSTAGRAM_USER_ID) throw new Error("INSTAGRAM_USER_ID não está definido no ambiente do tool.");
	if (!IMGBB_API_KEY) throw new Error("IMGBB_API_KEY não está definido no ambiente do tool (https://api.imgbb.com/).");
	const effectiveKey = idempotencyKey || createHash("sha256")
		.update(JSON.stringify({ userId: INSTAGRAM_USER_ID, images, caption }))
		.digest("hex");
	const publishLog = readPublishLog();
	if (publishLog[effectiveKey]?.postId) {
		return { ok: true, duplicatePrevented: true, idempotencyKey: effectiveKey, ...publishLog[effectiveKey] };
	}
	if (!dryRun && process.env.WORKESTRATOR_PUBLISH_APPROVED !== "true") {
		throw new Error("Publicação bloqueada: aprove o checkpoint do Workestrator antes de usar dryRun:false.");
	}

	const log = [];
	const imageUrls = await Promise.all(images.map((p) => uploadToImgBB(p, IMGBB_API_KEY)));
	log.push(`Upload imgBB: ${imageUrls.length} imagem(ns).`);

	const childIds = await Promise.all(
		imageUrls.map((url) => createChildContainer(INSTAGRAM_USER_ID, url, INSTAGRAM_ACCESS_TOKEN)),
	);
	await Promise.all(childIds.map((id) => pollUntilFinished(id, INSTAGRAM_ACCESS_TOKEN)));
	log.push(`Containers filhos prontos: ${childIds.join(", ")}.`);

	const carouselId = await createCarouselContainer(INSTAGRAM_USER_ID, childIds, caption, INSTAGRAM_ACCESS_TOKEN);
	await pollUntilFinished(carouselId, INSTAGRAM_ACCESS_TOKEN);
	log.push(`Container do carrossel pronto: ${carouselId}.`);

	if (dryRun) {
		return { ok: true, dryRun: true, idempotencyKey: effectiveKey, carouselId, imageUrls, log: [...log, "DRY RUN — publish final não chamado."] };
	}

	const postId = await publishMedia(INSTAGRAM_USER_ID, carouselId, INSTAGRAM_ACCESS_TOKEN);
	const permalink = await getPermalink(postId, INSTAGRAM_ACCESS_TOKEN);
	publishLog[effectiveKey] = { postId, permalink, publishedAt: new Date().toISOString() };
	writePublishLog(publishLog);
	return { ok: true, dryRun: false, idempotencyKey: effectiveKey, postId, permalink, imageUrls, log: [...log, `Publicado. Post ID ${postId}.`] };
}

const server = new McpServer({ name: "workestrator-instagram", version: "1.0.0" });

server.registerTool(
	"publish_carousel",
	{
		description:
			"Publica um carrossel (2 a 10 imagens JPEG locais) numa conta Instagram Business: sobe as imagens " +
			"pro imgBB, cria os containers via Graph API e publica. Use dryRun:true pra validar o fluxo sem postar.",
		inputSchema: {
			images: z
				.array(z.string())
				.min(2)
				.max(10)
				.describe("Caminhos locais das imagens JPEG, na ordem do carrossel (2 a 10)."),
			caption: z.string().max(2200).describe("Legenda do post (máx. 2200 caracteres)."),
			dryRun: z.boolean().optional().describe("Se true, prepara tudo mas não chama o publish final."),
			idempotencyKey: z.string().optional().describe("Chave estável do run para impedir publicação duplicada em retry."),
		},
	},
	async ({ images, caption, dryRun = true, idempotencyKey }) => {
		try {
			const result = await publishCarousel({ images, caption, dryRun, idempotencyKey });
			return textResult(JSON.stringify(result, null, 2));
		} catch (error) {
			return errorResult(error instanceof Error ? error.message : String(error));
		}
	},
);

const transport = new StdioServerTransport();
await server.connect(transport);
