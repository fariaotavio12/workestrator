#!/usr/bin/env node
// Instagram Publisher — MCP server local que envolve o fluxo de publicação de carrossel do Instagram
// (mesma lógica do skill `instagram-publisher` do opensquad). Plain JS de propósito, igual
// `youtube.mjs`/`http-tool.mjs` — roda direto via `node`/`ELECTRON_RUN_AS_NODE=1`.
//
// Por que MCP e não um script `command`/`file`: no runner só tools `mcp`/`http`/`connector` recebem
// segredos injetados (via `.mcp.json` env — ver `buildMcpServerEntry` em runner.ts). Este server lê
// os 3 segredos do `env` do próprio processo, que o runner popula a partir do `env` do Script (com
// placeholders `$<secretId>` resolvidos contra o backend).
import { closeSync, existsSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
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

const publishLogPath = () =>
	resolve(process.env.WORKESTRATOR_WORKSPACE_DIR || process.cwd(), ".instagram-publish-log.json");

const readPublishLog = () => {
	try {
		return existsSync(publishLogPath()) ? JSON.parse(readFileSync(publishLogPath(), "utf8")) : {};
	} catch {
		return {};
	}
};

const writePublishLog = (log) => writeFileSync(publishLogPath(), JSON.stringify(log, null, 2), "utf8");

const findInstalledBrowser = () => {
	const candidates = [
		process.env.IG_BROWSER,
		"C:/Program Files/Google/Chrome/Application/chrome.exe",
		"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
		"C:/Program Files/Microsoft/Edge/Application/msedge.exe",
		"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	];
	return candidates.find((candidate) => candidate && existsSync(candidate));
};

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

const acquireProfileLock = async (profileDir) => {
	const lockPath = `${profileDir}.publish.lock`;
	for (let attempt = 0; attempt < 240; attempt += 1) {
		try {
			const descriptor = openSync(lockPath, "wx");
			return () => {
				closeSync(descriptor);
				try {
					unlinkSync(lockPath);
				} catch {
					// The lock was already cleaned up.
				}
			};
		} catch (error) {
			if (error?.code !== "EEXIST") throw error;
			try {
				if (Date.now() - statSync(lockPath).mtimeMs > 15 * 60 * 1000) unlinkSync(lockPath);
			} catch {
				// Another process may have released it between checks.
			}
			await sleep(500);
		}
	}
	throw new Error("A conta do Instagram já está sendo usada por outra publicação. Tente novamente em instantes.");
};

const clickFirstVisible = async (page, names, timeout = 15_000) => {
	for (const name of names) {
		const candidates = [
			page.getByRole("button", { name }),
			page.getByRole("link", { name }),
			page.getByText(name, { exact: true }),
		];
		for (const candidate of candidates) {
			try {
				await candidate.first().click({ timeout: 1_500 });
				return;
			} catch {
				// Try the next selector/language.
			}
		}
	}
	throw new Error(`Não encontrei a ação esperada no Instagram (${names.map(String).join(" / ")}) após ${timeout}ms.`);
};

const dismissOptionalPrompts = async (page) => {
	for (const name of [/agora não/i, /not now/i, /cancelar/i]) {
		try {
			await page.getByRole("button", { name }).first().click({ timeout: 800 });
		} catch {
			// Prompt is optional.
		}
	}
};

const publishCarouselWithBrowser = async ({ profileDir, images, caption }) => {
	const releaseLock = await acquireProfileLock(profileDir);
	process.env.PLAYWRIGHT_BROWSERS_PATH ??= "0";
	let context;
	try {
		const { chromium } = await import("playwright");
		const executablePath = findInstalledBrowser();
		context = await chromium.launchPersistentContext(profileDir, {
			headless: false,
			...(executablePath ? { executablePath } : {}),
			viewport: null,
			args: ["--no-first-run", "--no-default-browser-check", "--disable-blink-features=AutomationControlled"],
		});
		const page = context.pages()[0] ?? (await context.newPage());
		await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 45_000 });
		await dismissOptionalPrompts(page);
		const userCookie = (await context.cookies("https://www.instagram.com")).find(
			(cookie) => cookie.name === "ds_user_id" && cookie.value,
		);
		if (!userCookie) throw new Error("A sessão local do Instagram expirou. Reconecte essa conta no Workestrator.");

		await clickFirstVisible(page, [/criar/i, /create/i, /nova publicação/i, /new post/i]);
		const fileInput = page.locator('input[type="file"]').last();
		await fileInput.waitFor({ state: "attached", timeout: 15_000 });
		await fileInput.setInputFiles(images);
		await clickFirstVisible(page, [/avançar/i, /next/i]);
		await clickFirstVisible(page, [/avançar/i, /next/i]);

		const captionInput = page.locator('textarea, div[contenteditable="true"][role="textbox"]').last();
		await captionInput.waitFor({ state: "visible", timeout: 15_000 });
		await captionInput.fill(caption);
		await clickFirstVisible(page, [/compartilhar/i, /share/i]);
		await page.getByText(/sua publicação foi compartilhada|your post has been shared/i).waitFor({
			state: "visible",
			timeout: 90_000,
		});
		const permalink = await page
			.locator('a[href*="/p/"]')
			.first()
			.getAttribute("href")
			.catch(() => null);
		return {
			postId: `browser-${Date.now()}`,
			permalink: permalink ? new URL(permalink, "https://www.instagram.com").toString() : null,
		};
	} finally {
		if (context) await context.close().catch(() => undefined);
		releaseLock();
	}
};

async function publishCarousel({ images, caption, dryRun, idempotencyKey }) {
	if (images.length < 2 || images.length > 10) {
		throw new Error(`Carrossel do Instagram exige de 2 a 10 imagens (recebeu ${images.length}).`);
	}
	if (caption.length > 2200) {
		throw new Error(`Legenda excede o limite de 2200 caracteres do Instagram (tem ${caption.length}).`);
	}
	const resolvedImages = images.map((imagePath) => resolve(imagePath));
	for (const imagePath of resolvedImages) {
		if (!existsSync(imagePath)) throw new Error(`Imagem não encontrada: ${imagePath}`);
		if (!/\.(jpe?g|png)$/i.test(imagePath)) throw new Error(`Formato não suportado: ${imagePath}. Use JPEG ou PNG.`);
	}
	const { INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID, IMGBB_API_KEY } = process.env;
	const browserProfileDir = process.env.INSTAGRAM_PROFILE_DIR;
	if (!browserProfileDir && !INSTAGRAM_ACCESS_TOKEN) {
		throw new Error("Nenhuma sessão local ou token do Instagram foi associado a esta ferramenta.");
	}
	if (!browserProfileDir && !INSTAGRAM_USER_ID)
		throw new Error("INSTAGRAM_USER_ID não está definido no ambiente do tool.");
	if (!browserProfileDir && !IMGBB_API_KEY) {
		throw new Error("IMGBB_API_KEY não está definido no ambiente do tool (https://api.imgbb.com/).");
	}
	const effectiveKey =
		idempotencyKey ||
		createHash("sha256")
			.update(
				JSON.stringify({
					account: process.env.INSTAGRAM_PROFILE_ID || INSTAGRAM_USER_ID,
					images: resolvedImages,
					caption,
				}),
			)
			.digest("hex");
	const publishLog = readPublishLog();
	if (publishLog[effectiveKey]?.postId) {
		return { ok: true, duplicatePrevented: true, idempotencyKey: effectiveKey, ...publishLog[effectiveKey] };
	}
	if (!dryRun && process.env.WORKESTRATOR_PUBLISH_APPROVED !== "true") {
		throw new Error("Publicação bloqueada: aprove o checkpoint do Workestrator antes de usar dryRun:false.");
	}
	if (dryRun && browserProfileDir) {
		return {
			ok: true,
			dryRun: true,
			idempotencyKey: effectiveKey,
			images: resolvedImages,
			log: ["DRY RUN — arquivos e legenda validados; o navegador não foi aberto e nada foi publicado."],
		};
	}
	if (browserProfileDir) {
		const published = await publishCarouselWithBrowser({
			profileDir: browserProfileDir,
			images: resolvedImages,
			caption,
		});
		publishLog[effectiveKey] = { ...published, publishedAt: new Date().toISOString() };
		writePublishLog(publishLog);
		return {
			ok: true,
			dryRun: false,
			idempotencyKey: effectiveKey,
			...published,
			log: ["Carrossel publicado pela sessão local do navegador."],
		};
	}

	const log = [];
	const imageUrls = await Promise.all(resolvedImages.map((p) => uploadToImgBB(p, IMGBB_API_KEY)));
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
		return {
			ok: true,
			dryRun: true,
			idempotencyKey: effectiveKey,
			carouselId,
			imageUrls,
			log: [...log, "DRY RUN — publish final não chamado."],
		};
	}

	const postId = await publishMedia(INSTAGRAM_USER_ID, carouselId, INSTAGRAM_ACCESS_TOKEN);
	const permalink = await getPermalink(postId, INSTAGRAM_ACCESS_TOKEN);
	publishLog[effectiveKey] = { postId, permalink, publishedAt: new Date().toISOString() };
	writePublishLog(publishLog);
	return {
		ok: true,
		dryRun: false,
		idempotencyKey: effectiveKey,
		postId,
		permalink,
		imageUrls,
		log: [...log, `Publicado. Post ID ${postId}.`],
	};
}

const server = new McpServer({ name: "workestrator-instagram", version: "1.0.0" });

server.registerTool(
	"publish_carousel",
	{
		description:
			"Publica um carrossel (2 a 10 imagens JPEG/PNG locais) na conta Instagram associada ao agente. " +
			"Por padrão usa a sessão local do Chrome/Edge; secrets antigos continuam compatíveis com Graph API. " +
			"Use dryRun:true para validar sem abrir o navegador nem postar.",
		inputSchema: {
			images: z
				.array(z.string())
				.min(2)
				.max(10)
				.describe("Caminhos locais das imagens JPEG, na ordem do carrossel (2 a 10)."),
			caption: z.string().max(2200).describe("Legenda do post (máx. 2200 caracteres)."),
			dryRun: z.boolean().optional().describe("Se true, prepara tudo mas não chama o publish final."),
			idempotencyKey: z
				.string()
				.optional()
				.describe("Chave estável do run para impedir publicação duplicada em retry."),
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
