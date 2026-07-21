/**
 * Tool calling para providers OpenAI-compat (Ollama, vLLM, LM Studio, groq, OpenAI...).
 *
 * Até aqui `callOpenAiCompat` mandava só `messages` — nenhuma tool chegava no modelo, mesmo com
 * scripts anexados ao agent. Como `buildAgentPrompt` (orchestrator-runtime.ts) anuncia as
 * integrações pelo nome no prompt, o agent era instruído a usar uma ferramenta que não existia no
 * payload: não conseguia buscar, não podia inventar dado, e gastava o turno deliberando sobre a
 * própria capacidade. O passo não produzia artefato aproveitável e o coordenador redispachava —
 * o "loop infinito" relatado. Este módulo entrega as tools de verdade.
 *
 * Escopo deliberado: só ferramentas de rede (`http`, `mcp`, `connector`). Os kinds `command`,
 * `inline` e `file` executam processo na máquina do usuário e ficam de fora — no caminho da Claude
 * CLI quem dá essa permissão é o próprio CLI (com as guardas dele); aqui não há equivalente, então
 * não expomos shell arbitrário a um modelo local.
 *
 * Sem dependência de `runner.ts`: recebe configs já resolvidas (auth aplicada) por parâmetro, pra
 * não criar ciclo de import entre os dois módulos.
 */

/** `parameters` de uma function tool no formato OpenAI (JSON Schema). */
export type OpenAiToolDefinition = {
	type: "function";
	function: { name: string; description?: string; parameters: Record<string, unknown> };
};

/** Texto já pronto pra virar a mensagem `{ role: "tool" }` da rodada seguinte. */
export type ToolCallResult = {
	ok: boolean;
	text: string;
	/** Só em tools `http` — headers finais do `fetch` (auth já resolvida), pra debug na aba Ferramentas.
	 * Nunca entra em `text`/`messages`: não é visto pelo modelo. */
	sentHeaders?: Record<string, string>;
};

export type ResolvedTool = {
	definition: OpenAiToolDefinition;
	execute: (args: Record<string, unknown>) => Promise<ToolCallResult>;
};

/**
 * Teto de caracteres por resultado de tool. Modelos locais pequenos (ex.: qwen 9b) têm janela
 * curta, e uma resposta crua de API de busca passa fácil de 100k chars — sem corte, a segunda
 * rodada estoura o contexto e o modelo volta a divagar. `responseMap` no script é a forma correta
 * de estreitar; isto é a rede de segurança pra quando ele não está configurado.
 */
const MAX_TOOL_RESULT_CHARS = 8_000;

export const truncateToolResult = (text: string): string =>
	text.length <= MAX_TOOL_RESULT_CHARS
		? text
		: `${text.slice(0, MAX_TOOL_RESULT_CHARS)}\n\n[...truncado: ${text.length - MAX_TOOL_RESULT_CHARS} caracteres omitidos. Use responseMap no script para receber só o campo relevante.]`;

/**
 * Nome de function aceito pela API (`^[a-zA-Z0-9_-]{1,64}$`). Sufixa com `_2`, `_3`... quando dois
 * scripts colidem depois da sanitização — nomes duplicados fazem o dispatch pegar a tool errada.
 */
export const safeToolName = (raw: string, taken: Set<string>): string => {
	const base = (raw.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "tool").slice(0, 64);
	if (!taken.has(base)) {
		taken.add(base);
		return base;
	}
	for (let i = 2; ; i++) {
		const candidate = `${base.slice(0, 64 - String(i).length - 1)}_${i}`;
		if (!taken.has(candidate)) {
			taken.add(candidate);
			return candidate;
		}
	}
};

// --- Recuperação de tool call escrita como texto (modelos sem tool parser nativo) ---

/** Uma tool call recuperada do texto — mesma forma dos campos que o dispatch já consome. */
export type TextToolCall = { name: string; arguments: string };

/**
 * Lê o objeto `{...}` balanceado a partir de `start` (índice de um `{`), respeitando strings e
 * escapes. `undefined` se o objeto não fechar dentro do texto.
 */
const readBalancedObject = (text: string, start: number): string | undefined => {
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (ch === "\\") escaped = true;
			else if (ch === '"') inString = false;
			continue;
		}
		if (ch === '"') inString = true;
		else if (ch === "{") depth++;
		else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
	}
	return undefined;
};

/**
 * Recupera tool calls que o modelo escreveu como TEXTO no `content` em vez de usar o campo
 * estruturado `tool_calls` da API. Acontece quando o servidor não tem parser de tool nativo pro
 * template do modelo — Gemma no vLLM é o caso clássico (sem `--tool-call-parser` compatível a
 * chamada sai crua no conteúdo, ex.: `call:gerar-autentica-o{}`). Sem recuperar, essa "chamada"
 * vaza como a resposta final do agente, a tool nunca roda e o coordenador redispacha em loop.
 *
 * Cobre os dialetos comuns e SEMPRE ancora nos nomes de tools registradas (`known`): um token que
 * não é tool de verdade é ignorado, então prosa que cite "call:"/"function" ou um JSON solto no
 * texto não vira chamada por engano.
 */
export const parseTextToolCalls = (text: string, known: ReadonlySet<string>): TextToolCall[] => {
	if (!text || known.size === 0) return [];
	const calls: TextToolCall[] = [];
	const add = (name: string, rawArgs: unknown): void => {
		if (!known.has(name)) return;
		const args = rawArgs == null ? "{}" : typeof rawArgs === "string" ? rawArgs.trim() || "{}" : JSON.stringify(rawArgs);
		calls.push({ name, arguments: args });
	};

	// 1) Hermes / Qwen: <tool_call>{"name":"x","arguments":{...}}</tool_call> (pode repetir).
	for (const match of text.matchAll(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi)) {
		try {
			const obj = JSON.parse(match[1]) as { name?: unknown; arguments?: unknown; parameters?: unknown };
			if (typeof obj.name === "string") add(obj.name, obj.arguments ?? obj.parameters);
		} catch {
			// bloco não fechou como JSON — ignora.
		}
	}
	if (calls.length > 0) return calls;

	// 2) Mistral: [TOOL_CALLS][{"name":"x","arguments":{...}}, ...]
	const mistral = text.match(/\[TOOL_CALLS\]\s*(\[[\s\S]*\])/);
	if (mistral) {
		try {
			const arr = JSON.parse(mistral[1]) as Array<{ name?: unknown; arguments?: unknown }>;
			for (const obj of arr) if (obj && typeof obj.name === "string") add(obj.name, obj.arguments);
		} catch {
			// ignora
		}
	}
	if (calls.length > 0) return calls;

	// 3) Dialeto observado no Gemma: `call:<nome>{args}` — também `call: nome (args)`, `tool_call`,
	//    `function`. Os args (quando há) são o `{...}` balanceado que vem logo após o nome.
	const prefix = /\b(?:call|tool_call|function|tool)\b\s*[:=]?\s*["'`]?([a-zA-Z0-9_.-]+)["'`]?/gi;
	for (let m = prefix.exec(text); m !== null; m = prefix.exec(text)) {
		const name = m[1];
		if (!known.has(name)) continue;
		const after = m.index + m[0].length;
		const brace = text.indexOf("{", after);
		// só cola os args se o `{` vier imediatamente depois do nome (só espaço/parêntese no meio).
		const gap = brace >= 0 ? text.slice(after, brace) : "";
		add(name, brace >= 0 && /^[\s(]*$/.test(gap) ? readBalancedObject(text, brace) : undefined);
	}
	if (calls.length > 0) return calls;

	// 4) JSON solto (às vezes em bloco ```json): { "name"|"tool": "<tool>", "arguments"|"parameters": {...} }.
	for (let i = text.indexOf("{"); i >= 0; i = text.indexOf("{", i + 1)) {
		const block = readBalancedObject(text, i);
		if (!block) break;
		try {
			const obj = JSON.parse(block) as { name?: unknown; tool?: unknown; arguments?: unknown; parameters?: unknown };
			const name = typeof obj.name === "string" ? obj.name : typeof obj.tool === "string" ? obj.tool : undefined;
			if (name) add(name, obj.arguments ?? obj.parameters);
		} catch {
			// não é JSON válido — segue procurando.
		}
	}
	return calls;
};

// --- Tools HTTP (kind: "http") ---

/** Mesma forma consumida por `mcp-servers/http-tool.mjs` — a auth já vem aplicada em headers/url. */
export type HttpToolDef = {
	name: string;
	description?: string;
	method: string;
	urlTemplate: string;
	headers?: Record<string, string>;
	bodySchema?: string;
	responseMap?: string;
};

/**
 * Substitui `{{variavel}}` num template pelos valores informados na chamada da tool. Em URL os
 * valores vão url-encoded (uma query com espaço/`&` quebraria a URL); em header vão crus — um
 * `Bearer <token>` url-encoded viraria um token inválido.
 */
const substituteTemplate = (template: string, variables: Record<string, unknown> | undefined, encode: boolean): string =>
	template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => {
		const value = variables?.[key];
		if (value == null) return "";
		return encode ? encodeURIComponent(String(value)) : String(value);
	});

export const applyUrlTemplate = (template: string, variables: Record<string, unknown> | undefined): string =>
	substituteTemplate(template, variables, true);

/** Aplica os `{{placeholders}}` nos valores de header (sem url-encode). */
export const applyHeaderTemplate = (
	headers: Record<string, string> | undefined,
	variables: Record<string, unknown> | undefined,
): Record<string, string> =>
	Object.fromEntries(Object.entries(headers ?? {}).map(([key, value]) => [key, substituteTemplate(value, variables, false)]));

/**
 * Extrai um caminho tipo "data.items" de um objeto — melhor esforço, sem dependência externa.
 * Aceita também a notação JSONPath-lite comum em quem configura `responseMap`: prefixo `$` de raiz
 * e índices de array `[0]` (`$[0].authHeader`, `data.items[2].id`). Sem isso um `responseMap` com
 * `$`/`[n]` resolvia pra `undefined` silenciosamente e a tool devolvia a resposta inteira (ou erro).
 */
export const extractPath = (value: unknown, dotPath: string | undefined): unknown => {
	if (!dotPath?.trim()) return value;
	const keys = dotPath
		.trim()
		.replace(/^\$/, "") // raiz JSONPath
		.replace(/\[(\w+)\]/g, ".$1") // a[0] -> a.0
		.split(".")
		.filter(Boolean);
	return keys.reduce<unknown>(
		(acc, key) => (acc != null && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
		value,
	);
};

/** Placeholders `{{x}}` declarados no template — viram propriedades explícitas do schema. */
export const extractPlaceholders = (template: string): string[] => [
	...new Set([...template.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((m) => m[1])),
];

/**
 * Converte um script `kind: "http"` numa function tool. Os placeholders da URL viram propriedades
 * nomeadas e obrigatórias dentro de `variables` — um schema genérico (`additionalProperties`) faz
 * modelo pequeno chamar a tool com o objeto vazio e receber uma URL sem o termo de busca.
 */
export const buildHttpTool = (def: HttpToolDef, name: string): ResolvedTool => {
	const placeholders = [
		...new Set([
			...extractPlaceholders(def.urlTemplate),
			...Object.values(def.headers ?? {}).flatMap(extractPlaceholders),
		]),
	];
	const acceptsBody = def.method !== "GET" && def.method !== "DELETE";

	const properties: Record<string, unknown> = {};
	const required: string[] = [];
	if (placeholders.length > 0) {
		properties.variables = {
			type: "object",
			description: `Valores para os placeholders da URL: ${placeholders.join(", ")}.`,
			properties: Object.fromEntries(placeholders.map((p) => [p, { type: "string", description: `Valor de {{${p}}}.` }])),
			required: placeholders,
		};
		required.push("variables");
	}
	if (acceptsBody) {
		properties.body = { type: "object", description: def.bodySchema || "Corpo JSON da requisição." };
	}

	const description = [
		def.description || `Requisição ${def.method} para ${def.urlTemplate.replace(/\?.*$/, "")}.`,
		placeholders.length > 0 ? `Preencha: ${placeholders.map((p) => `variables.${p}`).join(", ")}.` : "",
	]
		.filter(Boolean)
		.join(" ");

	return {
		definition: {
			type: "function",
			function: { name, description, parameters: { type: "object", properties, required } },
		},
		execute: async (args) => {
			const variables = (args.variables ?? {}) as Record<string, unknown>;
			const url = applyUrlTemplate(def.urlTemplate, variables);
			const sentHeaders = { "Content-Type": "application/json", ...applyHeaderTemplate(def.headers, variables) };
			try {
				const res = await fetch(url, {
					method: def.method || "GET",
					headers: sentHeaders,
					body: acceptsBody && args.body !== undefined ? JSON.stringify(args.body) : undefined,
				});
				const raw = await res.text();
				let parsed: unknown;
				try {
					parsed = JSON.parse(raw);
				} catch {
					parsed = raw;
				}
				if (!res.ok) {
					const detail = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
					return { ok: false, text: truncateToolResult(`HTTP ${res.status}: ${detail}`), sentHeaders };
				}
				const mapped = extractPath(parsed, def.responseMap);
				// `mapped` pode ser `undefined` (responseMap aponta pra um campo ausente) — aí
				// `JSON.stringify` devolve o valor `undefined` e `truncateToolResult` estouraria em
				// `.length`. Devolve um aviso acionável em vez de quebrar a tool.
				const text =
					mapped == null
						? `(a resposta não tem o campo "${def.responseMap}"; ajuste o responseMap do script)`
						: typeof mapped === "string"
							? mapped
							: JSON.stringify(mapped, null, 2);
				return { ok: mapped != null, text: truncateToolResult(text), sentHeaders };
			} catch (error) {
				return {
					ok: false,
					text: `Falha ao chamar ${url}: ${error instanceof Error ? error.message : String(error)}`,
					sentHeaders,
				};
			}
		},
	};
};

// --- Tools MCP (kind: "mcp" / "connector") ---

/** Mesmo shape devolvido por `buildMcpServerEntry` em runner.ts — stdio local ou HTTP remoto. */
export type McpClientConfig =
	| { command: string; args?: string[]; env?: Record<string, string> }
	| { type: "http"; url: string; headers?: Record<string, string> };

export type McpConnection = { tools: ResolvedTool[]; close: () => Promise<void> };

/**
 * Sobe um cliente MCP contra o server configurado, lista as tools e as expõe como function tools.
 * O `inputSchema` do próprio server vira o `parameters` da function — é JSON Schema dos dois lados.
 *
 * A SDK entra por import dinâmico de propósito: mantém o caminho comum (só scripts `http`) sem
 * carregar o pacote, e nenhum agent sem MCP paga o custo.
 */
const createMcpTransport = async (config: McpClientConfig) => {
	if ("type" in config) {
		const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
		return new StreamableHTTPClientTransport(new URL(config.url), {
			requestInit: config.headers ? { headers: config.headers } : undefined,
		});
	}
	const { StdioClientTransport, getDefaultEnvironment } = await import("@modelcontextprotocol/sdk/client/stdio.js");
	return new StdioClientTransport({
		command: config.command,
		args: config.args,
		// O transport não herda o ambiente do processo por padrão; sem o merge, um server que
		// depende de PATH/HOME (praticamente todo `npx ...`) não sobe.
		env: { ...getDefaultEnvironment(), ...(config.env ?? {}) },
	});
};

export const connectMcpTools = async (
	serverName: string,
	config: McpClientConfig,
	allowlist: string[] | undefined,
	taken: Set<string>,
): Promise<McpConnection> => {
	const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
	const transport = await createMcpTransport(config);
	const client = new Client({ name: "workestrator-runner", version: "1.0.0" });
	await client.connect(transport);
	const close = async () => {
		try {
			await client.close();
		} catch {
			// Server já caiu / transport encerrado — fechar é best-effort, nunca derruba o passo.
		}
	};

	try {
		const listed = await client.listTools();
		const allowed = allowlist && allowlist.length > 0 ? new Set(allowlist) : undefined;
		const tools = listed.tools
			.filter((tool) => !allowed || allowed.has(tool.name))
			.map((tool) => {
				const name = safeToolName(`${serverName}__${tool.name}`, taken);
				const schema = (tool.inputSchema ?? { type: "object", properties: {} }) as Record<string, unknown>;
				return {
					definition: {
						type: "function" as const,
						function: { name, description: tool.description ?? `Tool ${tool.name} do servidor ${serverName}.`, parameters: schema },
					},
					execute: async (args: Record<string, unknown>): Promise<ToolCallResult> => {
						try {
							const result = await client.callTool({ name: tool.name, arguments: args });
							const blocks = Array.isArray(result.content) ? result.content : [];
							const text = blocks
								.map((block) => {
									const part = block as { type?: string; text?: string };
									return part.type === "text" && typeof part.text === "string" ? part.text : JSON.stringify(block);
								})
								.join("\n");
							return { ok: result.isError !== true, text: truncateToolResult(text || "(sem conteúdo)") };
						} catch (error) {
							return { ok: false, text: `Falha ao executar ${tool.name}: ${error instanceof Error ? error.message : String(error)}` };
						}
					},
				};
			});
		return { tools, close };
	} catch (error) {
		await close();
		throw error;
	}
};
