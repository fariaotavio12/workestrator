import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { connectMcpTools, type ResolvedTool } from "./openai-tools";
import {
	buildMcpConfig,
	buildMcpServerEntry,
	buildExecutorPlan,
	callOpenAiCompat,
	classifyCliFailure,
	configureRunnerInstagramProfilesRoot,
	configureRunnerWorkspace,
	walkAllRelPaths,
	workspaceForExecution,
	type ResolvedSecret,
	type ScriptPayload,
	type SecretResolver,
} from "./runner";
import { startLocalRunnerServer } from "./server";

const CURRENT_TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

const baseScript = (overrides: Partial<ScriptPayload>): ScriptPayload => ({
	id: "s1",
	name: "Test Script",
	kind: "command",
	...overrides,
});

const resolveSecret: SecretResolver = async (id: string): Promise<ResolvedSecret | undefined> =>
	id === "known-secret" ? { value: "resolved-value", authType: "bearer" } : undefined;

describe("buildExecutorPlan", () => {
	it("runs Codex with the account default model when cli-default is selected", () => {
		const plan = buildExecutorPlan("codex-cli", "cli-default", "system", "prompt", false);
		expect(plan.command).toBe("codex");
		expect(plan.args).not.toContain("-m");
		expect(plan.args).toContain("-");
		expect(plan.stdinInput).toBe("system\n\n---\n\nprompt");
	});

	it("passes an explicit Codex model when the provider model is not cli-default", () => {
		const plan = buildExecutorPlan("codex-cli", "gpt-5-codex", "", "prompt", false);
		expect(plan.args).toEqual(expect.arrayContaining(["-m", "gpt-5-codex"]));
		expect(plan.stdinInput).toBe("prompt");
	});

	it("uses Codex bypass mode only when execution is enabled", () => {
		expect(buildExecutorPlan("codex-cli", "cli-default", "", "prompt", false).args).toEqual(
			expect.arrayContaining(["--sandbox", "read-only"]),
		);
		expect(buildExecutorPlan("codex-cli", "cli-default", "", "prompt", true).args).toContain(
			"--dangerously-bypass-approvals-and-sandbox",
		);
	});
});

describe("isolated execution workspaces", () => {
	it("resetting one execution never removes files from another execution", async () => {
		const root = mkdtempSync(path.join(os.tmpdir(), "workestrator-runs-"));
		configureRunnerWorkspace(root);
		const runA = workspaceForExecution("run-a");
		const runB = workspaceForExecution("run-b");
		mkdirSync(runA, { recursive: true });
		mkdirSync(runB, { recursive: true });
		writeFileSync(path.join(runA, "result.md"), "A");
		writeFileSync(path.join(runB, "result.md"), "B");
		const server = await startLocalRunnerServer();
		try {
			const response = await fetch(`${server.baseUrl}/api/reset-workspace`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-Orchestrator-Token": server.token },
				body: JSON.stringify({ executionId: "run-a" }),
			});
			expect(response.ok).toBe(true);
			expect(existsSync(path.join(runA, "result.md"))).toBe(false);
			expect(readFileSync(path.join(runB, "result.md"), "utf8")).toBe("B");
		} finally {
			server.close();
			rmSync(root, { recursive: true, force: true });
			configureRunnerWorkspace(path.resolve(process.cwd(), "orchestrator-workspace"));
		}
	});
});

describe("buildMcpServerEntry", () => {
	it("resolves an mcp stdio script into a command/args/env entry", async () => {
		const entry = await buildMcpServerEntry(
			baseScript({ kind: "mcp", transport: "stdio", command: "npx", args: ["-y", "some-server"] }),
			resolveSecret,
		);
		expect(entry).toEqual({ command: "npx", args: ["-y", "some-server"], env: undefined });
	});

	it("returns undefined for an mcp stdio script missing command", async () => {
		expect(await buildMcpServerEntry(baseScript({ kind: "mcp", transport: "stdio" }), resolveSecret)).toBeUndefined();
	});

	it("injects the resolved authRef as WORKESTRATOR_AUTH_TOKEN for stdio mcp scripts", async () => {
		const entry = await buildMcpServerEntry(
			baseScript({ kind: "mcp", transport: "stdio", command: "npx", authRef: "known-secret" }),
			resolveSecret,
		);
		expect(entry).toMatchObject({ env: { WORKESTRATOR_AUTH_TOKEN: "resolved-value" } });
	});

	it("resolves an mcp http script into a type:http entry", async () => {
		const entry = await buildMcpServerEntry(
			baseScript({ kind: "mcp", transport: "http", url: "https://mcp.example.com" }),
			resolveSecret,
		);
		expect(entry).toEqual({ type: "http", url: "https://mcp.example.com", headers: undefined });
	});

	it("substitutes $id placeholders in headers with the resolved secret's value", async () => {
		const entry = await buildMcpServerEntry(
			baseScript({
				kind: "mcp",
				transport: "http",
				url: "https://mcp.example.com",
				headers: { Authorization: "Bearer $known-secret" },
			}),
			resolveSecret,
		);
		expect(entry).toMatchObject({ headers: { Authorization: "Bearer resolved-value" } });
	});

	it("leaves an unresolvable $id placeholder untouched", async () => {
		const entry = await buildMcpServerEntry(
			baseScript({
				kind: "mcp",
				transport: "http",
				url: "https://mcp.example.com",
				headers: { "X-Custom": "$missing-secret" },
			}),
			resolveSecret,
		);
		expect(entry).toMatchObject({ headers: { "X-Custom": "$missing-secret" } });
	});

	it("resolves an http-kind script into a spawned http-tool server entry", async () => {
		const entry = await buildMcpServerEntry(
			baseScript({ kind: "http", method: "GET", urlTemplate: "https://api.example.com" }),
			resolveSecret,
		);
		expect(entry).toMatchObject({
			args: [expect.stringContaining("http-tool.mjs")],
			env: { ELECTRON_RUN_AS_NODE: "1" },
		});
	});

	it("returns undefined for an http-kind script missing urlTemplate", async () => {
		expect(await buildMcpServerEntry(baseScript({ kind: "http" }), resolveSecret)).toBeUndefined();
	});

	it("resolves a youtube connector into the local youtube.mjs server without requiring config", async () => {
		const entry = await buildMcpServerEntry(
			baseScript({ kind: "connector", connectorProvider: "youtube" }),
			resolveSecret,
		);
		expect(entry).toMatchObject({ args: [expect.stringContaining("youtube.mjs")], env: { ELECTRON_RUN_AS_NODE: "1" } });
	});

	it("resolves an instagram connector into the local instagram publisher server", async () => {
		const entry = await buildMcpServerEntry(
			baseScript({
				kind: "connector",
				connectorProvider: "instagram",
				env: { INSTAGRAM_ACCESS_TOKEN: "$known-secret", INSTAGRAM_USER_ID: "1789", IMGBB_API_KEY: "imgbb" },
			}),
			resolveSecret,
		);
		expect(entry).toMatchObject({
			args: [expect.stringContaining("instagram-publisher.mjs")],
			env: {
				ELECTRON_RUN_AS_NODE: "1",
				INSTAGRAM_ACCESS_TOKEN: "resolved-value",
				INSTAGRAM_USER_ID: "1789",
				IMGBB_API_KEY: "imgbb",
			},
		});
	});

	it("injects the account selected by authRef without exposing identity placeholders in the script", async () => {
		const instagramSecret: SecretResolver = async () => ({
			value: "account-access-token",
			authType: "bearer",
			accountExternalId: "178900000000001",
			accountDisplayName: "@empresa_a",
			status: "connected",
		});
		const entry = await buildMcpServerEntry(
			baseScript({ kind: "connector", connectorProvider: "instagram", authRef: "instagram-account-a" }),
			instagramSecret,
			"D:\\runs\\execution-a",
		);
		expect(entry).toMatchObject({
			env: {
				INSTAGRAM_ACCESS_TOKEN: "account-access-token",
				INSTAGRAM_USER_ID: "178900000000001",
				WORKESTRATOR_WORKSPACE_DIR: "D:\\runs\\execution-a",
			},
		});
	});

	it("injects only the selected local browser profile for a browser-session Instagram account", async () => {
		const profileId = "41cd95ba-d86a-463a-a282-ee954b75eeca";
		configureRunnerInstagramProfilesRoot("D:\\instagram-profiles");
		const instagramSecret: SecretResolver = async () => ({
			value: JSON.stringify({ mode: "browser_session", profileId }),
			authType: "raw",
			accountExternalId: "178900000000001",
			accountDisplayName: "@empresa_a",
			status: "connected",
		});
		const entry = await buildMcpServerEntry(
			baseScript({ kind: "connector", connectorProvider: "instagram", authRef: "instagram-account-a" }),
			instagramSecret,
			"D:\\runs\\execution-a",
		);
		expect(entry?.env).toMatchObject({
			INSTAGRAM_PROFILE_DIR: path.join("D:\\instagram-profiles", profileId, "profile"),
			INSTAGRAM_PROFILE_ID: profileId,
			INSTAGRAM_USER_ID: "178900000000001",
			WORKESTRATOR_WORKSPACE_DIR: "D:\\runs\\execution-a",
		});
		expect(entry?.env).not.toHaveProperty("INSTAGRAM_ACCESS_TOKEN");
	});

	it("blocks an expired Instagram connection before starting the publisher", async () => {
		const expiredSecret: SecretResolver = async () => ({
			value: "expired-token",
			authType: "bearer",
			accountExternalId: "1789",
			status: "expired",
		});
		await expect(
			buildMcpServerEntry(
				baseScript({ kind: "connector", connectorProvider: "instagram", authRef: "expired-account" }),
				expiredSecret,
			),
		).rejects.toThrow("reconecte");
	});

	it("returns undefined for a composio connector without config.gatewayUrl", async () => {
		expect(
			await buildMcpServerEntry(baseScript({ kind: "connector", connectorProvider: "composio" }), resolveSecret),
		).toBeUndefined();
	});

	it("resolves a composio connector into a type:http entry when config.gatewayUrl is set", async () => {
		const entry = await buildMcpServerEntry(
			baseScript({
				kind: "connector",
				connectorProvider: "composio",
				config: JSON.stringify({ gatewayUrl: "https://mcp.composio.dev/abc" }),
				authRef: "known-secret",
			}),
			resolveSecret,
		);
		expect(entry).toEqual({
			type: "http",
			url: "https://mcp.composio.dev/abc",
			headers: { Authorization: "Bearer resolved-value" },
		});
	});

	it("ignores command/inline/file kinds — they never become mcp entries", async () => {
		expect(await buildMcpServerEntry(baseScript({ kind: "command", command: "npm" }), resolveSecret)).toBeUndefined();
		expect(
			await buildMcpServerEntry(baseScript({ kind: "inline", content: "echo hi" }), resolveSecret),
		).toBeUndefined();
		expect(await buildMcpServerEntry(baseScript({ kind: "file", path: "/tmp/x" }), resolveSecret)).toBeUndefined();
	});

	it("applies the query authType by appending the secret as a query param instead of a header", async () => {
		const queryResolveSecret: SecretResolver = async () => ({
			value: "abc123",
			authType: "query",
			metadata: { queryParam: "key" },
		});
		const entry = await buildMcpServerEntry(
			baseScript({
				kind: "mcp",
				transport: "http",
				url: "https://generativelanguage.googleapis.com/v1",
				authRef: "google-key",
			}),
			queryResolveSecret,
		);
		expect(entry).toEqual({
			type: "http",
			url: "https://generativelanguage.googleapis.com/v1?key=abc123",
			headers: undefined,
		});
	});

	it("applies the header authType with a custom header name and value prefix", async () => {
		const headerResolveSecret: SecretResolver = async () => ({
			value: "anthropic-key",
			authType: "header",
			metadata: { headerName: "x-api-key" },
		});
		const entry = await buildMcpServerEntry(
			baseScript({ kind: "http", urlTemplate: "https://api.anthropic.com/v1/messages", authRef: "anthropic-key" }),
			headerResolveSecret,
		);
		expect(entry).toMatchObject({
			env: { WORKESTRATOR_HTTP_TOOL_CONFIG: expect.stringContaining('"x-api-key":"anthropic-key"') },
		});
	});
});

describe("oauth2_refresh token exchange", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("persists a rotated refresh_token back via resolved.rotate() when the provider reissues one", async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response(
					JSON.stringify({ access_token: "new-access-token", expires_in: 3600, refresh_token: "rotated-refresh" }),
					{
						status: 200,
					},
				),
		);
		vi.stubGlobal("fetch", fetchMock);

		const rotate = vi.fn(async () => undefined);
		const oauthResolveSecret: SecretResolver = async () => ({
			id: "oauth-secret-1",
			value: JSON.stringify({ refreshToken: "old-refresh", clientSecret: "shh" }),
			authType: "oauth2_refresh",
			metadata: { tokenUrl: "https://provider.example.com/token", clientId: "client-1" },
			rotate,
		});

		const entry = await buildMcpServerEntry(
			baseScript({ kind: "http", urlTemplate: "https://api.example.com/v1", authRef: "oauth-secret-1" }),
			oauthResolveSecret,
		);

		expect(entry).toMatchObject({
			env: { WORKESTRATOR_HTTP_TOOL_CONFIG: expect.stringContaining("Bearer new-access-token") },
		});
		expect(rotate).toHaveBeenCalledWith(JSON.stringify({ refreshToken: "rotated-refresh", clientSecret: "shh" }));
	});

	it("does not call rotate() when the provider does not reissue a refresh_token", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ access_token: "new-access-token", expires_in: 3600 }), { status: 200 }),
			),
		);

		const rotate = vi.fn(async () => undefined);
		const oauthResolveSecret: SecretResolver = async () => ({
			id: "oauth-secret-2",
			value: JSON.stringify({ refreshToken: "old-refresh" }),
			authType: "oauth2_refresh",
			metadata: { tokenUrl: "https://provider.example.com/token" },
			rotate,
		});

		await buildMcpServerEntry(
			baseScript({ kind: "http", urlTemplate: "https://api.example.com/v1", authRef: "oauth-secret-2" }),
			oauthResolveSecret,
		);

		expect(rotate).not.toHaveBeenCalled();
	});

	it("uses the backend access-token endpoint instead of exchanging locally when it succeeds", async () => {
		const fetchMock = vi.fn(async () => {
			throw new Error("local exchange should not be attempted when the backend already resolved a token");
		});
		vi.stubGlobal("fetch", fetchMock);

		const fetchAccessToken = vi.fn(async () => ({
			accessToken: "backend-access-token",
			expiresAt: new Date(Date.now() + 3600_000).toISOString(),
		}));
		const oauthResolveSecret: SecretResolver = async () => ({
			id: "oauth-secret-3",
			value: JSON.stringify({ refreshToken: "old-refresh" }),
			authType: "oauth2_refresh",
			metadata: { tokenUrl: "https://provider.example.com/token" },
			fetchAccessToken,
		});

		const entry = await buildMcpServerEntry(
			baseScript({ kind: "http", urlTemplate: "https://api.example.com/v1", authRef: "oauth-secret-3" }),
			oauthResolveSecret,
		);

		expect(entry).toMatchObject({
			env: { WORKESTRATOR_HTTP_TOOL_CONFIG: expect.stringContaining("Bearer backend-access-token") },
		});
		expect(fetchAccessToken).toHaveBeenCalledTimes(1);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("falls back to the local exchange when the backend has no access-token endpoint yet (undefined)", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ access_token: "local-fallback-token", expires_in: 3600 }), { status: 200 }),
			),
		);

		const fetchAccessToken = vi.fn(async () => undefined);
		const oauthResolveSecret: SecretResolver = async () => ({
			id: "oauth-secret-4",
			value: JSON.stringify({ refreshToken: "old-refresh" }),
			authType: "oauth2_refresh",
			metadata: { tokenUrl: "https://provider.example.com/token" },
			fetchAccessToken,
		});

		const entry = await buildMcpServerEntry(
			baseScript({ kind: "http", urlTemplate: "https://api.example.com/v1", authRef: "oauth-secret-4" }),
			oauthResolveSecret,
		);

		expect(entry).toMatchObject({
			env: { WORKESTRATOR_HTTP_TOOL_CONFIG: expect.stringContaining("Bearer local-fallback-token") },
		});
		expect(fetchAccessToken).toHaveBeenCalledTimes(1);
	});
});

describe("buildMcpConfig", () => {
	it("returns undefined when no script resolves into an mcp entry", async () => {
		const scripts = [baseScript({ kind: "command", command: "npm" }), baseScript({ kind: "inline", content: "echo" })];
		expect(await buildMcpConfig(scripts, resolveSecret)).toBeUndefined();
	});

	it("aggregates every resolvable script under mcpServers, keyed by a safe name", async () => {
		const scripts = [
			baseScript({ id: "a", name: "GitHub MCP", kind: "mcp", transport: "stdio", command: "npx" }),
			baseScript({ id: "b", name: "Weather API", kind: "http", urlTemplate: "https://api.weather.example" }),
			baseScript({ id: "c", name: "Ignored", kind: "command", command: "npm" }),
		];
		const config = await buildMcpConfig(scripts, resolveSecret);
		expect(config).toBeDefined();
		expect(Object.keys(config?.mcpServers ?? {}).sort()).toEqual(["github-mcp", "weather-api"]);
	});
});

describe("classifyCliFailure", () => {
	it("flags authentication failures", () => {
		expect(classifyCliFailure("claude", "Error: not logged in").code).toBe("unauthenticated");
	});

	it("flags rate limiting", () => {
		expect(classifyCliFailure("claude", "you hit your limit").code).toBe("rate_limited");
	});

	it("gives an actionable message when the Playwright browser is missing", () => {
		const result = classifyCliFailure(
			"claude",
			"browserType.launch: Executable doesn't exist. Run npx playwright install",
		);
		expect(result.message).toContain("npx playwright install chromium");
	});

	it("gives an actionable message when an MCP server fails to start", () => {
		const result = classifyCliFailure("claude", "MCP server 'playwright' failed to connect: spawn npx ENOENT");
		expect(result.message).toContain("ferramenta MCP");
	});

	it("gives an actionable message when the Windows command line is too long", () => {
		const result = classifyCliFailure("claude", "A linha de comando é muito longa.");
		expect(result.message).toContain("grande demais para a linha de comando");
	});

	it("falls back to the raw detail for unknown failures", () => {
		expect(classifyCliFailure("claude", "segfault at 0x0").message).toBe("segfault at 0x0");
	});
});

// --- Loop de tool calling (providers OpenAI-compat: Ollama, vLLM, LM Studio...) ---

/** Captura os eventos SSE escritos pelo runner, sem precisar de um socket real. */
const fakeResponse = () => {
	const events: { event: string; data: Record<string, unknown> }[] = [];
	const res = {
		writableEnded: false,
		write: (chunk: string) => {
			const event = chunk.match(/^event: (.+)$/m)?.[1] ?? "";
			const data = chunk.match(/^data: (.+)$/m)?.[1] ?? "{}";
			events.push({ event, data: JSON.parse(data) });
			return true;
		},
		end: () => {
			res.writableEnded = true;
		},
	};
	return { res: res as unknown as ServerResponse, events };
};

/** Uma resposta `/chat/completions` em streaming, montada a partir dos deltas informados. */
const sseResponse = (deltas: Record<string, unknown>[]): Response => {
	const body = `${deltas.map((delta) => `data: ${JSON.stringify({ choices: [{ delta }] })}`).join("\n\n")}\n\ndata: [DONE]\n\n`;
	return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
};

/** Deltas que pedem uma tool call, fatiando `arguments` como um servidor real faz. */
const toolCallDeltas = (name: string, args: string): Record<string, unknown>[] => [
	{ tool_calls: [{ index: 0, id: "call_1", function: { name, arguments: "" } }] },
	{ tool_calls: [{ index: 0, function: { arguments: args.slice(0, 5) } }] },
	{ tool_calls: [{ index: 0, function: { arguments: args.slice(5) } }] },
];

const searchTool = (execute: ResolvedTool["execute"]): ResolvedTool => ({
	definition: {
		type: "function",
		function: { name: "buscar", description: "Busca na web", parameters: { type: "object", properties: {} } },
	},
	execute,
});

const namedTool = (name: string, execute: ResolvedTool["execute"]): ResolvedTool => ({
	definition: { type: "function", function: { name, description: "", parameters: { type: "object", properties: {} } } },
	execute,
});

/** `resolveModel` faz um `GET /models` antes da primeira chamada — responde vazio e segue. */
const mockChatCalls = (responses: Response[]) => {
	let call = 0;
	return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
		if (String(input).includes("/models")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
		return responses[call++] ?? new Response("no more responses", { status: 500 });
	});
};

describe("callOpenAiCompat tool loop", () => {
	const input = { baseUrl: "http://localhost:11434/v1", model: "qwen3", systemPrompt: "sys", prompt: "busque" };
	const resolveSecret: SecretResolver = async () => undefined;

	// Sem restaurar, `vi.spyOn(globalThis, "fetch")` devolve o mesmo spy no teste seguinte e as
	// chamadas de um teste vazam nas asserções do outro.
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("executes the requested tool and feeds the result back for the final answer", async () => {
		mockChatCalls([
			sseResponse(toolCallDeltas("buscar", '{"variables":{"query":"concursos TI"}}')),
			sseResponse([{ content: "Achei 2 editais." }]),
		]);
		const execute = vi.fn().mockResolvedValue({ ok: true, text: "resultado da busca" });
		const { res, events } = fakeResponse();

		await callOpenAiCompat({ ...input, tools: [searchTool(execute)] }, resolveSecret, res);

		expect(execute).toHaveBeenCalledWith({ variables: { query: "concursos TI" } });
		expect(events.find((e) => e.event === "tool_use")?.data).toMatchObject({ name: "buscar" });
		expect(events.find((e) => e.event === "tool_result")?.data).toMatchObject({
			ok: true,
			detail: "resultado da busca",
		});
		expect(events.find((e) => e.event === "done")?.data).toMatchObject({ output: "Achei 2 editais." });
	});

	it("sends the tool definitions in the request body", async () => {
		const fetchMock = mockChatCalls([sseResponse([{ content: "pronto" }])]);
		const { res } = fakeResponse();

		await callOpenAiCompat({ ...input, tools: [searchTool(vi.fn())] }, resolveSecret, res);

		const chatCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/chat/completions"));
		const body = JSON.parse(String((chatCall?.[1] as RequestInit).body)) as { tools?: unknown[] };
		expect(body.tools).toHaveLength(1);
	});

	it("omits tools entirely when the agent has none attached", async () => {
		const fetchMock = mockChatCalls([sseResponse([{ content: "pronto" }])]);
		const { res, events } = fakeResponse();

		await callOpenAiCompat(input, resolveSecret, res);

		const chatCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/chat/completions"));
		const body = JSON.parse(String((chatCall?.[1] as RequestInit).body)) as { tools?: unknown[] };
		expect(body.tools).toBeUndefined();
		expect(events.find((e) => e.event === "done")?.data).toMatchObject({ output: "pronto" });
	});

	it("tells the model which tools exist when it hallucinates a name, instead of aborting", async () => {
		mockChatCalls([sseResponse(toolCallDeltas("web_search", "{}")), sseResponse([{ content: "ok" }])]);
		const execute = vi.fn();
		const { res, events } = fakeResponse();

		await callOpenAiCompat({ ...input, tools: [searchTool(execute)] }, resolveSecret, res);

		expect(execute).not.toHaveBeenCalled();
		const toolResult = events.find((e) => e.event === "tool_result")?.data as { ok: boolean; detail: string };
		expect(toolResult.ok).toBe(false);
		expect(toolResult.detail).toContain("buscar");
		expect(events.find((e) => e.event === "done")?.data).toMatchObject({ output: "ok" });
	});

	it("surfaces malformed tool arguments as a tool error the model can recover from", async () => {
		mockChatCalls([sseResponse(toolCallDeltas("buscar", "{not json")), sseResponse([{ content: "ok" }])]);
		const execute = vi.fn();
		const { res, events } = fakeResponse();

		await callOpenAiCompat({ ...input, tools: [searchTool(execute)] }, resolveSecret, res);

		expect(execute).not.toHaveBeenCalled();
		expect(events.find((e) => e.event === "tool_result")?.data).toMatchObject({ ok: false });
	});

	it("stops with an actionable error when the model never stops calling tools", async () => {
		mockChatCalls(Array.from({ length: 12 }, () => sseResponse(toolCallDeltas("buscar", "{}"))));
		const { res, events } = fakeResponse();

		await callOpenAiCompat(
			{ ...input, tools: [searchTool(vi.fn().mockResolvedValue({ ok: true, text: "r" }))] },
			resolveSecret,
			res,
		);

		const error = events.find((e) => e.event === "error")?.data as { message: string };
		expect(error.message).toContain("não fechou uma resposta");
		expect(events.find((e) => e.event === "done")).toBeUndefined();
	});

	it("explains that the model lacks function calling when the endpoint rejects tools", async () => {
		mockChatCalls([new Response("model does not support tools", { status: 400 })]);
		const { res, events } = fakeResponse();

		await callOpenAiCompat({ ...input, tools: [searchTool(vi.fn())] }, resolveSecret, res);

		const error = events.find((e) => e.event === "error")?.data as { message: string };
		expect(error.message).toContain("não aceita ferramentas");
		expect(error.message).toContain("qwen3");
	});

	it("reads a non-streaming tool call, since some servers drop streaming when tools are present", async () => {
		mockChatCalls([
			new Response(
				JSON.stringify({
					choices: [
						{
							message: {
								content: null,
								tool_calls: [{ id: "c1", type: "function", function: { name: "buscar", arguments: "{}" } }],
							},
						},
					],
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			),
			sseResponse([{ content: "final" }]),
		]);
		const execute = vi.fn().mockResolvedValue({ ok: true, text: "r" });
		const { res, events } = fakeResponse();

		await callOpenAiCompat({ ...input, tools: [searchTool(execute)] }, resolveSecret, res);

		expect(execute).toHaveBeenCalledOnce();
		expect(events.find((e) => e.event === "done")?.data).toMatchObject({ output: "final" });
	});

	// Modelos locais mais fracos (ex.: gemma via Ollama) reproduzem nomes compostos "servidor__tool" de
	// forma inconsistente — observado ao vivo num squad real: "write_file" (sem o prefixo do servidor
	// MCP) e "workspace.list_files" (ponto em vez de "__"). Sem tolerar isso, a tool nunca executava e o
	// agent ficava perguntando ao usuário em vez de gravar/ler o arquivo de verdade.
	it('resolves a tool call missing the MCP server prefix (e.g. "write_file" for "workspace__write_file")', async () => {
		mockChatCalls([
			sseResponse(toolCallDeltas("write_file", '{"path":"a.html","content":"<html></html>"}')),
			sseResponse([{ content: "final" }]),
		]);
		const execute = vi.fn().mockResolvedValue({ ok: true, text: "gravado" });
		const { res, events } = fakeResponse();

		await callOpenAiCompat({ ...input, tools: [namedTool("workspace__write_file", execute)] }, resolveSecret, res);

		expect(execute).toHaveBeenCalledWith({ path: "a.html", content: "<html></html>" });
		expect(events.find((e) => e.event === "tool_result")?.data).toMatchObject({ ok: true });
	});

	it('resolves a tool call with a dot instead of the "__" separator', async () => {
		mockChatCalls([sseResponse(toolCallDeltas("workspace.list_files", "{}")), sseResponse([{ content: "final" }])]);
		const execute = vi.fn().mockResolvedValue({ ok: true, text: "[]" });
		const { res } = fakeResponse();

		await callOpenAiCompat({ ...input, tools: [namedTool("workspace__list_files", execute)] }, resolveSecret, res);

		expect(execute).toHaveBeenCalledOnce();
	});

	it("does not guess when the normalized suffix matches more than one tool (stays a real error)", async () => {
		mockChatCalls([sseResponse(toolCallDeltas("list_files", "{}")), sseResponse([{ content: "final" }])]);
		const executeA = vi.fn().mockResolvedValue({ ok: true, text: "a" });
		const executeB = vi.fn().mockResolvedValue({ ok: true, text: "b" });
		const { res, events } = fakeResponse();

		await callOpenAiCompat(
			{ ...input, tools: [namedTool("workspace__list_files", executeA), namedTool("archive__list_files", executeB)] },
			resolveSecret,
			res,
		);

		expect(executeA).not.toHaveBeenCalled();
		expect(executeB).not.toHaveBeenCalled();
		expect(events.find((e) => e.event === "tool_result")?.data).toMatchObject({ ok: false });
	});
});

describe("walkAllRelPaths", () => {
	it("finds real files even without a .git — fallback for handleSnapshotRun/handleListFiles when git is absent", () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "workestrator-walk-"));
		try {
			mkdirSync(path.join(dir, "output", "slides"), { recursive: true });
			writeFileSync(path.join(dir, "output", "slides", "slide-01.html"), "<html></html>");
			mkdirSync(path.join(dir, "node_modules"), { recursive: true });
			writeFileSync(path.join(dir, "node_modules", "ignored.js"), "//");

			const files = walkAllRelPaths(dir).map((f) => f.split(path.sep).join("/"));

			expect(files).toEqual(["output/slides/slide-01.html"]);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("workspace-fs MCP server (built-in filesystem tool)", () => {
	const serverPath = path.resolve(CURRENT_TEST_DIR, "..", "mcp-servers", "workspace-fs.mjs");

	it("writes, reads and lists files scoped to the workspace, and rejects path traversal", async () => {
		const workspaceDir = mkdtempSync(path.join(os.tmpdir(), "workestrator-fs-"));
		const taken = new Set<string>();
		try {
			const connection = await connectMcpTools(
				"workspace",
				{ command: process.execPath, args: [serverPath], env: { WORKESTRATOR_WORKSPACE_DIR: workspaceDir } },
				undefined,
				taken,
			);
			try {
				const byName = new Map(connection.tools.map((t) => [t.definition.function.name, t]));

				const write = await byName.get("workspace__write_file")!.execute({
					path: "output/slides/slide-01.html",
					content: "<html>oi</html>",
				});
				expect(write.ok).toBe(true);
				expect(existsSync(path.join(workspaceDir, "output", "slides", "slide-01.html"))).toBe(true);

				const read = await byName.get("workspace__read_file")!.execute({ path: "output/slides/slide-01.html" });
				expect(read.ok).toBe(true);
				expect(read.text).toBe("<html>oi</html>");

				const list = await byName.get("workspace__list_files")!.execute({});
				expect(JSON.parse(list.text)).toEqual(["output/slides/slide-01.html"]);

				const escape = await byName.get("workspace__write_file")!.execute({
					path: "../outside.html",
					content: "nope",
				});
				expect(escape.ok).toBe(false);
				expect(escape.text).toContain("não permitido");
			} finally {
				await connection.close();
			}
		} finally {
			rmSync(workspaceDir, { recursive: true, force: true });
		}
	}, 20_000);

	// Reproduz ao vivo: o modelo chamou `workspace__list_files{directory:"output/slides/"}` — "directory"
	// não existia no schema antigo (só "path"), então era descartado silenciosamente pela validação e a
	// tool caía no default (raiz inteira do workspace) sem nenhum erro visível.
	it("accepts common aliases for the directory/path parameter (dir, directory, folder) instead of silently ignoring them", async () => {
		const workspaceDir = mkdtempSync(path.join(os.tmpdir(), "workestrator-fs-alias-"));
		const taken = new Set<string>();
		try {
			mkdirSync(path.join(workspaceDir, "output", "slides"), { recursive: true });
			writeFileSync(path.join(workspaceDir, "output", "slides", "slide-01.html"), "<html></html>");
			writeFileSync(path.join(workspaceDir, "root-level.txt"), "raiz");

			const connection = await connectMcpTools(
				"workspace",
				{ command: process.execPath, args: [serverPath], env: { WORKESTRATOR_WORKSPACE_DIR: workspaceDir } },
				undefined,
				taken,
			);
			try {
				const byName = new Map(connection.tools.map((t) => [t.definition.function.name, t]));
				const listFiles = byName.get("workspace__list_files")!;

				const viaDirectory = await listFiles.execute({ directory: "output/slides" });
				expect(JSON.parse(viaDirectory.text)).toEqual(["slide-01.html"]);

				const viaDir = await listFiles.execute({ dir: "output/slides" });
				expect(JSON.parse(viaDir.text)).toEqual(["slide-01.html"]);

				const viaFolder = await listFiles.execute({ folder: "output/slides" });
				expect(JSON.parse(viaFolder.text)).toEqual(["slide-01.html"]);
			} finally {
				await connection.close();
			}
		} finally {
			rmSync(workspaceDir, { recursive: true, force: true });
		}
	}, 20_000);

	it('accepts "file"/"text" as aliases for write_file\'s path/content parameters', async () => {
		const workspaceDir = mkdtempSync(path.join(os.tmpdir(), "workestrator-fs-alias2-"));
		const taken = new Set<string>();
		try {
			const connection = await connectMcpTools(
				"workspace",
				{ command: process.execPath, args: [serverPath], env: { WORKESTRATOR_WORKSPACE_DIR: workspaceDir } },
				undefined,
				taken,
			);
			try {
				const byName = new Map(connection.tools.map((t) => [t.definition.function.name, t]));

				const write = await byName.get("workspace__write_file")!.execute({ file: "a.html", text: "conteudo" });
				expect(write.ok).toBe(true);
				expect(readFileSync(path.join(workspaceDir, "a.html"), "utf-8")).toBe("conteudo");

				const read = await byName.get("workspace__read_file")!.execute({ file: "a.html" });
				expect(read.text).toBe("conteudo");
			} finally {
				await connection.close();
			}
		} finally {
			rmSync(workspaceDir, { recursive: true, force: true });
		}
	}, 20_000);
});
