// Chama o provider de modelo do agent (Claude CLI local hoje; outros providers via API depois).
// No navegador (vite dev) isso bate no middleware dev-only registrado em vite.config.ts. No app
// Electron empacotado, `window.__ORCH_API__` (injetado pelo preload) aponta pro servidor local do
// processo main — mesmo handler, hosts diferentes. Nenhuma API key trafega pelo navegador, o
// browser só manda a referência (apiKeyRef) e o servidor resolve o valor real do lado de trás.
// Transporte é streaming (SSE): o texto chega em pedaços via `onChunk` conforme é gerado, e o
// resultado final resolve a promise quando o evento "done" chega.
import { apiUrl } from "@/app/api/clients";
import { tokenStorage } from "@/app/utils/tokenStorage";
import type { ProviderKind, ScriptKind } from "../types";

/** Injetado pelo preload do Electron (`electron/preload.ts`); ausente/vazio no navegador. */
declare global {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- global augmentation requires `interface`
	interface Window {
		__ORCH_API__?: {
			baseUrl: string;
			token: string;
			selectPath: () => Promise<string | null>;
			/** Ausente no navegador (`vite dev` fora do Electron) — só o app empacotado/dev do Electron injeta isso. */
			connectOAuth?: (input: OAuthConnectInput) => Promise<OAuthConnectResult>;
			/** Cacheia/limpa o token de sessão em disco pro MCP server externo usar sozinho (ver session-token-cache). */
			cacheSessionToken?: (token: string, expiresAt: string) => Promise<void>;
			clearSessionToken?: () => Promise<void>;
			updates?: {
				check: () => Promise<void>;
				install: () => Promise<void>;
				onStatus: (callback: (payload: ElectronUpdateStatusPayload) => void) => () => void;
			};
		};
	}
}

export type ElectronUpdateStatusPayload = {
	status: "checking" | "available" | "not_available" | "download_progress" | "downloaded" | "error";
	version?: string;
	percent?: number;
	message?: string;
};

/** Só o necessário pro middleware materializar/descrever o script — não o `Script` completo. */
export type ScriptPayload = {
	id: string;
	name: string;
	description?: string;
	kind: ScriptKind;
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

export type AgentCallInput = {
	systemPrompt: string;
	prompt: string;
	model: string;
	providerKind: ProviderKind;
	baseUrl?: string;
	apiKeyRef?: string;
	/** Fase B: habilita tools reais (Bash/Read/Write/Edit) numa pasta de trabalho escopada. */
	canExecute?: boolean;
	/** Pasta de trabalho (cwd) da execução — só o runner do Electron usa; fallback = workspace fixo. */
	workingDir?: string;
	/** Scripts anexados ao agent — materializados em arquivo pelo middleware quando `canExecute`. */
	scripts?: ScriptPayload[];
	/** Teto de custo (USD) desta invocação (`--max-budget-usd` do Claude CLI). Ausente = default do runner. */
	maxBudgetUsd?: number;
};
export type AgentCallResult = { output: string; usedFallbackModel: boolean; diff?: string };

/**
 * Item de atividade emitido pelo runner (tool_use/tool_result) durante um run com execução.
 * `id`/`toolName`/`status` (só no stream-json da Claude CLI) permitem parear início e fim de uma
 * ferramenta e mostrar o status ao vivo; ausentes nos providers em modo texto (compat).
 */
export type AgentActivity = {
	kind: "tool" | "output";
	id?: string;
	toolName?: string;
	label: string;
	detail?: string;
	status?: "running" | "done" | "error";
	/** Só em resultado de tool `http` (provider API) — headers finais enviados no `fetch`, pra debug na
	 * aba Ferramentas. */
	sentHeaders?: Record<string, string>;
};

/**
 * Callbacks opcionais de streaming tipado — no modo execução separam pensamento/atividade/terminal do
 * texto final. Compatível com o modo texto: se o runner só emitir `chunk`, apenas `onChunk` dispara.
 */
export type AgentCallHandlers = {
	onChunk?: (text: string) => void;
	onThinking?: (text: string) => void;
	onActivity?: (activity: AgentActivity) => void;
	onTerminal?: (text: string) => void;
};

/** Falha classificada pelo middleware — o `code` deixa a UI reagir de forma específica (ex.: pedir login). */
export class AgentCallError extends Error {
	code: "unauthenticated" | "rate_limited" | "unsupported_provider" | "unknown";

	constructor(code: "unauthenticated" | "rate_limited" | "unsupported_provider" | "unknown", message: string) {
		super(message);
		this.code = code;
	}
}

/** Extrai `{ event, data }` de um bloco SSE único (sem a linha em branco final). */
const parseSseBlock = (block: string): { event: string; data: string } => {
	let event = "message";
	let data = "";
	for (const line of block.split("\n")) {
		if (line.startsWith("event:")) event = line.slice(6).trim();
		else if (line.startsWith("data:")) data += line.slice(5).trim();
	}
	return { event, data };
};

export const callAgentStep = async (
	input: AgentCallInput,
	signal: AbortSignal,
	onChunk?: (text: string) => void,
	handlers?: AgentCallHandlers,
): Promise<AgentCallResult> => {
	const orchApi = window.__ORCH_API__;
	// O runner (processo main do Electron, fora do navegador) não tem acesso a `localStorage` — o
	// token de sessão do backend e a base URL viajam no corpo de cada chamada pra ele resolver
	// `apiKeyRef`/`authRef` contra `GET /secrets/{id}/value` (ver plano §8.4).
	const backendToken = await tokenStorage.get();
	// Sem Electron (navegador puro), quem atende `/run-step` é o backend Kotlin (`POST /run-step`,
	// `RunStepController` em apps/api) — ele resolve os secrets no próprio processo, sem o
	// round-trip que o runner do Electron precisa dar de volta pro backend. Só squads 100% API
	// chegam aqui (ver `isApiOnlySquad`/`requireRunner`); providers de CLI já são barrados antes.
	const url = orchApi?.baseUrl ? `${orchApi.baseUrl}/api/run-step` : `${apiUrl}/run-step`;
	const headers: Record<string, string> = orchApi?.baseUrl
		? { "Content-Type": "application/json", ...(orchApi.token ? { "X-Orchestrator-Token": orchApi.token } : {}) }
		: { "Content-Type": "application/json", ...(backendToken ? { Authorization: `Bearer ${backendToken}` } : {}) };
	const res = await fetch(url, {
		method: "POST",
		headers,
		body: JSON.stringify({ ...input, backendBaseUrl: apiUrl, backendToken }),
		signal,
	});

	const isStream = (res.headers.get("content-type") ?? "").includes("text/event-stream");
	if (!isStream) {
		// Early-exit do servidor (método errado, corpo inválido, provider não suportado) — JSON simples.
		const body = await res.json().catch(() => ({ code: "unknown" as const, message: undefined }));
		const fallback = `Falha ao chamar o provider de modelo (HTTP ${res.status}).`;
		throw new AgentCallError(body.code ?? "unknown", body.message ?? fallback);
	}

	if (!res.body) {
		throw new AgentCallError("unknown", "Resposta sem corpo do servidor.");
	}

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		const blocks = buffer.split("\n\n");
		buffer = blocks.pop() ?? "";

		for (const block of blocks) {
			if (!block.trim()) continue;
			const { event, data } = parseSseBlock(block);
			if (!data) continue;
			const parsed = JSON.parse(data);

			if (event === "chunk") {
				onChunk?.(typeof parsed.text === "string" ? parsed.text : "");
			} else if (event === "thinking") {
				handlers?.onThinking?.(typeof parsed.text === "string" ? parsed.text : "");
			} else if (event === "tool_use") {
				handlers?.onActivity?.({
					kind: "tool",
					id: typeof parsed.id === "string" ? parsed.id : undefined,
					toolName: typeof parsed.name === "string" ? parsed.name : undefined,
					label: parsed.name ?? parsed.label ?? "ferramenta",
					detail: parsed.detail,
					status: "running",
				});
			} else if (event === "tool_result") {
				handlers?.onActivity?.({
					kind: "output",
					id: typeof parsed.id === "string" ? parsed.id : undefined,
					label: parsed.label ?? "resultado",
					detail: parsed.detail,
					status: parsed.ok === false ? "error" : "done",
					sentHeaders:
						parsed.sentHeaders && typeof parsed.sentHeaders === "object" ? parsed.sentHeaders : undefined,
				});
				if (typeof parsed.detail === "string") handlers?.onTerminal?.(parsed.detail);
			} else if (event === "done") {
				return {
					output: parsed.output,
					usedFallbackModel: Boolean(parsed.usedFallbackModel),
					diff: typeof parsed.diff === "string" ? parsed.diff : undefined,
				};
			} else if (event === "error") {
				throw new AgentCallError(parsed.code ?? "unknown", parsed.message ?? "Falha ao chamar o provider de modelo.");
			}
		}
	}

	throw new AgentCallError("unknown", "A conexão encerrou antes do resultado final.");
};

/** Busca os modelos disponíveis num endpoint OpenAI-compat (`GET {baseUrl}/models`) — usado no cadastro do provider. */
export const fetchProviderModels = async (
	baseUrl: string,
	apiKeyRef?: string,
): Promise<{ value: string; label: string }[]> => {
	const orchApi = window.__ORCH_API__;
	const backendToken = await tokenStorage.get();
	const res = await fetch(`${orchApi?.baseUrl ?? ""}/api/list-models`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(orchApi?.token ? { "X-Orchestrator-Token": orchApi.token } : {}),
		},
		body: JSON.stringify({ baseUrl, apiKeyRef, backendBaseUrl: apiUrl, backendToken }),
	});

	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(body.message ?? `Falha ao buscar modelos (HTTP ${res.status}).`);
	}
	return body.models ?? [];
};

// --- Preview de arquivos gerados (HTML/imagens/md) — só no Electron (tem fs + servidor local) ---

export type PreviewFileEntry = { path: string; ext: string; isImage: boolean; size: number };

/** Preview só existe no app Electron (servidor local + fs). No browser dev não há `__ORCH_API__`. */
export const previewAvailable = (): boolean => Boolean(window.__ORCH_API__?.baseUrl);

/** Execucoes reais dependem do runner local do Electron; na web a area privada e configuracao/consulta. */
export const runnerAvailable = (): boolean => Boolean(window.__ORCH_API__?.baseUrl);

/**
 * `true` quando existe alguém pra atender a chamada de execução de um passo de agent: o servidor local
 * do processo main do Electron, o middleware do `vite dev`, OU (desde que o backend Kotlin ganhou
 * `POST /run-step`, `RunStepController` em apps/api) o próprio backend — que serve essa rota em
 * qualquer ambiente, dev ou publicado. Na prática isso já não depende mais do transporte: sempre há
 * alguém pra atender.
 *
 * Só isso não basta pra liberar um run: o squad também precisa ser API-only (`isApiOnlySquad`), já
 * que provider de CLI (claude-cli/codex-cli/gpt-cli) depende de binário local — o backend rejeita
 * esses kinds explicitamente (`RunStepService`). Ver `requireRunner` em `orchestrator-runtime.ts`.
 */
export const runStepEndpointAvailable = (): boolean => true;

const orchHeaders = (): HeadersInit => {
	const token = window.__ORCH_API__?.token;
	return { "Content-Type": "application/json", ...(token ? { "X-Orchestrator-Token": token } : {}) };
};

/**
 * Registra a pasta no servidor de preview e devolve o `rootId` p/ montar URLs. `null` fora do Electron.
 * Aceita uma string (`dir` — vazia = workspace fixo) ou `{ runId }` para apontar no snapshot do histórico
 * (`.runs/<runId>`), sem o front precisar conhecer o caminho absoluto do workspace.
 */
export const registerPreviewRoot = async (target: string | { runId: string } = ""): Promise<string | null> => {
	const orchApi = window.__ORCH_API__;
	if (!orchApi?.baseUrl) return null;
	const payload = typeof target === "string" ? { dir: target } : { runId: target.runId };
	const res = await fetch(`${orchApi.baseUrl}/api/register-preview`, {
		method: "POST",
		headers: orchHeaders(),
		body: JSON.stringify(payload),
	});
	if (!res.ok) return null;
	const body = await res.json().catch(() => ({}));
	return typeof body.rootId === "string" ? body.rootId : null;
};

/**
 * Ao final de um run, pede ao runner pra copiar os arquivos gerados/alterados pra `.runs/<runId>` e
 * devolve o manifesto persistível no `RunRecord`. Best-effort: fora do Electron ou em falha, devolve
 * lista vazia e nunca lança — a persistência do run segue sem os arquivos.
 */
export const snapshotRun = async (runId: string, dir = ""): Promise<PreviewFileEntry[]> => {
	const orchApi = typeof window === "undefined" ? undefined : window.__ORCH_API__;
	if (!orchApi?.baseUrl) return [];
	try {
		const res = await fetch(`${orchApi.baseUrl}/api/snapshot-run`, {
			method: "POST",
			headers: orchHeaders(),
			body: JSON.stringify({ runId, dir }),
		});
		if (!res.ok) return [];
		const body = await res.json().catch(() => ({ files: [] }));
		return Array.isArray(body.files) ? body.files : [];
	} catch {
		return [];
	}
};

/**
 * Limpa o workspace fixo do runner antes de um run novo (arquivos de runs anteriores não vazam no
 * preview). Best-effort e resiliente: fora do Electron (sem `__ORCH_API__`) ou em falha, não faz nada
 * e nunca lança — o run segue normalmente.
 */
export const resetWorkspace = async (dir = ""): Promise<void> => {
	const orchApi = typeof window === "undefined" ? undefined : window.__ORCH_API__;
	if (!orchApi?.baseUrl) return;
	try {
		await fetch(`${orchApi.baseUrl}/api/reset-workspace`, {
			method: "POST",
			headers: orchHeaders(),
			body: JSON.stringify({ dir }),
		});
	} catch {
		// Reset é best-effort — nunca bloqueia o início do run.
	}
};

/** Lista arquivos da pasta (todos, ou só os alterados via git quando `changedOnly`). */
export const listWorkspaceFiles = async (dir = "", changedOnly = false): Promise<PreviewFileEntry[]> => {
	const orchApi = window.__ORCH_API__;
	if (!orchApi?.baseUrl) return [];
	const res = await fetch(`${orchApi.baseUrl}/api/list-files`, {
		method: "POST",
		headers: orchHeaders(),
		body: JSON.stringify({ dir, changedOnly }),
	});
	if (!res.ok) return [];
	const body = await res.json().catch(() => ({ files: [] }));
	return Array.isArray(body.files) ? body.files : [];
};

/** URL de um arquivo servido pelo preview — token vai na query (iframe/img não mandam header). */
export const buildPreviewUrl = (rootId: string, relPath: string): string => {
	const orchApi = window.__ORCH_API__;
	const query = orchApi?.token ? `?t=${encodeURIComponent(orchApi.token)}` : "";
	const encoded = relPath
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
	return `${orchApi?.baseUrl ?? ""}/preview/${rootId}/${encoded}${query}`;
};

export type OAuthConnectInput = {
	authUrl: string;
	tokenUrl: string;
	clientId: string;
	clientSecret?: string;
	scopes?: string;
};
export type OAuthConnectResult = { accessToken: string; refreshToken?: string; expiresIn?: number };

/**
 * Fluxo `authorization_code` + PKCE completo (abre a janela de autorização, captura o callback via
 * loopback, troca por tokens) — implementado no processo main do Electron (`oauth-flow.ts`), porque
 * abrir uma janela nativa e subir um servidor local não é algo que o navegador consiga fazer. Só
 * funciona dentro do app Electron (dev ou empacotado).
 */
export const connectOAuth = async (input: OAuthConnectInput): Promise<OAuthConnectResult> => {
	const connect = window.__ORCH_API__?.connectOAuth;
	if (!connect) throw new Error("Conectar via OAuth só funciona dentro do app Workestrator (Electron).");
	return connect(input);
};

/** Resultado de `/api/test-secret` — só faz verificação de rede de verdade pros esquemas OAuth2. */
export type TestSecretResult = { ok: boolean; message: string };

/** Testa se um secret resolve/autentica de verdade — usado pelo botão "Testar conexão" do catálogo. */
export const testSecretConnection = async (secretId: string): Promise<TestSecretResult> => {
	const orchApi = window.__ORCH_API__;
	const backendToken = await tokenStorage.get();
	const res = await fetch(`${orchApi?.baseUrl ?? ""}/api/test-secret`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(orchApi?.token ? { "X-Orchestrator-Token": orchApi.token } : {}),
		},
		body: JSON.stringify({ secretId, backendBaseUrl: apiUrl, backendToken }),
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		return { ok: false, message: body.message ?? `Falha ao testar a conexão (HTTP ${res.status}).` };
	}
	return { ok: Boolean(body.ok), message: body.message ?? "" };
};
