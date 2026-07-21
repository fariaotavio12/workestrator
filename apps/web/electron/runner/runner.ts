import crossSpawn from "cross-spawn";
import {
	buildHttpTool,
	connectMcpTools,
	safeToolName,
	type HttpToolDef,
	type McpConnection,
	type OpenAiToolDefinition,
	type ResolvedTool,
} from "./openai-tools";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Teto de custo (USD) por invocação de agente, passado ao Claude CLI via `--max-budget-usd`. É um
 * guardrail contra loop caro — quando estoura, o CLI mata a invocação (ver `classifyCliFailure`).
 * Configurável por agente (`Agent.maxBudgetUsd` → corpo da requisição); este é só o fallback quando
 * o agente não define um. Foi 0.5 e matava o Image Designer no meio (gerar HTML + render de N slides
 * num único contexto Opus passa fácil de 0.5) — subido pra 2.0 como padrão mais folgado.
 */
const DEFAULT_MAX_BUDGET_USD = 2.0;

// Orquestrador: alias de modelo interno -> alias aceito pelo Claude Code CLI (só modelos Claude).
const CLAUDE_MODEL_ALIAS: Record<string, string> = {
	"claude-opus-4-8": "opus",
	"claude-sonnet-5": "sonnet",
	"claude-haiku-4-5": "haiku",
};

/**
 * Modelo sentinela: quando o provider CLI usa este valor, o runner NÃO força `-m`/`--model` e deixa o
 * CLI escolher o modelo padrão da conta autenticada. Necessário pro Codex logado com conta ChatGPT, que
 * recusa qualquer modelo forçado ("model is not supported when using Codex with a ChatGPT account") —
 * sem `-m` ele usa o default válido da conta. Também serve pro Claude usar o default sem alias.
 */
export const CLI_DEFAULT_MODEL = "cli-default";

/**
 * O Codex logado por conta ChatGPT recusa QUALQUER modelo forçado via `-m` (erro 400 "model is not
 * supported when using Codex with a ChatGPT account"); sem `-m` ele usa o modelo padrão da conta
 * (ex.: gpt-5.5) e funciona. Detectamos isso via `codex login status` (cacheado por processo) pra
 * descartar o `-m` automaticamente nesse caso — o usuário não precisa configurar o modelo certo.
 */
let codexChatGptAccountCache: boolean | undefined;
const codexUsesChatGptAccount = (): boolean => {
	if (codexChatGptAccountCache !== undefined) return codexChatGptAccountCache;
	try {
		const res = spawnSync("codex", ["login", "status"], { encoding: "utf-8", timeout: 5_000 });
		codexChatGptAccountCache = /chatgpt/i.test(`${res.stdout ?? ""}${res.stderr ?? ""}`);
	} catch {
		codexChatGptAccountCache = false;
	}
	return codexChatGptAccountCache;
};

/** Providers que rodam de verdade nesta versão — todos CLIs locais já autenticados na máquina. */
const LOCAL_CLI_PROVIDERS = new Set(["claude-cli", "codex-cli", "gpt-cli"]);

type ExecutorPlan = {
	command: string;
	args: string[];
	/** `codex exec --output-last-message` escreve a resposta final aqui — mais confiável que parsear stdout. */
	outputFile?: string;
	/** `true` quando o CLI não suporta escolher modelo por flag (ex.: gpt-cli) — o valor configurado é ignorado. */
	modelIgnored?: boolean;
	/**
	 * Quando definido, o prompt vai por STDIN em vez de argumento de linha de comando — evita o limite de
	 * ~8191 chars do `cmd.exe` no Windows (contexto acumulado grande estourava com "linha de comando muito
	 * longa"). Só a Claude CLI usa hoje (`claude -p` lê o prompt do stdin). O runner escreve isto e fecha o
	 * stream; sem fechar, o CLI espera dados de um pipe que nunca termina.
	 */
	stdinInput?: string;
	/**
	 * `true` quando a saída é `--output-format stream-json` (Claude CLI): o stdout vira uma linha JSON por
	 * evento (thinking / tool_use / text / result), que o runner parseia pra emitir `thinking`/`tool_use`/
	 * `tool_result`/`chunk` ao vivo e extrair a resposta final do evento `result`. Sem isso, o stdout é
	 * texto cru (codex/gpt/openai-compat).
	 */
	streamJson?: boolean;
};

/** Resolvido pelo `.mcp.json` montado a partir dos scripts `mcp`/`http`/`connector` do agent (Etapa 3). */
type McpResolution = { configPath: string; allowedTools: string[] };

/**
 * Monta comando+args por CLI. Cada um tem uma sintaxe própria de execução não-interativa — ver
 * `codex exec --help` / `gpt --help` rodados ao vivo na máquina do usuário pra confirmar as flags
 * abaixo. Nenhum dos três tem uma sessão persistida pelo backend: cada um já está autenticado (via
 * `claude /login`, `codex login`, `gpt login`) direto na máquina onde o Electron/`vite dev` roda.
 */
export const buildExecutorPlan = (
	providerKind: string,
	model: string,
	systemPrompt: string,
	prompt: string,
	canExecute: boolean,
	mcp?: McpResolution,
	maxBudgetUsd: number = DEFAULT_MAX_BUDGET_USD,
): ExecutorPlan => {
	// `cli-default` (ou vazio) = deixa o CLI escolher o modelo da conta; não força `-m`/`--model`.
	const effectiveModel = model === CLI_DEFAULT_MODEL ? "" : model;
	if (providerKind === "codex-cli") {
		const outputFile = path.join(os.tmpdir(), `codex-output-${randomUUID()}.txt`);
		const combinedPrompt = systemPrompt ? `${systemPrompt}\n\n---\n\n${prompt}` : prompt;
		return {
			command: "codex",
			outputFile,
			stdinInput: combinedPrompt,
			args: [
				"exec",
				"--color",
				"never",
				"--output-last-message",
				outputFile,
				...(effectiveModel ? ["-m", effectiveModel] : []),
				// ⚠️ auto-aceite (decisão do usuário) — pula a aprovação que o codex pediria ao vivo pra cada
				// comando. Sem sandbox real: só limita onde o comando *começa* (cwd), igual ao claude.
				...(canExecute ? ["--dangerously-bypass-approvals-and-sandbox"] : ["--sandbox", "read-only"]),
				"-",
			],
		};
	}

	if (providerKind === "gpt-cli") {
		const combinedPrompt = systemPrompt ? `${systemPrompt}\n\n---\n\n${prompt}` : prompt;
		return {
			command: "gpt",
			modelIgnored: true,
			// `gpt "tarefa" --bypass` = modo agente (tools) sem confirmação; `gpt -p "..."` = chat puro, sem tools.
			args: canExecute ? [combinedPrompt, "--bypass"] : ["-p", combinedPrompt],
		};
	}

	const alias = CLAUDE_MODEL_ALIAS[effectiveModel];
	return {
		command: "claude",
		modelIgnored: Boolean(effectiveModel) && !alias,
		// Prompt do usuário/histórico vai por STDIN (`claude -p` lê do pipe) — é a parte que cresce (contexto
		// acumulado) e estourava o limite de linha de comando do Windows. O systemPrompt fica como arg (é
		// autorado/limitado). Ver `ExecutorPlan.stdinInput`.
		stdinInput: prompt,
		streamJson: true,
		args: [
			"-p",
			"--system-prompt",
			// No Windows, `claude` roda via claude.cmd → cmd.exe /c "<comando>" (cross-spawn). Um `\n` bruto
			// dentro de um argumento CORTA a linha de comando ali mesmo — tudo depois (inclusive
			// `--output-format stream-json`) nunca chega no processo real, ele cai no formato texto puro, e
			// o parser de stream-json (só entende JSON) descarta a resposta inteira como "sem saída". O
			// systemPrompt quase sempre tem quebra de linha (é multi-parágrafo) — nunca passa bruto num arg.
			systemPrompt.replace(/\r?\n+/g, " "),
			"--tools",
			canExecute ? "Bash,Read,Write,Edit,Glob,Grep" : "",
			"--no-session-persistence",
			// stream-json (requer --verbose no modo -p): uma linha JSON por evento → atividade ao vivo
			// (thinking/tool_use/chunk) e a resposta final vem do evento `result` (ver o parser no spawn).
			"--output-format",
			"stream-json",
			"--verbose",
			"--max-budget-usd",
			String(maxBudgetUsd),
			// ⚠️ auto-aceite (decisão do usuário) — pula o prompt de permissão que o CLI faria ao vivo pra
			// cada comando/edição. Flag a confirmar contra a versão instalada do CLI.
			...(canExecute ? ["--permission-mode", "bypassPermissions"] : []),
			...(alias ? ["--model", alias] : []),
			// MCP (Etapa 3): `--strict-mcp-config` garante que só os servers do `.mcp.json` montado pra
			// este run (a partir dos scripts anexados ao agent) ficam disponíveis — nunca um `.mcp.json`
			// global da máquina do usuário. `--allowedTools` some quando nenhum script `mcp` define
			// `toolAllowlist` (nesse caso todas as tools dos servers plugados ficam disponíveis).
			...(mcp ? ["--mcp-config", mcp.configPath, "--strict-mcp-config"] : []),
			...(mcp && mcp.allowedTools.length > 0 ? ["--allowedTools", mcp.allowedTools.join(",")] : []),
		],
	};
};

// Fase B (M9): execução real. Pasta de trabalho fixa e escopada — só onde o comando *começa*,
// não é sandbox de verdade (um Bash pode navegar pra fora). Só ligar `canExecute` em agent confiável.
const WORKSPACE_DIR = path.resolve(process.cwd(), "orchestrator-workspace");
const SCRIPTS_SUBDIR = "scripts";
/** Snapshots por run em `.runs/<runId>` — preservados pelo reset; servem o preview do histórico. */
const RUNS_SUBDIR = ".runs";
const LANGUAGE_EXTENSION: Record<string, string> = { bash: "sh", node: "js", python: "py" };

export type ScriptPayload = {
	id: string;
	name: string;
	description?: string;
	kind: "command" | "inline" | "file" | "http" | "mcp" | "connector";
	command?: string;
	args?: string[];
	language?: "bash" | "node" | "python";
	content?: string;
	path?: string;
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	urlTemplate?: string;
	headers?: Record<string, string>;
	bodySchema?: string;
	responseMap?: string;
	transport?: "stdio" | "http";
	url?: string;
	env?: Record<string, string>;
	toolAllowlist?: string[];
	connectorProvider?: "composio" | "zapier" | "n8n" | "youtube";
	config?: string;
	authRef?: string;
};

/** `.mcp.json`-shaped entry — stdio (local) ou http (remoto), formato aceito por `--mcp-config` da Claude CLI. */
type McpServerConfig =
	| { command: string; args?: string[]; env?: Record<string, string> }
	| { type: "http"; url: string; headers?: Record<string, string> };

/** Esquema de injeção do valor resolvido — mesma enum do backend (`SecretAuthType`), ver plano §8.3. */
export type SecretAuthType =
	| "bearer"
	| "header"
	| "query"
	| "basic"
	| "oauth2_client_credentials"
	| "oauth2_refresh"
	| "raw";

/** Retorno de `GET /secrets/{id}/value` — nunca cacheado em texto puro fora deste processo. */
export type ResolvedSecret = {
	value: string;
	authType: SecretAuthType;
	metadata?: Record<string, string>;
	/** Id do secret — usado como chave de cache do token OAuth2 (não vem do backend, é anexado pelo resolver). */
	id?: string;
	/**
	 * Persiste um valor rotacionado de volta no backend (`PUT /secrets/{id}/value`) — só populado pelo
	 * resolver real (nunca pelo fallback offline em `SecretCache`). Usado pra gravar o `refresh_token`
	 * reemitido a cada troca OAuth2 por providers que rotacionam (Google, GitHub App, Notion...): sem
	 * persistir, o refresh token salvo fica obsoleto assim que é usado uma vez e a próxima troca falha.
	 */
	rotate?: (newValue: string) => Promise<void>;
	/**
	 * Busca um access token já pronto no backend (`POST /secrets/{id}/access-token` — Fase 2 do plano
	 * de ciclo de vida OAuth, ver `docs/plano-oauth-backend-token-lifecycle.md`). O backend virou o
	 * dono do refresh/rotação/cache; `undefined` = backend antigo (sem o endpoint, 404) ou indisponível
	 * — nesse caso `exchangeOAuth2Token` cai no exchange local abaixo, que nunca foi removido (rede de
	 * segurança da migração, só populado pelo resolver real).
	 */
	fetchAccessToken?: () => Promise<{ accessToken: string; expiresAt: string } | undefined>;
};

/** `apiKeyRef`/`authRef` referenciam o `id` de um `Secret` — resolvido contra o backend (§8.4). */
export type SecretResolver = (id: string) => Promise<ResolvedSecret | undefined>;

export type SecretCache = {
	get: (id: string) => ResolvedSecret | undefined;
	set: (id: string, resolved: ResolvedSecret) => void;
};

/**
 * `authRef`/valores de `headers`/`env` no formato `"$id"` são resolvidos contra o `SecretResolver`
 * — convenção que deixa o usuário referenciar um segredo específico num header arbitrário (ex.:
 * `{"Authorization": "Bearer $3fa8...-id"}`), sem trafegar o valor cru pela API além desta troca.
 */
const resolveSecretPlaceholder = async (value: string, resolveSecret: SecretResolver): Promise<string> => {
	const ids = [...value.matchAll(/\$([\w-]+)/g)].map((m) => m[1]);
	let result = value;
	for (const id of ids) {
		const resolved = await resolveSecret(id);
		if (resolved) result = result.replace(`$${id}`, resolved.value);
	}
	return result;
};

const resolveMapPlaceholders = async (
	map: Record<string, string> | undefined,
	resolveSecret: SecretResolver,
): Promise<Record<string, string>> => {
	if (!map) return {};
	const entries = await Promise.all(
		Object.entries(map).map(
			async ([key, value]) => [key, await resolveSecretPlaceholder(value, resolveSecret)] as const,
		),
	);
	return Object.fromEntries(entries);
};

/** Metadata keys já consumidas por um `authType` — o resto é mesclado como header fixo (ex.: `anthropic-version`). */
const KNOWN_AUTH_METADATA_KEYS = new Set(["headerName", "valuePrefix", "queryParam", "basicUsername", "tokenUrl", "clientId", "scopes"]);

const fixedMetadataHeaders = (metadata: Record<string, string> | undefined): Record<string, string> => {
	if (!metadata) return {};
	return Object.fromEntries(Object.entries(metadata).filter(([key]) => !KNOWN_AUTH_METADATA_KEYS.has(key)));
};

const parseJsonSafe = <T,>(raw: string): T | undefined => {
	try {
		return JSON.parse(raw) as T;
	} catch {
		return undefined;
	}
};

/** Token exchange (client_credentials/refresh_token) com cache em memória por `tokenUrl+clientId`. */
const oauthTokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

export const exchangeOAuth2Token = async (resolved: ResolvedSecret): Promise<string> => {
	const { authType, metadata, value, id, rotate, fetchAccessToken } = resolved;

	// Chaveado pelo id do secret (não por tokenUrl+clientId) — dois secrets do mesmo provider com o
	// mesmo tokenUrl não colidem mais no cache em memória. Serve tanto o resultado do backend quanto
	// o do exchange local abaixo, evitando bater em qualquer um dos dois a cada chamada dentro do run.
	const cacheKey = `${id ?? metadata?.tokenUrl}:${metadata?.clientId ?? ""}:${metadata?.scopes ?? ""}`;
	const cached = oauthTokenCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now() + 5_000) return cached.accessToken;

	// Fase 2 do plano OAuth: o backend é o dono do ciclo de vida (refresh/rotação/cache que sobrevive
	// a restart — ver docs/plano-oauth-backend-token-lifecycle.md). `undefined` = backend antigo (sem
	// o endpoint) ou fora do ar; cai no exchange local abaixo, que segue funcionando sem depender dele.
	const backendResult = await fetchAccessToken?.();
	if (backendResult) {
		const expiresAt = new Date(backendResult.expiresAt).getTime();
		oauthTokenCache.set(cacheKey, { accessToken: backendResult.accessToken, expiresAt });
		return backendResult.accessToken;
	}

	const tokenUrl = metadata?.tokenUrl;
	if (!tokenUrl) throw new Error("Secret oauth2 sem metadata.tokenUrl configurado.");

	const params = new URLSearchParams();
	if (authType === "oauth2_client_credentials") {
		const parsed = parseJsonSafe<{ clientSecret?: string }>(value);
		params.set("grant_type", "client_credentials");
		if (metadata?.clientId) params.set("client_id", metadata.clientId);
		params.set("client_secret", parsed?.clientSecret ?? value);
	} else {
		const parsed = parseJsonSafe<{ refreshToken?: string; clientSecret?: string }>(value);
		params.set("grant_type", "refresh_token");
		if (metadata?.clientId) params.set("client_id", metadata.clientId);
		params.set("refresh_token", parsed?.refreshToken ?? value);
		if (parsed?.clientSecret) params.set("client_secret", parsed.clientSecret);
	}
	if (metadata?.scopes) params.set("scope", metadata.scopes);

	const res = await fetch(tokenUrl, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: params.toString(),
	});
	if (!res.ok) {
		// Token salvo pode estar revogado/expirado do lado do provider — não deixa uma entrada morta
		// no cache impedindo uma nova tentativa depois que o usuário reconectar.
		oauthTokenCache.delete(cacheKey);
		throw new Error(`Token exchange OAuth2 falhou (HTTP ${res.status}).`);
	}
	const body = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
	const expiresAt = Date.now() + (body.expires_in ?? 3600) * 1000;
	oauthTokenCache.set(cacheKey, { accessToken: body.access_token, expiresAt });

	// Muitos providers (Google, GitHub App, Notion...) reemitem um refresh_token novo a cada troca e
	// invalidam o anterior — sem persistir de volta, a troca seguinte falha com o token salvo já morto.
	if (authType === "oauth2_refresh" && body.refresh_token && rotate) {
		const parsed = parseJsonSafe<{ refreshToken?: string; clientSecret?: string }>(value);
		if (body.refresh_token !== parsed?.refreshToken) {
			const newValue = JSON.stringify({ refreshToken: body.refresh_token, clientSecret: parsed?.clientSecret });
			rotate(newValue).catch((err) => {
				console.error("[secrets] Falha ao persistir refresh_token rotacionado:", err instanceof Error ? err.message : err);
			});
		}
	}

	return body.access_token;
};

/** Colapsa um `ResolvedSecret` num único token de string — usado onde só cabe um valor (env var de stdio). */
const resolveAuthToken = async (resolved: ResolvedSecret): Promise<string> => {
	if (resolved.authType === "oauth2_client_credentials" || resolved.authType === "oauth2_refresh") {
		return exchangeOAuth2Token(resolved);
	}
	if (resolved.authType === "basic") {
		return parseJsonSafe<{ password?: string }>(resolved.value)?.password ?? resolved.value;
	}
	return resolved.value;
};

/** Aplica o esquema de auth certo num alvo HTTP (headers + url) — ver tabela do plano §8.3. */
const applyAuthToHttpTarget = async (
	resolved: ResolvedSecret,
	target: { headers: Record<string, string>; url: string },
): Promise<{ headers: Record<string, string>; url: string }> => {
	const headers = { ...target.headers, ...fixedMetadataHeaders(resolved.metadata) };
	let url = target.url;

	switch (resolved.authType) {
		case "bearer":
			headers.Authorization = `Bearer ${resolved.value}`;
			break;
		case "header": {
			const headerName = resolved.metadata?.headerName ?? "Authorization";
			headers[headerName] = `${resolved.metadata?.valuePrefix ?? ""}${resolved.value}`;
			break;
		}
		case "query": {
			const param = resolved.metadata?.queryParam ?? "key";
			const separator = url.includes("?") ? "&" : "?";
			url = `${url}${separator}${encodeURIComponent(param)}=${encodeURIComponent(resolved.value)}`;
			break;
		}
		case "basic": {
			const password = parseJsonSafe<{ password?: string }>(resolved.value)?.password ?? resolved.value;
			const username = resolved.metadata?.basicUsername ?? "";
			headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
			break;
		}
		case "oauth2_client_credentials":
		case "oauth2_refresh":
			headers.Authorization = `Bearer ${await exchangeOAuth2Token(resolved)}`;
			break;
		case "raw":
		default:
			break;
	}
	return { headers, url };
};

/**
 * Resolve via backend (`GET /secrets/{id}/value`, fonte da verdade — plano §8.4). Falha de rede/backend
 * indisponível cai pro `cache` local opcional (populado a cada resolução bem-sucedida), permitindo um
 * run repetir offline depois de já ter rodado uma vez com o backend disponível.
 */
export const createBackendSecretResolver = (
	backendBaseUrl: string | undefined,
	backendToken: string | undefined,
	cache?: SecretCache,
): SecretResolver => {
	return async (id: string): Promise<ResolvedSecret | undefined> => {
		if (backendBaseUrl && backendToken) {
			try {
				const res = await fetch(`${backendBaseUrl.replace(/\/+$/, "")}/secrets/${id}/value`, {
					headers: { Authorization: `Bearer ${backendToken}` },
				});
				if (res.ok) {
					const body = (await res.json()) as ResolvedSecret;
					cache?.set(id, { value: body.value, authType: body.authType, metadata: body.metadata });
					return {
						...body,
						id,
						rotate: async (newValue: string) => {
							const putRes = await fetch(`${backendBaseUrl.replace(/\/+$/, "")}/secrets/${id}/value`, {
								method: "PUT",
								headers: { "Content-Type": "application/json", Authorization: `Bearer ${backendToken}` },
								body: JSON.stringify({ value: newValue }),
							});
							if (!putRes.ok) throw new Error(`HTTP ${putRes.status}`);
						},
						fetchAccessToken: async () => {
							try {
								const tokenRes = await fetch(`${backendBaseUrl.replace(/\/+$/, "")}/secrets/${id}/access-token`, {
									method: "POST",
									headers: { Authorization: `Bearer ${backendToken}` },
								});
								// 404 = backend antigo sem o endpoint; outro erro = provider/backend falhou agora —
								// nos dois casos volta `undefined` pro exchange local assumir (fallback, nunca lança).
								if (!tokenRes.ok) return undefined;
								return (await tokenRes.json()) as { accessToken: string; expiresAt: string };
							} catch {
								return undefined;
							}
						},
					};
				}
				console.error(`[secrets] Falha ao resolver secret ${id}: HTTP ${res.status}`);
			} catch (err) {
				console.error(`[secrets] Falha ao resolver secret ${id}:`, err instanceof Error ? err.message : err);
			}
		}
		const cached = cache?.get(id);
		return cached ? { ...cached, id } : undefined;
	};
};

// Este arquivo é bundlado em dois formatos diferentes: ESM pelo Vite/rolldown (middleware do
// `vite dev`, importado por vite.config.ts) e CJS pelo esbuild (`dist-electron/main.cjs` do
// Electron — ver scripts/build-electron.mjs). `import.meta.url` fica vazio em CJS; `__dirname`
// não existe em ESM de verdade. `__dirname` é ambient global via @types/node, daí o `typeof`.
const CURRENT_DIR = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
// Empacotado: `main.ts`/`runner.ts` são bundlados por esbuild em `dist-electron/main.cjs`, então
// `CURRENT_DIR` aponta pra `dist-electron/` ali — `scripts/build-electron.mjs` copia
// `electron/mcp-servers/` pra `dist-electron/mcp-servers/` pra este caminho existir de verdade tanto
// no app empacotado quanto no `electron:dev` local. Em dev (`vite dev`, sem Electron), `CURRENT_DIR`
// é o `electron/runner/` fonte, então `../mcp-servers` resolve certo sem precisar desse passo.
const HTTP_TOOL_SERVER_PATH = path.resolve(CURRENT_DIR, "..", "mcp-servers", "http-tool.mjs");
const YOUTUBE_SERVER_PATH = path.resolve(CURRENT_DIR, "..", "mcp-servers", "youtube.mjs");
const WORKSPACE_FS_SERVER_PATH = path.resolve(CURRENT_DIR, "..", "mcp-servers", "workspace-fs.mjs");

/**
 * Resolve um script `kind: "http"` na definição declarativa da tool, com a auth já aplicada em
 * headers/URL. Compartilhado pelos dois consumidores: o `.mcp.json` da Claude CLI (que passa o def
 * pro `http-tool.mjs`) e o loop de tool calling dos providers OpenAI-compat (que executa direto).
 */
export const buildHttpToolDef = async (
	script: ScriptPayload,
	resolveSecret: SecretResolver,
): Promise<HttpToolDef | undefined> => {
	if (!script.urlTemplate) return undefined;
	let headers = await resolveMapPlaceholders(script.headers, resolveSecret);
	let urlTemplate = script.urlTemplate;
	if (script.authRef && !Object.keys(headers).some((h) => h.toLowerCase() === "authorization")) {
		const resolved = await resolveSecret(script.authRef);
		if (resolved) {
			({ headers, url: urlTemplate } = await applyAuthToHttpTarget(resolved, { headers, url: urlTemplate }));
		}
	}
	return {
		name: safeFileName(script.name),
		description: script.description,
		method: script.method ?? "GET",
		urlTemplate,
		headers,
		bodySchema: script.bodySchema,
		responseMap: script.responseMap,
	};
};

/** Monta a entrada `.mcp.json` de um script `mcp`/`http`/`connector` — `undefined` se faltar campo obrigatório. */
export const buildMcpServerEntry = async (
	script: ScriptPayload,
	resolveSecret: SecretResolver,
): Promise<McpServerConfig | undefined> => {
	if (script.kind === "mcp") {
		if (script.transport === "http") {
			if (!script.url) return undefined;
			let headers = await resolveMapPlaceholders(script.headers, resolveSecret);
			let url = script.url;
			if (script.authRef && !Object.keys(headers).some((h) => h.toLowerCase() === "authorization")) {
				const resolved = await resolveSecret(script.authRef);
				if (resolved) ({ headers, url } = await applyAuthToHttpTarget(resolved, { headers, url }));
			}
			return { type: "http", url, headers: Object.keys(headers).length > 0 ? headers : undefined };
		}
		if (!script.command) return undefined;
		const env = await resolveMapPlaceholders(script.env, resolveSecret);
		if (script.authRef) {
			const resolved = await resolveSecret(script.authRef);
			if (resolved) env.WORKESTRATOR_AUTH_TOKEN = await resolveAuthToken(resolved);
		}
		return { command: script.command, args: script.args, env: Object.keys(env).length > 0 ? env : undefined };
	}

	if (script.kind === "http") {
		const def = await buildHttpToolDef(script, resolveSecret);
		if (!def) return undefined;
		return {
			command: process.execPath,
			args: [HTTP_TOOL_SERVER_PATH],
			// `ELECTRON_RUN_AS_NODE` faz o binário do Electron empacotado se comportar como `node` puro
			// pra rodar esse script — sem isso ele tentaria abrir uma janela. No-op fora do Electron.
			env: { ELECTRON_RUN_AS_NODE: "1", WORKESTRATOR_HTTP_TOOL_CONFIG: JSON.stringify([def]) },
		};
	}

	if (script.kind === "connector") {
		if (!script.connectorProvider) return undefined;

		// YouTube (Etapa 4) roda 100% local via yt-dlp — nenhum gateway remoto/conta de terceiro
		// envolvida, então é o único connector resolvido sem precisar de `config.gatewayUrl`.
		if (script.connectorProvider === "youtube") {
			return { command: process.execPath, args: [YOUTUBE_SERVER_PATH], env: { ELECTRON_RUN_AS_NODE: "1" } };
		}

		// Composio/Zapier/n8n: cada gateway real tem sua própria URL por conta/toolkit — não dá pra
		// advinhar com confiança sem uma conta real pra verificar contra. `config` (JSON) pode informar
		// `{ "gatewayUrl": "..." }` explicitamente; sem isso, a tool não é montada (melhor não montar
		// do que montar com endpoint errado).
		let gatewayUrl: string | undefined;
		try {
			gatewayUrl = script.config ? (JSON.parse(script.config) as { gatewayUrl?: string }).gatewayUrl : undefined;
		} catch {
			gatewayUrl = undefined;
		}
		if (!gatewayUrl) return undefined;
		let headers: Record<string, string> = {};
		let url = gatewayUrl;
		if (script.authRef) {
			const resolved = await resolveSecret(script.authRef);
			if (resolved) ({ headers, url } = await applyAuthToHttpTarget(resolved, { headers, url }));
		}
		return { type: "http", url, headers: Object.keys(headers).length > 0 ? headers : undefined };
	}

	return undefined;
};

/** Monta o `.mcp.json` completo a partir de todos os scripts anexados ao agent — `undefined` se nenhum resolver. */
export const buildMcpConfig = async (
	scripts: ScriptPayload[],
	resolveSecret: SecretResolver,
): Promise<{ mcpServers: Record<string, McpServerConfig> } | undefined> => {
	const entries: Record<string, McpServerConfig> = {};
	for (const script of scripts) {
		if (script.kind !== "mcp" && script.kind !== "http" && script.kind !== "connector") continue;
		const entry = await buildMcpServerEntry(script, resolveSecret);
		if (!entry) continue;
		entries[safeFileName(script.name) || script.id] = entry;
	}
	return Object.keys(entries).length > 0 ? { mcpServers: entries } : undefined;
};

const writeMcpConfig = (
	config: { mcpServers: Record<string, McpServerConfig> },
	workspaceDir: string = WORKSPACE_DIR,
): string => {
	const filePath = path.join(workspaceDir, ".mcp.json");
	fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");
	return filePath;
};

/**
 * Log de auditoria de quais tools ficaram disponíveis num run — não é log por invocação (exigiria
 * parsear `--output-format stream-json` pra capturar eventos `tool_use`, mudança maior e mais
 * arriscada no parsing atual, baseado em texto puro). Documentado como limitação conhecida — ver
 * Etapa 3/6 do plano.
 */
const logToolConfig = (scripts: ScriptPayload[], mcpConfigPath: string, workspaceDir: string = WORKSPACE_DIR): void => {
	const relevant = scripts.filter((s) => s.kind === "mcp" || s.kind === "http" || s.kind === "connector");
	if (relevant.length === 0) return;
	const entry = {
		timestamp: new Date().toISOString(),
		mcpConfigPath,
		tools: relevant.map((s) => ({ id: s.id, name: s.name, kind: s.kind, toolAllowlist: s.toolAllowlist ?? null })),
	};
	try {
		fs.appendFileSync(path.join(workspaceDir, "tool-config-log.jsonl"), `${JSON.stringify(entry)}\n`, "utf-8");
	} catch {
		// Log é best-effort — falha ao escrever não deve derrubar o run.
	}
};

export type ClaudeFailureCode = "unauthenticated" | "rate_limited" | "unsupported_provider" | "unknown";

/** Nome de arquivo seguro a partir do nome do script — evita path traversal/caracteres inválidos. */
const safeFileName = (name: string): string =>
	name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-_]+/g, "-")
		.replace(/^-+|-+$/g, "") || "script";

/**
 * Garante a pasta de trabalho e, se possível, um git local (best-effort) pra dar pra reverter.
 * `initGit` só liga no workspace fixo — numa pasta escolhida pelo usuário não iniciamos um repo git
 * no diretório dele (seria intrusivo); ali só garantimos que a pasta de scripts existe.
 */
const ensureWorkspace = (workspaceDir: string = WORKSPACE_DIR, initGit = true): void => {
	fs.mkdirSync(path.join(workspaceDir, SCRIPTS_SUBDIR), { recursive: true });
	if (initGit && !fs.existsSync(path.join(workspaceDir, ".git"))) {
		try {
			spawnSync("git", ["init"], { cwd: workspaceDir, stdio: "ignore" });
		} catch {
			// git indisponível no PATH — segue sem versionamento, a execução funciona do mesmo jeito.
		}
	}
};

/**
 * Captura o diff das mudanças na pasta após um run (best-effort, para o painel de artefatos).
 * `add -N` faz arquivos novos aparecerem no `git diff`. Só funciona se a pasta for um repo git — no
 * workspace fixo isso é garantido pelo `ensureWorkspace`; numa pasta do usuário, só se já for repo.
 * Ressalva: num repo do usuário com alterações pré-existentes, o diff mistura-as com as da IA.
 */
const captureGitDiff = (workspaceDir: string): string | undefined => {
	try {
		if (!fs.existsSync(path.join(workspaceDir, ".git"))) return undefined;
		spawnSync("git", ["add", "-N", "."], { cwd: workspaceDir, stdio: "ignore" });
		const result = spawnSync("git", ["diff", "--no-color"], { cwd: workspaceDir, encoding: "utf-8" });
		const diff = (result.stdout ?? "").trim();
		return diff || undefined;
	} catch {
		return undefined;
	}
};

/** Escreve em arquivo os scripts "inline" (corpo salvo na biblioteca), pra existirem quando o agent rodar. */
const materializeScripts = (scripts: ScriptPayload[], workspaceDir: string = WORKSPACE_DIR): void => {
	for (const script of scripts) {
		if (script.kind !== "inline" || !script.content) continue;
		const ext = LANGUAGE_EXTENSION[script.language ?? "bash"] ?? "sh";
		const filePath = path.join(workspaceDir, SCRIPTS_SUBDIR, `${safeFileName(script.name)}.${ext}`);
		fs.writeFileSync(filePath, script.content, "utf-8");
	}
};

/**
 * Classifica falhas comuns de qualquer um dos CLIs locais pra dar uma mensagem acionável — o padrão
 * de texto de "não logado"/"limite atingido" varia por CLI, mas os três usam vocabulário parecido.
 */
export const classifyCliFailure = (command: string, detail: string): { code: ClaudeFailureCode; message: string } => {
	if (/not logged in|not authenticated|please (log|sign) in/i.test(detail)) {
		return {
			code: "unauthenticated",
			message: `${command} não está autenticado nesta máquina. Faça login pelo terminal e tente de novo.`,
		};
	}
	if (/hit your limit|usage limit|rate limit|quota/i.test(detail)) {
		return { code: "rate_limited", message: `Limite de uso do ${command} atingido. ${detail}` };
	}
	// Teto de custo por invocação (`--max-budget-usd`) estourado — o CLI mata o agente no meio. Sem
	// esta classificação a mensagem crua ("Exceeded USD budget (0.5)") não diz o que fazer. Acontece
	// com agentes que fazem muito num só contexto (ex.: gerar HTML + renderizar N slides). Fixes: subir
	// o budget do agente ou dividir o trabalho em mais agentes.
	const budgetMatch = detail.match(/exceeded USD budget\s*\(?\$?([\d.]+)/i);
	if (budgetMatch) {
		return {
			code: "unknown",
			message:
				`O agente atingiu o teto de custo de US$ ${budgetMatch[1]} nesta etapa e foi interrompido. ` +
				"Aumente o budget do agente (campo maxBudgetUsd) ou divida o trabalho em mais agentes " +
				"(ex.: um que só escreve os arquivos e outro que só renderiza). Os arquivos já gerados até " +
				"aqui ficam salvos na pasta de trabalho.",
		};
	}
	// Browser/Playwright: o Chromium não instalado é a falha mais comum ao renderizar imagem — a
	// mensagem do Playwright já sugere o comando, mas explicitamos o fix pra não depender de o usuário
	// achar isso no meio do stderr.
	if (/playwright install|executable doesn.?t exist|browsertype\.launch|chromium.+not.+found/i.test(detail)) {
		return {
			code: "unknown",
			message: `O navegador do Playwright não está instalado nesta máquina. Rode "npx playwright install chromium" e tente de novo. Detalhe: ${detail}`,
		};
	}
	// Servidor MCP que não sobe (binário ausente no PATH, pacote npx que não baixou, transporte que não
	// conecta): com `--strict-mcp-config` o agent fica sem as tools e falha sem produzir o resultado.
	if (/mcp server|failed to (connect|start)|mcp__|could not (spawn|resolve)|enoent/i.test(detail)) {
		return {
			code: "unknown",
			message: `Uma ferramenta MCP anexada ao agente não pôde ser iniciada — verifique se o comando/binário dela está instalado e no PATH. Detalhe: ${detail}`,
		};
	}
	// Windows (cmd.exe, usado pelo shim `.cmd` dos CLIs instalados via npm) rejeita linhas de comando
	// acima de ~8191 caracteres — acontece com um prompt muito grande (briefing extenso, muitos passos
	// de histórico acumulados num run longo/retomado). "Linha de comando muito longa"/"line too long" é
	// a mensagem que o próprio Windows devolve nesse caso.
	if (/linha de comando.+longa|command line is too long|input line is too long/i.test(detail)) {
		return {
			code: "unknown",
			message: `O prompt ficou grande demais para a linha de comando do sistema. Tente um briefing mais curto ou um squad com menos passos acumulados.`,
		};
	}
	return { code: "unknown", message: detail || `${command} não retornou saída.` };
};

/** Headers + sufixo de query já resolvidos pro `apiKeyRef` do provider — ver §8.3/§8.4 do plano. */
type ProviderAuth = { headers: Record<string, string>; querySuffix: string };

const NO_PROVIDER_AUTH: ProviderAuth = { headers: {}, querySuffix: "" };

/**
 * `apiKeyRef` referencia o `id` de um `Secret` (nunca mais uma env var — era a causa do auth do
 * provider não bater com o valor salvo no cofre/backend, ver plano §8.1/§8.4). Só o `querySuffix`
 * (esquema `query`, ex.: Google `?key=`) precisa ser reaplicado por endpoint — extraído aqui contra
 * uma URL sentinela vazia pra não depender da URL final de cada chamada (`/models`, `/chat/completions`).
 */
const resolveProviderAuth = async (
	apiKeyRef: string | undefined,
	resolveSecret: SecretResolver,
): Promise<ProviderAuth> => {
	if (!apiKeyRef) return NO_PROVIDER_AUTH;
	const resolved = await resolveSecret(apiKeyRef);
	if (!resolved) return NO_PROVIDER_AUTH;
	const applied = await applyAuthToHttpTarget(resolved, { headers: {}, url: "" });
	return { headers: applied.headers, querySuffix: applied.url };
};

const withProviderAuth = (url: string, auth: ProviderAuth): string => (auth.querySuffix ? `${url}${auth.querySuffix}` : url);

/** `GET /models` (padrão OpenAI-compat) — usado tanto no cadastro do provider quanto como rede de
 * segurança na execução. */
const fetchAvailableModels = async (baseUrl: string, auth: ProviderAuth): Promise<{ id: string }[]> => {
	const url = withProviderAuth(`${baseUrl.replace(/\/+$/, "")}/models`, auth);
	const res = await fetch(url, { headers: auth.headers });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const body = (await res.json()) as { data?: { id: string }[] };
	return body.data ?? [];
};

/**
 * O `value` cadastrado no provider muitas vezes não bate com o nome real do modelo carregado no
 * servidor (ex.: vLLM que serve um único modelo com um id que ninguém digita de cabeça). Em vez de
 * exigir precisão aí, pergunta pro próprio endpoint via `GET /models` — se só tiver um modelo
 * carregado, usa o id real dele; se tiver mais de um, tenta achar o configurado e cai pro primeiro
 * da lista como último recurso. Falha na descoberta só faz seguir com o valor configurado mesmo, sem
 * quebrar o run por causa disso — complementa (não substitui) a busca feita no cadastro do provider.
 */
const resolveModel = async (baseUrl: string, auth: ProviderAuth, configuredModel: string): Promise<string> => {
	try {
		const models = await fetchAvailableModels(baseUrl, auth);
		if (models.length === 0) return configuredModel;
		if (models.length === 1) return models[0].id;
		return models.find((m) => m.id === configuredModel)?.id ?? models[0].id;
	} catch {
		return configuredModel;
	}
};

/**
 * `/api/list-models` — chamado pelo formulário de cadastro do provider pra buscar os modelos
 * disponíveis num endpoint OpenAI-compat, em vez do usuário ter que digitar o id de cabeça.
 */
export const handleListModels = async (
	req: IncomingMessage,
	res: ServerResponse,
	cache?: SecretCache,
): Promise<void> => {
	if (req.method !== "POST") {
		res.statusCode = 405;
		res.end();
		return;
	}

	let rawBody: Record<string, unknown>;
	try {
		rawBody = await readJsonBody(req);
	} catch {
		res.statusCode = 400;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ message: "Corpo da requisição inválido." }));
		return;
	}

	const { baseUrl = "", apiKeyRef, backendBaseUrl, backendToken } = rawBody as {
		baseUrl?: string;
		apiKeyRef?: string;
		backendBaseUrl?: string;
		backendToken?: string;
	};
	const resolvedBaseUrl = baseUrl.trim();
	if (!resolvedBaseUrl) {
		res.statusCode = 400;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ message: "Informe a Base URL antes de buscar os modelos." }));
		return;
	}

	try {
		const resolveSecret = createBackendSecretResolver(backendBaseUrl, backendToken, cache);
		const auth = await resolveProviderAuth(apiKeyRef, resolveSecret);
		const models = await fetchAvailableModels(resolvedBaseUrl, auth);
		res.statusCode = 200;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ models: models.map((m) => ({ value: m.id, label: m.id })) }));
	} catch (err) {
		res.statusCode = 502;
		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify({
				message: `Não foi possível buscar os modelos (${err instanceof Error ? err.message : "erro desconhecido"}).`,
			}),
		);
	}
};

/**
 * `/api/test-secret` — chamado pelo botão "Testar conexão" do catálogo de conectores. Só faz uma
 * verificação de verdade contra a rede pros esquemas OAuth2 (troca o token); os demais esquemas não
 * têm um endpoint genérico pra bater, então só confirmam que o valor está definido no backend.
 */
export const handleTestSecret = async (
	req: IncomingMessage,
	res: ServerResponse,
	cache?: SecretCache,
): Promise<void> => {
	if (req.method !== "POST") {
		res.statusCode = 405;
		res.end();
		return;
	}

	let rawBody: Record<string, unknown>;
	try {
		rawBody = await readJsonBody(req);
	} catch {
		res.statusCode = 400;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ ok: false, message: "Corpo da requisição inválido." }));
		return;
	}

	const { secretId, backendBaseUrl, backendToken } = rawBody as {
		secretId?: string;
		backendBaseUrl?: string;
		backendToken?: string;
	};
	res.setHeader("Content-Type", "application/json");
	if (!secretId) {
		res.statusCode = 400;
		res.end(JSON.stringify({ ok: false, message: "Informe o secretId." }));
		return;
	}

	const resolveSecret = createBackendSecretResolver(backendBaseUrl, backendToken, cache);
	const resolved = await resolveSecret(secretId);
	res.statusCode = 200;
	if (!resolved) {
		res.end(JSON.stringify({ ok: false, message: "Não foi possível resolver o valor do segredo." }));
		return;
	}

	if (resolved.authType === "oauth2_client_credentials" || resolved.authType === "oauth2_refresh") {
		try {
			await exchangeOAuth2Token(resolved);
			res.end(JSON.stringify({ ok: true, message: "Token OAuth2 trocado com sucesso." }));
		} catch (err) {
			res.end(JSON.stringify({ ok: false, message: err instanceof Error ? err.message : "Falha na troca do token." }));
		}
		return;
	}

	res.end(JSON.stringify({ ok: true, message: "Valor definido no backend." }));
};

const classifyHttpFailure = (status: number, detail: string): { code: ClaudeFailureCode; message: string } => {
	if (status === 401 || status === 403) {
		return { code: "unauthenticated", message: `Endpoint recusou a chave de API (HTTP ${status}). ${detail}` };
	}
	if (status === 429) {
		return { code: "rate_limited", message: `Limite de uso do endpoint atingido (HTTP ${status}). ${detail}` };
	}
	return { code: "unknown", message: detail || `Endpoint retornou HTTP ${status}.` };
};

/**
 * Teto de rodadas modelo→tool→modelo numa única invocação de agent. Existe como guarda anti-loop:
 * um modelo pequeno consegue ficar repetindo a mesma tool call indefinidamente, e sem teto isso
 * gira até o timeout sem nunca produzir artefato. Estourar o teto vira erro explicado, não silêncio.
 */
const MAX_TOOL_ITERATIONS = 8;

type OpenAiToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

type ChatMessage =
	| { role: "system" | "user"; content: string }
	| { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCall[] }
	| { role: "tool"; tool_call_id: string; content: string };

/**
 * Uma rodada do modelo: texto da resposta, o raciocínio (modelos "thinking") e as tool calls pedidas
 * (vazio = resposta final). `reasoning` NÃO é resposta — serve pra dar visibilidade e pra explicar o
 * caso em que o modelo só pensou e nunca concluiu.
 */
type ChatTurn = { text: string; reasoning: string; toolCalls: OpenAiToolCall[] };

/**
 * Modelos "thinking" (qwen3, deepseek-r1, gpt-oss...) mandam a cadeia de raciocínio num campo
 * separado, com `content` vazio até concluírem. O nome do campo não é padronizado: o Ollama usa
 * `reasoning`, DeepSeek/vLLM/OpenRouter usam `reasoning_content`. Ler os dois cobre os dois mundos.
 */
type ReasoningDelta = { reasoning?: string; reasoning_content?: string };

const readReasoning = (source: ReasoningDelta | undefined): string =>
	source?.reasoning ?? source?.reasoning_content ?? "";

/**
 * O raciocínio chega token a token (~200 eventos numa pergunta trivial). Emitir um evento SSE por
 * token inunda o painel de atividade, que cria um item por evento — então acumula e só descarrega em
 * blocos, que é também o formato em que a Claude CLI entrega `thinking`.
 */
const THINKING_FLUSH_CHARS = 240;

/**
 * Consome a resposta do `/chat/completions`. Aceita as duas formas: SSE (`stream: true`, o caminho
 * normal — texto sai ao vivo via `chunk`) e JSON único, porque nem todo servidor OpenAI-compat
 * mantém o streaming quando há `tools` no corpo (alguns respondem objeto puro nesse caso).
 *
 * As tool calls chegam fatiadas no stream (`arguments` vem em pedaços, correlacionados por `index`),
 * então são remontadas por índice antes de virar chamada de verdade.
 */
const readChatResponse = async (response: Response, res: ServerResponse): Promise<ChatTurn> => {
	const isStream = (response.headers.get("content-type") ?? "").includes("text/event-stream");

	if (!isStream || !response.body) {
		const body = (await response.json().catch(() => ({}))) as {
			choices?: { message?: ({ content?: string | null; tool_calls?: OpenAiToolCall[] } & ReasoningDelta) }[];
		};
		const message = body.choices?.[0]?.message;
		const text = message?.content ?? "";
		const reasoning = readReasoning(message);
		if (text) writeSseEvent(res, "chunk", { text });
		if (reasoning) writeSseEvent(res, "thinking", { text: reasoning });
		return { text, reasoning, toolCalls: message?.tool_calls ?? [] };
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let text = "";
	let reasoning = "";
	let thinkingBuffer = "";
	const pending = new Map<number, { id: string; name: string; arguments: string }>();

	const flushThinking = (force: boolean): void => {
		if (!thinkingBuffer || (!force && thinkingBuffer.length < THINKING_FLUSH_CHARS)) return;
		writeSseEvent(res, "thinking", { text: thinkingBuffer });
		thinkingBuffer = "";
	};

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed.startsWith("data:")) continue;
			const data = trimmed.slice(5).trim();
			if (data === "[DONE]") continue;
			try {
				const parsed = JSON.parse(data) as {
					choices?: {
						delta?: {
							content?: string;
							tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
						} & ReasoningDelta;
					}[];
				};
				const delta = parsed.choices?.[0]?.delta;
				if (delta?.content) {
					text += delta.content;
					writeSseEvent(res, "chunk", { text: delta.content });
				}
				const reasoningDelta = readReasoning(delta);
				if (reasoningDelta) {
					reasoning += reasoningDelta;
					thinkingBuffer += reasoningDelta;
					flushThinking(false);
				}
				for (const call of delta?.tool_calls ?? []) {
					const index = call.index ?? 0;
					const entry = pending.get(index) ?? { id: "", name: "", arguments: "" };
					if (call.id) entry.id = call.id;
					if (call.function?.name) entry.name = call.function.name;
					if (call.function?.arguments) entry.arguments += call.function.arguments;
					pending.set(index, entry);
				}
			} catch {
				// Linha incompleta (ainda não fechou o JSON) — ignora, o resto chega no próximo chunk.
			}
		}
	}

	flushThinking(true);

	const toolCalls = [...pending.entries()]
		.sort(([a], [b]) => a - b)
		.filter(([, entry]) => entry.name)
		.map(([index, entry]) => ({
			id: entry.id || `call_${index}`,
			type: "function" as const,
			function: { name: entry.name, arguments: entry.arguments || "{}" },
		}));

	return { text, reasoning, toolCalls };
};

/**
 * Chama um endpoint compatível com a API de chat completions da OpenAI (Ollama, vLLM, LM Studio,
 * groq, a própria OpenAI...) rodando o loop de function calling quando o agent tem ferramentas de
 * rede anexadas.
 *
 * Só ferramentas de rede entram (`http`/`mcp`/`connector`) — ver `resolveOpenAiTools`. Sem tools
 * resolvidas o comportamento é o de antes: uma chamada, texto puro.
 */
export const callOpenAiCompat = async (
	input: {
		baseUrl: string;
		apiKeyRef?: string;
		model: string;
		systemPrompt: string;
		prompt: string;
		tools?: ResolvedTool[];
	},
	resolveSecret: SecretResolver,
	res: ServerResponse,
): Promise<void> => {
	const auth = await resolveProviderAuth(input.apiKeyRef, resolveSecret);
	const normalizedBaseUrl = input.baseUrl.replace(/\/+$/, "");
	const model = await resolveModel(normalizedBaseUrl, auth, input.model);
	const url = withProviderAuth(`${normalizedBaseUrl}/chat/completions`, auth);

	const tools = input.tools ?? [];
	const byName = new Map(tools.map((tool) => [tool.definition.function.name, tool]));
	const toolDefinitions: OpenAiToolDefinition[] = tools.map((tool) => tool.definition);

	const messages: ChatMessage[] = [
		...(input.systemPrompt ? [{ role: "system" as const, content: input.systemPrompt }] : []),
		{ role: "user" as const, content: input.prompt },
	];

	let output = "";
	let lastReasoning = "";

	for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
		let response: Response;
		try {
			response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json", ...auth.headers },
				body: JSON.stringify({
					model,
					stream: true,
					messages,
					...(toolDefinitions.length > 0 ? { tools: toolDefinitions, tool_choice: "auto" } : {}),
				}),
			});
		} catch (err) {
			writeSseEvent(res, "error", {
				code: "unknown",
				message: `Não foi possível conectar em ${url} (${err instanceof Error ? err.message : "erro desconhecido"}).`,
			});
			res.end();
			return;
		}

		if (!response.ok) {
			const detail = await response.text().catch(() => "");
			// Modelo que não suporta function calling devolve 400 citando "tools"/"function". Sem esta
			// mensagem o usuário só vê um 400 cru e não tem como saber que a causa é o modelo escolhido.
			if (response.status === 400 && toolDefinitions.length > 0 && /tool|function/i.test(detail)) {
				writeSseEvent(res, "error", {
					code: "unknown",
					message:
						`O modelo "${model}" não aceita ferramentas (function calling), mas este agent tem ferramentas anexadas. ` +
						`Troque para um modelo com suporte a tools (ex.: qwen3, llama3.1, mistral-nemo) ou remova as ferramentas do agent. Detalhe: ${detail}`,
				});
				res.end();
				return;
			}
			writeSseEvent(res, "error", classifyHttpFailure(response.status, detail));
			res.end();
			return;
		}

		const turn = await readChatResponse(response, res);
		if (turn.reasoning) lastReasoning = turn.reasoning;

		if (turn.toolCalls.length === 0) {
			output = turn.text;
			break;
		}

		messages.push({ role: "assistant", content: turn.text || null, tool_calls: turn.toolCalls });

		for (const call of turn.toolCalls) {
			const tool = byName.get(call.function.name);
			writeSseEvent(res, "tool_use", {
				id: call.id,
				name: call.function.name,
				label: call.function.name,
				detail: call.function.arguments,
			});

			if (!tool) {
				// Nome alucinado: devolver o erro como resultado (em vez de abortar) deixa o modelo se
				// corrigir na rodada seguinte, com a lista do que existe de verdade.
				const available = [...byName.keys()].join(", ") || "(nenhuma)";
				const text = `Ferramenta "${call.function.name}" não existe. Disponíveis: ${available}.`;
				messages.push({ role: "tool", tool_call_id: call.id, content: text });
				writeSseEvent(res, "tool_result", { id: call.id, ok: false, label: call.function.name, detail: text });
				continue;
			}

			let args: Record<string, unknown> = {};
			try {
				args = call.function.arguments ? (JSON.parse(call.function.arguments) as Record<string, unknown>) : {};
			} catch {
				const text = `Argumentos inválidos (não são JSON): ${call.function.arguments}`;
				messages.push({ role: "tool", tool_call_id: call.id, content: text });
				writeSseEvent(res, "tool_result", { id: call.id, ok: false, label: call.function.name, detail: text });
				continue;
			}

			const result = await tool.execute(args);
			messages.push({ role: "tool", tool_call_id: call.id, content: result.text });
			writeSseEvent(res, "tool_result", {
				id: call.id,
				ok: result.ok,
				label: call.function.name,
				detail: result.text,
			});
		}
	}

	if (!output.trim()) {
		const ranTools = messages.some((message) => message.role === "tool");
		// Modelo "thinking" que gastou o turno raciocinando e fechou com `content` vazio é o caso mais
		// comum aqui (qwen3, deepseek-r1...) — e a mensagem antiga ("não retornou nenhum texto") não
		// dizia nada disso. Devolve o fim do raciocínio junto: é a única pista do que ele estava fazendo.
		const thoughtOnly = !ranTools && lastReasoning.trim().length > 0;
		writeSseEvent(res, "error", {
			code: "unknown",
			message: ranTools
				? `O agent usou as ferramentas mas não fechou uma resposta em ${MAX_TOOL_ITERATIONS} rodadas. Reduza o escopo do passo ou peça um formato de saída mais direto no prompt.`
				: thoughtOnly
					? `O modelo "${model}" raciocinou mas não produziu resposta final (só "reasoning", com o conteúdo vazio). ` +
						`Isso costuma acontecer quando o prompt é ambíguo sobre o formato de saída, ou quando o raciocínio consome o limite de contexto. ` +
						`Peça um formato de saída explícito no prompt do agent, ou use um modelo sem "thinking". Fim do raciocínio: "…${lastReasoning.trim().slice(-400)}"`
					: "O endpoint não retornou nenhum texto.",
		});
	} else {
		writeSseEvent(res, "done", { output: output.trim(), usedFallbackModel: false });
	}
	res.end();
};

/**
 * Converte os scripts anexados ao agent em function tools para o loop OpenAI-compat.
 *
 * Só ferramentas de rede: `http` (fetch declarativo) e `mcp`/`connector` (cliente MCP de verdade,
 * stdio ou HTTP). Os kinds `command`/`inline`/`file` executam processo arbitrário na máquina e
 * ficam fora — no caminho da Claude CLI quem concede isso é o próprio CLI, com as guardas dele.
 *
 * Quando `workspaceDir` é passado (agent `canExecute`), injeta incondicionalmente o server built-in
 * `workspace-fs.mjs` (write_file/read_file/list_files/render_slides) — providers openai-compat não
 * ganham Bash/Read/Write nativo como a Claude CLI, então sem isso o agent só descrevia arquivos em
 * texto e nunca os gravava de verdade, independente de o usuário ter anexado algum script `mcp`.
 *
 * Nunca lança: um server MCP que não sobe vira aviso no log e as demais tools seguem disponíveis —
 * derrubar o passo inteiro por causa de uma integração quebrada seria pior que rodar sem ela.
 */
const resolveOpenAiTools = async (
	scripts: ScriptPayload[],
	resolveSecret: SecretResolver,
	workspaceDir?: string,
): Promise<{ tools: ResolvedTool[]; close: () => Promise<void> }> => {
	const tools: ResolvedTool[] = [];
	const connections: McpConnection[] = [];
	const taken = new Set<string>();

	if (workspaceDir) {
		try {
			const connection = await connectMcpTools(
				"workspace",
				{
					command: process.execPath,
					args: [WORKSPACE_FS_SERVER_PATH],
					env: { ELECTRON_RUN_AS_NODE: "1", WORKESTRATOR_WORKSPACE_DIR: workspaceDir },
				},
				undefined,
				taken,
			);
			connections.push(connection);
			tools.push(...connection.tools);
		} catch (err) {
			console.error(
				"[tools] Falha ao subir o server built-in de filesystem:",
				err instanceof Error ? err.message : err,
			);
		}
	}

	for (const script of scripts) {
		try {
			if (script.kind === "http") {
				const def = await buildHttpToolDef(script, resolveSecret);
				// `def.name` já é o `safeFileName` do script — o mesmo nome que o `http-tool.mjs` registra
				// no caminho da Claude CLI. Reusar aqui mantém a ferramenta com um nome só, independente do
				// provider (hífen é válido na gramática de function name da OpenAI).
				if (def) tools.push(buildHttpTool(def, safeToolName(def.name, taken)));
				continue;
			}
			if (script.kind === "mcp" || script.kind === "connector") {
				const entry = await buildMcpServerEntry(script, resolveSecret);
				if (!entry) continue;
				const serverName = safeFileName(script.name) || script.id;
				const connection = await connectMcpTools(serverName, entry, script.toolAllowlist, taken);
				connections.push(connection);
				tools.push(...connection.tools);
			}
		} catch (err) {
			console.error(`[tools] Falha ao montar a ferramenta "${script.name}":`, err instanceof Error ? err.message : err);
		}
	}

	return {
		tools,
		close: async () => {
			await Promise.all(connections.map((connection) => connection.close()));
		},
	};
};

const readJsonBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
	new Promise((resolve, reject) => {
		let raw = "";
		req.on("data", (chunk) => (raw += chunk));
		req.on("end", () => {
			try {
				resolve(raw ? JSON.parse(raw) : {});
			} catch (err) {
				reject(err instanceof Error ? err : new Error("invalid json"));
			}
		});
		req.on("error", reject);
	});

/**
 * Escreve um evento Server-Sent Events — o navegador consome via `runtime/model-client.ts`. No-op se a
 * resposta já foi encerrada (ex.: cliente desconectou, ou outro handler já finalizou a request) — sem
 * essa checagem, `res.write()` lança `ERR_STREAM_WRITE_AFTER_END` síncrono, que dentro de um callback de
 * evento (child process, etc.) vira uma uncaught exception e derruba o processo principal inteiro.
 */
const writeSseEvent = (res: ServerResponse, event: string, data: unknown): void => {
	if (res.writableEnded) return;
	res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

// --- Preview de arquivos gerados (HTML/imagens/md) — ver docs/plano de preview & aprovação ---

const CONTENT_TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".htm": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".md": "text/markdown; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
	".ico": "image/x-icon",
};
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"]);
const PREVIEW_IGNORE = new Set(["node_modules", ".git", "dist", "build", ".next", ".cache"]);
const MAX_PREVIEW_FILES = 500;

/** Raízes registradas que o servidor de preview pode servir — allowlist contra leitura arbitrária de disco. */
const previewRoots = new Map<string, string>();

const rootIdFor = (dir: string): string => createHash("sha1").update(path.resolve(dir)).digest("hex").slice(0, 12);

const jsonResponse = (res: ServerResponse, status: number, body: unknown): void => {
	res.statusCode = status;
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify(body));
};

/** `POST /api/register-preview {dir}` — registra a pasta e devolve um `rootId` p/ montar URLs de preview. */
export const handleRegisterPreview = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
	if (req.method !== "POST") return jsonResponse(res, 405, { message: "Método não permitido." });
	const body = await readJsonBody(req).catch((): Record<string, unknown> => ({}));
	const raw = typeof body.dir === "string" ? body.dir.trim() : "";
	const runId = typeof body.runId === "string" ? body.runId.trim() : "";
	// `runId` → snapshot do run no histórico; `dir` explícito → pasta escolhida; vazio → workspace fixo
	// do runner (execução de squad, que não expõe o path ao front).
	const dir = runId
		? path.join(WORKSPACE_DIR, RUNS_SUBDIR, safeFileName(runId))
		: raw
			? path.resolve(raw)
			: WORKSPACE_DIR;
	if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
		return jsonResponse(res, 400, { message: "Diretório inexistente." });
	}
	const rootId = rootIdFor(dir);
	previewRoots.set(rootId, dir);
	jsonResponse(res, 200, { rootId });
};

/** SHA fixa da árvore vazia do git — usada como base de diff quando o repo ainda não tem nenhum commit
 * (o workspace nunca é commitado, só `git init`, então `HEAD` fica "unborn"). */
const EMPTY_TREE_HASH = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

/**
 * Lista (via git) os caminhos criados/alterados relativos a `dir` — arquivos rastreados modificados +
 * não rastreados. Exclui `.runs/` (snapshots de runs anteriores) e `.git`/`scripts` pra não vazarem no
 * diff. Vazio se `dir` não for um repo git.
 */
const listChangedRelPaths = (dir: string): string[] => {
	if (!fs.existsSync(path.join(dir, ".git"))) return [];
	try {
		// `add -N` (intent-to-add) garante que arquivos novos entrem no `git diff` mesmo se algum passo
		// do run já os tiver "staged" antes (ver `captureGitDiff`) — sem isso eles somem tanto do diff
		// contra HEAD quanto do `ls-files --others`, e o snapshot do run fica vazio mesmo com arquivos reais em disco.
		spawnSync("git", ["add", "-N", "."], { cwd: dir, stdio: "ignore" });
		const hasHead = spawnSync("git", ["rev-parse", "--verify", "HEAD"], { cwd: dir, stdio: "ignore" }).status === 0;
		const changed = spawnSync("git", ["diff", "--name-only", hasHead ? "HEAD" : EMPTY_TREE_HASH], {
			cwd: dir,
			encoding: "utf-8",
		});
		const untracked = spawnSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: dir, encoding: "utf-8" });
		return [...(changed.stdout ?? "").split("\n"), ...(untracked.stdout ?? "").split("\n")]
			.map((l) => l.trim())
			.filter(Boolean)
			.filter((rel) => {
				const first = rel.split("/")[0];
				return first !== RUNS_SUBDIR && first !== ".git";
			});
	} catch {
		return [];
	}
};

/**
 * Lista TODOS os arquivos de `dir` (respeitando `MAX_PREVIEW_FILES`/`PREVIEW_IGNORE`) — fallback usado
 * quando não há como (ou não teve o que) listar via `listChangedRelPaths`, pra nunca depender só do
 * git existir/funcionar na máquina do usuário (sem `.git` ou sem o binário `git` no PATH, o diff fica
 * vazio mesmo com arquivos reais em disco).
 */
export const walkAllRelPaths = (dir: string): string[] => {
	const relPaths: string[] = [];
	const walk = (current: string): void => {
		if (relPaths.length >= MAX_PREVIEW_FILES) return;
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			if (relPaths.length >= MAX_PREVIEW_FILES) return;
			if (entry.name.startsWith(".") || PREVIEW_IGNORE.has(entry.name)) continue;
			const abs = path.join(current, entry.name);
			if (entry.isDirectory()) walk(abs);
			else relPaths.push(path.relative(dir, abs));
		}
	};
	try {
		walk(dir);
	} catch {
		// pasta ilegível — devolve o que já coletou
	}
	return relPaths;
};

/** `POST /api/list-files {dir, changedOnly?}` — lista arquivos da pasta (ou só os alterados via git). */
export const handleListFiles = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
	if (req.method !== "POST") return jsonResponse(res, 405, { message: "Método não permitido." });
	const body = await readJsonBody(req).catch((): Record<string, unknown> => ({}));
	const raw = typeof body.dir === "string" ? body.dir.trim() : "";
	const changedOnly = Boolean(body.changedOnly);
	// `dir` vazio → workspace fixo do runner (execução de squad).
	const dir = raw ? path.resolve(raw) : WORKSPACE_DIR;
	if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
		return jsonResponse(res, 400, { message: "Diretório inexistente." });
	}

	const toEntry = (rel: string) => {
		const ext = path.extname(rel).toLowerCase();
		let size = 0;
		try {
			size = fs.statSync(path.join(dir, rel)).size;
		} catch {
			size = 0;
		}
		return { path: rel.replace(/\\/g, "/"), ext, isImage: IMAGE_EXTS.has(ext), size };
	};

	let relPaths: string[] = changedOnly ? listChangedRelPaths(dir) : [];
	if (relPaths.length === 0) relPaths = walkAllRelPaths(dir);

	const files = [...new Set(relPaths)].sort().map(toEntry);
	jsonResponse(res, 200, { files });
};

/**
 * `POST /api/snapshot-run {runId, dir?}` — ao final de um run, copia os arquivos criados/alterados do
 * workspace para `orchestrator-workspace/.runs/<runId>/` (preservado pelo reset) e devolve o manifesto +
 * `rootId` de preview. É o que dá visibilidade dos arquivos no histórico depois que o workspace é
 * resetado pelo próximo run. Best-effort: sem arquivos alterados, devolve lista vazia sem criar a pasta.
 */
export const handleSnapshotRun = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
	if (req.method !== "POST") return jsonResponse(res, 405, { message: "Método não permitido." });
	const body = await readJsonBody(req).catch((): Record<string, unknown> => ({}));
	const runId = typeof body.runId === "string" ? body.runId.trim() : "";
	if (!runId) return jsonResponse(res, 400, { message: "runId obrigatório." });
	const raw = typeof body.dir === "string" ? body.dir.trim() : "";
	const source = raw ? path.resolve(raw) : WORKSPACE_DIR;
	if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
		return jsonResponse(res, 200, { files: [], rootId: null });
	}

	let relPaths = [...new Set(listChangedRelPaths(source))].sort();
	// Sem `.git` (ou `git` ausente do PATH), `listChangedRelPaths` sempre volta vazio mesmo com arquivos
	// reais em disco — sem este fallback, o run perdia o snapshot inteiro (histórico "Ver arquivos" vazio)
	// mesmo quando os agents geraram tudo certinho.
	if (relPaths.length === 0) relPaths = [...new Set(walkAllRelPaths(source))].sort();
	if (relPaths.length === 0) return jsonResponse(res, 200, { files: [], rootId: null });

	const destRoot = path.join(WORKSPACE_DIR, RUNS_SUBDIR, safeFileName(runId));
	const files: { path: string; ext: string; isImage: boolean; size: number }[] = [];
	for (const rel of relPaths) {
		if (files.length >= MAX_PREVIEW_FILES) break;
		const src = path.join(source, rel);
		try {
			if (!fs.existsSync(src) || fs.statSync(src).isDirectory()) continue;
			const dest = path.join(destRoot, rel);
			fs.mkdirSync(path.dirname(dest), { recursive: true });
			fs.copyFileSync(src, dest);
			const ext = path.extname(rel).toLowerCase();
			files.push({ path: rel.replace(/\\/g, "/"), ext, isImage: IMAGE_EXTS.has(ext), size: fs.statSync(dest).size });
		} catch {
			// arquivo ilegível/removido no meio — pula, o snapshot segue com os demais.
		}
	}

	if (files.length === 0) return jsonResponse(res, 200, { files: [], rootId: null });
	const rootId = rootIdFor(destRoot);
	previewRoots.set(rootId, destRoot);
	jsonResponse(res, 200, { files, rootId });
};

/**
 * `POST /api/reset-workspace {dir?}` — limpa o workspace fixo antes de um run novo, pra arquivos de runs
 * anteriores não vazarem no preview. Remove tudo na raiz EXCETO `.git` (infra), `scripts/` (rematerializado
 * a cada passo) e `.runs/` (snapshots de histórico). Segurança: só age no workspace fixo do runner — numa
 * pasta escolhida pelo usuário nunca apaga nada (devolve `skipped`).
 */
export const handleResetWorkspace = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
	if (req.method !== "POST") return jsonResponse(res, 405, { message: "Método não permitido." });
	const body = await readJsonBody(req).catch((): Record<string, unknown> => ({}));
	const raw = typeof body.dir === "string" ? body.dir.trim() : "";
	const dir = raw ? path.resolve(raw) : WORKSPACE_DIR;
	if (dir !== WORKSPACE_DIR) return jsonResponse(res, 200, { ok: true, skipped: true });
	try {
		if (fs.existsSync(dir)) {
			for (const entry of fs.readdirSync(dir)) {
				if (entry === ".git" || entry === SCRIPTS_SUBDIR || entry === RUNS_SUBDIR) continue;
				fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
			}
		}
		jsonResponse(res, 200, { ok: true });
	} catch (error) {
		jsonResponse(res, 500, { ok: false, message: error instanceof Error ? error.message : String(error) });
	}
};

/** `GET /preview/:rootId/<relpath>?t=<token>` — serve o arquivo (iframe/img). Token na URL (headers não viajam). */
export const handlePreviewFile = (req: IncomingMessage, res: ServerResponse, expectedToken?: string): void => {
	// No `vite dev` (connect) o mount tira o prefixo de `req.url`; `originalUrl` mantém o caminho completo.
	const rawUrl = (req as IncomingMessage & { originalUrl?: string }).originalUrl ?? req.url ?? "";
	const url = new URL(rawUrl, "http://127.0.0.1");
	const match = url.pathname.match(/^\/preview\/([^/]+)\/(.*)$/);
	if (!match) {
		res.statusCode = 404;
		res.end();
		return;
	}
	const [, rootId, rel] = match;
	if (expectedToken && url.searchParams.get("t") !== expectedToken) {
		res.statusCode = 401;
		res.end();
		return;
	}
	const root = previewRoots.get(rootId);
	if (!root) {
		res.statusCode = 404;
		res.end();
		return;
	}
	const filePath = path.resolve(root, decodeURIComponent(rel));
	// Guarda de path traversal: o arquivo resolvido tem que estar dentro da raiz registrada.
	if (filePath !== root && !filePath.startsWith(root + path.sep)) {
		res.statusCode = 403;
		res.end();
		return;
	}
	if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
		res.statusCode = 404;
		res.end();
		return;
	}
	res.statusCode = 200;
	res.setHeader("Content-Type", CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream");
	fs.createReadStream(filePath).pipe(res);
};

/**
 * Handler puro Node.js (sem depender do Vite) que atende `/api/run-step`, chamando o CLI local já
 * autenticado na máquina do usuário (claude/codex/gpt — headless, sem sessão persistida pelo
 * backend). Compartilhado entre o middleware do `vite dev` (electron/runner é importado por
 * vite.config.ts) e o servidor local do processo main do Electron — mesma lógica, dois hosts diferentes.
 *
 * Resposta é streaming (SSE): cada chunk de stdout vira um evento "chunk", e o resultado final vira
 * "done" ou "error" no close do processo. Falhas de validação antes de o processo existir continuam
 * JSON simples — não há nada pra streamar nesses casos.
 */
export const handleRunStep = async (
	req: IncomingMessage,
	res: ServerResponse,
	/** Cache local opcional (offline, ver §8.4) — a resolução primária é sempre via backend, por request. */
	cache?: SecretCache,
): Promise<void> => {
	if (req.method !== "POST") {
		res.statusCode = 405;
		res.end();
		return;
	}

	let rawBody: Record<string, unknown>;
	try {
		rawBody = await readJsonBody(req);
	} catch {
		res.statusCode = 400;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ code: "unknown", message: "Corpo da requisição inválido." }));
		return;
	}

	const body = rawBody as {
		systemPrompt?: string;
		prompt?: string;
		model?: string;
		providerKind?: string;
		baseUrl?: string;
		apiKeyRef?: string;
		canExecute?: boolean;
		workingDir?: string;
		scripts?: ScriptPayload[];
		maxBudgetUsd?: number;
		backendBaseUrl?: string;
		backendToken?: string;
	};
	const {
		systemPrompt = "",
		prompt = "",
		model = "",
		providerKind = "claude-cli",
		baseUrl = "",
		apiKeyRef,
		canExecute = false,
		workingDir,
		scripts = [],
		maxBudgetUsd,
		backendBaseUrl,
		backendToken,
	} = body;
	// Só aceita um valor positivo finito vindo do corpo — qualquer coisa fora disso cai no default.
	const budgetUsd =
		typeof maxBudgetUsd === "number" && Number.isFinite(maxBudgetUsd) && maxBudgetUsd > 0
			? maxBudgetUsd
			: DEFAULT_MAX_BUDGET_USD;
	// Pasta de trabalho efetiva: a escolhida pelo usuário (só quando executa de verdade) ou o workspace
	// fixo. Nunca deixa o cwd cair fora do que o usuário selecionou — `path.resolve` normaliza o caminho.
	const workspaceDir = canExecute && workingDir?.trim() ? path.resolve(workingDir.trim()) : WORKSPACE_DIR;
	const isCustomWorkspace = workspaceDir !== WORKSPACE_DIR;
	const resolveSecret = createBackendSecretResolver(backendBaseUrl, backendToken, cache);

	// Sem isso, agents que precisam montar `file://` ou caminhos de arquivo (ex.: Playwright navegando
	// pro HTML de um slide) têm que "adivinhar" o caminho absoluto da workspace no próprio systemPrompt —
	// e como o agent nunca sabe o caminho real da máquina do usuário, ele aluciona algo genérico (ex.:
	// "/home/user/workspace") que não existe. Aqui é o único lugar em que o caminho real já é conhecido
	// com certeza, então injetamos automaticamente — nenhum agent precisa mais descrever localização.
	const effectiveSystemPrompt = canExecute
		? `${systemPrompt}\n\nDiretório de trabalho absoluto desta execução: ${workspaceDir}\nSempre que precisar montar um caminho de arquivo ou uma URL file://, use ESSE caminho absoluto exato como base — nunca invente, abrevie ou assuma outro caminho (ex.: nunca use "/home/user/workspace" ou qualquer placeholder genérico).`
		: systemPrompt;

	const isHttpCompat = providerKind === "openai" || providerKind === "openai-compat";

	if (!LOCAL_CLI_PROVIDERS.has(providerKind) && !isHttpCompat) {
		res.statusCode = 501;
		res.setHeader("Content-Type", "application/json");
		res.end(
			JSON.stringify({
				code: "unsupported_provider",
				message: `Provider "${providerKind}" ainda não executa de verdade nesta versão.`,
			}),
		);
		return;
	}

	res.statusCode = 200;
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.flushHeaders?.();

	if (isHttpCompat) {
		const resolvedBaseUrl = baseUrl.trim() || (providerKind === "openai" ? "https://api.openai.com/v1" : "");
		if (!resolvedBaseUrl) {
			writeSseEvent(res, "error", { code: "unknown", message: "Base URL não configurada para este provider." });
			res.end();
			return;
		}
		// As ferramentas de rede do agent viram function tools de verdade aqui — sem isso o modelo
		// recebia um prompt anunciando integrações que nunca chegavam no payload. `workspaceDir` injeta
		// incondicionalmente o server built-in de filesystem (ver `resolveOpenAiTools`).
		const resolved = canExecute
			? await resolveOpenAiTools(scripts, resolveSecret, workspaceDir)
			: { tools: [], close: async () => {} };
		// Só este branch (openai-compat) ganha o server built-in de filesystem — precisa dizer o nome
		// exato das tools e deixar explícito que é uma CHAMADA de tool, não só descrever em texto, porque
		// modelos locais mais fracos tendem a "narrar" que salvaram/renderizaram algo sem de fato chamar
		// a tool (era exatamente o bug: Slide Author só devolvia o HTML como texto, nunca gravava nada).
		const openAiSystemPrompt = canExecute
			? `${effectiveSystemPrompt}\n\nFerramentas de arquivo SEMPRE disponíveis nesta execução — CHAME como tool de verdade, nunca apenas diga em texto que gravou/leu/renderizou algo: "workspace__write_file" (path, content) grava um arquivo; "workspace__read_file" (path) lê um arquivo; "workspace__list_files" (dir?) lista o que já existe de verdade na pasta de trabalho; "workspace__render_slides" (inputDir?, outputDir?) renderiza sozinho todo HTML de output/slides/ em JPEG de output/images/, sem precisar montar URL file:// nem navegar manualmente.`
			: effectiveSystemPrompt;
		try {
			await callOpenAiCompat(
				{
					baseUrl: resolvedBaseUrl,
					apiKeyRef,
					model,
					systemPrompt: openAiSystemPrompt,
					prompt,
					tools: resolved.tools,
				},
				resolveSecret,
				res,
			);
		} finally {
			// Servers MCP stdio são processos filhos — sem o close eles vazam a cada passo do run.
			await resolved.close();
		}
		return;
	}

	let mcpResolution: McpResolution | undefined;
	if (canExecute) {
		ensureWorkspace(workspaceDir, !isCustomWorkspace);
		materializeScripts(scripts, workspaceDir);

		// MCP só se aplica à Claude CLI (única com `--mcp-config` nativo hoje — ver plano, Etapa 3).
		if (providerKind === "claude-cli") {
			const mcpConfig = await buildMcpConfig(scripts, resolveSecret);
			if (mcpConfig) {
				const configPath = writeMcpConfig(mcpConfig, workspaceDir);
				const allowedTools = scripts
					.filter((s): s is ScriptPayload & { toolAllowlist: string[] } => s.kind === "mcp" && Boolean(s.toolAllowlist?.length))
					.flatMap((s) => s.toolAllowlist.map((tool) => `mcp__${safeFileName(s.name) || s.id}__${tool}`));
				mcpResolution = { configPath, allowedTools };
				logToolConfig(scripts, configPath, workspaceDir);
			}
		}
	}

	// Codex + conta ChatGPT: descarta o modelo configurado (força o default da conta) — ver acima.
	const effectiveModel =
		providerKind === "codex-cli" && codexUsesChatGptAccount() ? CLI_DEFAULT_MODEL : model;
	const plan = buildExecutorPlan(
		providerKind,
		effectiveModel,
		effectiveSystemPrompt,
		prompt,
		canExecute,
		mcpResolution,
		budgetUsd,
	);

	// stdin: quando `plan.stdinInput` existe (Claude CLI), o prompt vai por pipe — escrevemos e fechamos
	// logo abaixo. Sem `stdinInput` (codex/gpt, que recebem o prompt como argumento) o stdin é ignorado:
	// senão o CLI espera dados de um pipe que nunca chega.
	// `cross-spawn` (não `node:child_process` puro) porque no Windows binários instalados via
	// `npm install -g` (claude/codex/gpt) são scripts `.cmd`, e `child_process.spawn` sem
	// `shell: true` falha com ENOENT pra eles — mas ligar `shell: true` cru exporia o prompt do
	// usuário (vira argumento do cmd.exe) a injeção de comando via escaping do cmd.exe. `cross-spawn`
	// resolve e escapa isso com segurança, mantendo a mesma API do `spawn` nativo.
	const child = crossSpawn(plan.command, plan.args, {
		cwd: canExecute ? workspaceDir : os.tmpdir(),
		windowsHide: true,
		stdio: [plan.stdinInput != null ? "pipe" : "ignore", "pipe", "pipe"],
	});
	if (plan.stdinInput != null) {
		child.stdin?.on("error", () => {}); // EPIPE se o processo morrer antes de ler o stdin — não derruba o runner.
		child.stdin?.write(plan.stdinInput);
		child.stdin?.end();
	}
	let stdout = "";
	let stderr = "";
	// Estado do parser de stream-json (só quando `plan.streamJson`): buffer de linha parcial, texto da
	// resposta acumulado e o resultado final vindo do evento `result`.
	let sjBuffer = "";
	let sjText = "";
	let sjResult: string | undefined;
	let sjError: string | undefined;

	// Parseia UMA linha JSON do stream-json da Claude CLI e emite os eventos SSE ao vivo.
	const handleStreamJsonLine = (line: string): void => {
		let obj: {
			type?: string;
			subtype?: string;
			message?: {
				content?: Array<{
					type?: string;
					text?: string;
					thinking?: string;
					name?: string;
					id?: string;
					input?: unknown;
					content?: unknown;
					tool_use_id?: string;
					is_error?: boolean;
				}>;
			};
			result?: unknown;
			is_error?: boolean;
			description?: string;
			summary?: string;
			status?: string;
			tool_use_id?: string;
		};
		try {
			obj = JSON.parse(line);
		} catch {
			return; // linha parcial/ruído — ignora
		}
		if (obj.type === "assistant" && Array.isArray(obj.message?.content)) {
			for (const part of obj.message.content) {
				if (part.type === "thinking" && typeof part.thinking === "string") {
					writeSseEvent(res, "thinking", { text: part.thinking });
				} else if (part.type === "text" && typeof part.text === "string") {
					sjText += part.text;
					writeSseEvent(res, "chunk", { text: part.text });
				} else if (part.type === "tool_use") {
					writeSseEvent(res, "tool_use", {
						id: typeof part.id === "string" ? part.id : undefined,
						name: typeof part.name === "string" ? part.name : undefined,
						label: typeof part.name === "string" ? part.name : "ferramenta",
						detail: part.input != null ? JSON.stringify(part.input) : undefined,
					});
				}
			}
		} else if (obj.type === "user" && Array.isArray(obj.message?.content)) {
			for (const part of obj.message.content) {
				if (part.type === "tool_result") {
					writeSseEvent(res, "tool_result", {
						id: typeof part.tool_use_id === "string" ? part.tool_use_id : undefined,
						ok: part.is_error !== true,
						label: "resultado",
						detail: typeof part.content === "string" ? part.content : JSON.stringify(part.content),
					});
				}
			}
		} else if (obj.type === "system" && obj.subtype === "task_notification") {
			writeSseEvent(res, "tool_result", {
				id: typeof obj.tool_use_id === "string" ? obj.tool_use_id : undefined,
				ok: obj.status !== "failed" && obj.status !== "error",
				label: typeof obj.description === "string" ? obj.description : "ferramenta",
				detail: typeof obj.summary === "string" ? obj.summary : obj.status,
			});
		} else if (obj.type === "result") {
			if (typeof obj.result === "string") sjResult = obj.result;
			if (obj.is_error) sjError = typeof obj.result === "string" && obj.result ? obj.result : "A execução retornou erro.";
		}
	};

	// Execução real (rodar testes, build, render de imagem via Playwright, etc.) pode demorar bem mais
	// que uma resposta de texto simples — daí o timeout maior no modo execução.
	const timeoutMs = canExecute ? 600_000 : 90_000;
	// Quando o spawn falha (ex.: binário fora do PATH), o Node emite `error` E `close` para o mesmo
	// child — sem essa trava, os dois handlers abaixo tentam responder a mesma request.
	let settled = false;
	// `code === null` no `close` só distingue "morto por sinal" de "saiu sozinho" — não diz *por que*
	// foi morto. Este flag separa o kill do timeout (mensagem acionável) de um cancelamento/crash.
	let timedOut = false;
	const timeout = setTimeout(() => {
		timedOut = true;
		child.kill();
	}, timeoutMs);

	// `stdout`/`stderr` são garantidos non-null em runtime pelo `stdio: ["ignore", "pipe", "pipe"]`
	// acima — os tipos do `cross-spawn` não carregam essa narrowing como o `node:child_process` nativo.
	child.stdout?.on("data", (chunk) => {
		const text = chunk.toString();
		stdout += text;
		if (plan.streamJson) {
			// stream-json: uma linha JSON por evento. Bufferiza linhas parciais entre chunks.
			sjBuffer += text;
			let nl: number;
			while ((nl = sjBuffer.indexOf("\n")) >= 0) {
				const line = sjBuffer.slice(0, nl).trim();
				sjBuffer = sjBuffer.slice(nl + 1);
				if (line) handleStreamJsonLine(line);
			}
		} else {
			writeSseEvent(res, "chunk", { text });
		}
	});
	child.stderr?.on("data", (chunk) => (stderr += chunk.toString()));

	child.on("close", (code) => {
		if (settled) return;
		settled = true;
		clearTimeout(timeout);

		// stream-json: descarrega a última linha bufferizada (o evento `result` costuma ser a última).
		if (plan.streamJson && sjBuffer.trim()) handleStreamJsonLine(sjBuffer.trim());

		// `codex exec --output-last-message` escreve a resposta final num arquivo separado — mais
		// confiável que o stdout (que carrega narração de "thinking"/tool calls, não só a resposta).
		// stream-json: a resposta final vem do evento `result` (fallback pro texto acumulado).
		let output = stdout.trim();
		if (plan.outputFile) {
			try {
				output = fs.readFileSync(plan.outputFile, "utf-8").trim() || output;
			} catch {
				// Arquivo não escrito (falha antes de terminar) — segue com o stdout mesmo.
			} finally {
				fs.rm(plan.outputFile, { force: true }, () => {});
			}
		} else if (plan.streamJson) {
			output = (sjResult ?? sjText).trim();
		}

		// No stream-json o stdout cru é JSON — não serve de "detalhe" pro usuário; usa as partes parseadas.
		const failureDetail = plan.streamJson
			? [stderr.trim(), sjError, sjResult, sjText].filter(Boolean).join(" | ")
			: [stderr.trim(), stdout.trim()].filter(Boolean).join(" | ");

		if (code !== 0 || !output || (plan.streamJson && sjError)) {
			if (timedOut) {
				const partial = failureDetail;
				writeSseEvent(res, "error", {
					code: "unknown",
					message:
						`${plan.command} atingiu o tempo limite de ${Math.round(timeoutMs / 1000)}s e foi encerrado.` +
						(partial ? ` Última saída: ${partial}` : " Não houve saída antes do limite."),
				});
				res.end();
				return;
			}
			const detail = failureDetail || `${plan.command} saiu com código ${code} sem saída.`;
			writeSseEvent(res, "error", classifyCliFailure(plan.command, detail));
		} else {
			// Diff das mudanças feitas na pasta (só no modo execução) — alimenta o painel de artefatos.
			const diff = canExecute ? captureGitDiff(workspaceDir) : undefined;
			writeSseEvent(res, "done", { output, usedFallbackModel: Boolean(plan.modelIgnored), diff });
		}
		res.end();
	});

	child.on("error", (err) => {
		if (settled) return;
		settled = true;
		clearTimeout(timeout);
		writeSseEvent(res, "error", {
			code: "unknown",
			message: `"${plan.command}" não encontrado no PATH (${err.message}).`,
		});
		res.end();
	});

	req.on("close", () => {
		clearTimeout(timeout);
		child.kill();
	});
};

export type TestToolResult = { ok: boolean; message: string; detail?: string };

const INTERPRETER_BY_LANGUAGE: Record<string, string> = {
	bash: "bash",
	node: "node",
	python: process.platform === "win32" ? "python" : "python3",
};

const TEST_TOOL_TIMEOUT_MS = 15_000;

/** Roda um comando curto (spawn), com timeout, e devolve stdout/stderr/exit code — usado só pelo teste. */
const runProcessForTest = (command: string, args: string[], cwd: string): Promise<TestToolResult> =>
	new Promise((resolve) => {
		let stdout = "";
		let stderr = "";
		const child = crossSpawn(command, args, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
		const timeout = setTimeout(() => {
			child.kill();
			resolve({ ok: false, message: `Sem resposta em ${TEST_TOOL_TIMEOUT_MS / 1000}s — encerrado.` });
		}, TEST_TOOL_TIMEOUT_MS);

		child.stdout?.on("data", (chunk) => (stdout += chunk.toString()));
		child.stderr?.on("data", (chunk) => (stderr += chunk.toString()));
		child.on("close", (code) => {
			clearTimeout(timeout);
			const detail = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n").slice(0, 2000);
			resolve({
				ok: code === 0,
				message: code === 0 ? "Comando executado com sucesso." : `Saiu com código ${code}.`,
				detail,
			});
		});
		child.on("error", (err) => {
			clearTimeout(timeout);
			resolve({ ok: false, message: `"${command}" não encontrado no PATH (${err.message}).` });
		});
	});

/** Health-check de um servidor MCP stdio: sobe o processo, dá um tempo curto pra ele se estabilizar
 * (ou crashar), mata em seguida. Não fala o protocolo MCP (JSON-RPC "initialize"/"tools/list") — só
 * confirma que o binário existe e não morre imediatamente. Ver docs/plano-redesign-scripts-wizard.md §3.3. */
const healthCheckStdioServer = (
	command: string,
	args: string[] | undefined,
	env: Record<string, string> | undefined,
): Promise<TestToolResult> =>
	new Promise((resolve) => {
		let stderr = "";
		let settled = false;
		const child = crossSpawn(command, args ?? [], {
			cwd: os.tmpdir(),
			windowsHide: true,
			stdio: ["ignore", "ignore", "pipe"],
			env: { ...process.env, ...env },
		});
		const finish = (result: TestToolResult) => {
			if (settled) return;
			settled = true;
			clearTimeout(settleTimer);
			child.kill();
			resolve(result);
		};
		const settleTimer = setTimeout(
			() => finish({ ok: true, message: "Processo iniciou e continua de pé (health-check, não testa as tools)." }),
			1500,
		);
		child.stderr?.on("data", (chunk) => (stderr += chunk.toString()));
		child.on("exit", (code) => {
			if (code !== null && code !== 0) {
				finish({ ok: false, message: `Processo saiu com código ${code} antes do health-check terminar.`, detail: stderr.trim() });
			}
		});
		child.on("error", (err) => finish({ ok: false, message: `"${command}" não encontrado no PATH (${err.message}).` }));
	});

/**
 * `/api/test-tool` — chamado pelo passo "Testar" do wizard de scripts. Executa a integração de
 * verdade conforme o `kind`: `command`/`inline`/`file` rodam e devolvem stdout/stderr/exit code;
 * `http` faz a request e devolve status + trecho do body; `mcp`/`connector` fazem um health-check
 * do servidor (sobe e confirma que não crasha), não uma listagem real das tools — falar o protocolo
 * MCP (JSON-RPC initialize/tools-list) fica pra uma iteração futura (ver plano, Fase C).
 */
export const handleTestTool = async (req: IncomingMessage, res: ServerResponse, cache?: SecretCache): Promise<void> => {
	if (req.method !== "POST") {
		res.statusCode = 405;
		res.end();
		return;
	}

	let rawBody: Record<string, unknown>;
	try {
		rawBody = await readJsonBody(req);
	} catch {
		res.statusCode = 400;
		res.setHeader("Content-Type", "application/json");
		res.end(JSON.stringify({ ok: false, message: "Corpo da requisição inválido." }));
		return;
	}

	const { script, backendBaseUrl, backendToken } = rawBody as {
		script?: ScriptPayload;
		backendBaseUrl?: string;
		backendToken?: string;
	};
	res.setHeader("Content-Type", "application/json");
	if (!script) {
		res.statusCode = 400;
		res.end(JSON.stringify({ ok: false, message: "Informe o script a testar." }));
		return;
	}

	const resolveSecret = createBackendSecretResolver(backendBaseUrl, backendToken, cache);
	res.statusCode = 200;

	try {
		if (script.kind === "command") {
			if (!script.command) {
				res.end(JSON.stringify({ ok: false, message: "Informe o comando." }));
				return;
			}
			res.end(JSON.stringify(await runProcessForTest(script.command, script.args ?? [], os.tmpdir())));
			return;
		}

		if (script.kind === "file") {
			if (!script.path) {
				res.end(JSON.stringify({ ok: false, message: "Informe o caminho." }));
				return;
			}
			try {
				const stat = fs.statSync(script.path);
				res.end(
					JSON.stringify({
						ok: true,
						message: stat.isDirectory() ? "Diretório encontrado." : `Arquivo encontrado (${stat.size} bytes).`,
					}),
				);
			} catch (err) {
				res.end(JSON.stringify({ ok: false, message: `Caminho não encontrado (${err instanceof Error ? err.message : "erro"}).` }));
			}
			return;
		}

		if (script.kind === "inline") {
			const interpreter = INTERPRETER_BY_LANGUAGE[script.language ?? "bash"] ?? "bash";
			const ext = LANGUAGE_EXTENSION[script.language ?? "bash"] ?? "sh";
			const tmpFile = path.join(os.tmpdir(), `test-tool-${randomUUID()}.${ext}`);
			fs.writeFileSync(tmpFile, script.content ?? "", "utf-8");
			try {
				res.end(JSON.stringify(await runProcessForTest(interpreter, [tmpFile], os.tmpdir())));
			} finally {
				fs.rm(tmpFile, { force: true }, () => {});
			}
			return;
		}

		if (script.kind === "http") {
			if (!script.urlTemplate) {
				res.end(JSON.stringify({ ok: false, message: "Informe a URL." }));
				return;
			}
			let headers = await resolveMapPlaceholders(script.headers, resolveSecret);
			let url = script.urlTemplate;
			if (script.authRef && !Object.keys(headers).some((h) => h.toLowerCase() === "authorization")) {
				const resolved = await resolveSecret(script.authRef);
				if (resolved) ({ headers, url } = await applyAuthToHttpTarget(resolved, { headers, url }));
			}
			try {
				const response = await fetch(url, { method: script.method ?? "GET", headers });
				const bodyText = (await response.text()).slice(0, 2000);
				res.end(
					JSON.stringify({
						ok: response.ok,
						message: `HTTP ${response.status} ${response.statusText}`,
						detail: bodyText,
					}),
				);
			} catch (err) {
				res.end(JSON.stringify({ ok: false, message: `Falha de rede (${err instanceof Error ? err.message : "erro"}).` }));
			}
			return;
		}

		if (script.kind === "mcp" || script.kind === "connector") {
			const entry = await buildMcpServerEntry(script, resolveSecret);
			if (!entry) {
				res.end(JSON.stringify({ ok: false, message: "Não foi possível montar a configuração — confira os campos." }));
				return;
			}
			if ("type" in entry) {
				try {
					const response = await fetch(entry.url, { headers: entry.headers });
					res.end(JSON.stringify({ ok: response.ok, message: `HTTP ${response.status} ${response.statusText}` }));
				} catch (err) {
					res.end(JSON.stringify({ ok: false, message: `Falha de rede (${err instanceof Error ? err.message : "erro"}).` }));
				}
				return;
			}
			res.end(JSON.stringify(await healthCheckStdioServer(entry.command, entry.args, entry.env)));
			return;
		}

		res.end(JSON.stringify({ ok: false, message: `Kind "${script.kind}" não tem teste implementado.` }));
	} catch (err) {
		res.statusCode = 500;
		res.end(JSON.stringify({ ok: false, message: err instanceof Error ? err.message : "Erro desconhecido no teste." }));
	}
};
