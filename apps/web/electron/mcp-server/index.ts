#!/usr/bin/env node
// MCP server externo do Workestrator (Etapa 5a do plano) — processo Node puro, sem passar pelo
// Vite/Electron, que expõe a camada de operações de config (`operations/catalog.ts`) como tools MCP
// via stdio, pra qualquer cliente MCP (Claude Code, Claude Desktop, etc.) montar/ajustar squads em
// nome do usuário logado conversando em linguagem natural.
//
// Não importa `operations.ts`/`registry.ts` do app: aquele módulo puxa `@/app/api/clients`, que
// depende de `import.meta.env` (Vite) e do `tokenStorage` do Electron — inutilizável fora do
// navegador/app empacotado. Mesma convenção já adotada em `electron/runner/*`, que nunca importa
// `src/`. Só `operations/catalog.ts` é reaproveitado daqui (metadados + schemas Zod, 100% puro).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios, { type AxiosInstance } from "axios";
import { z, type ZodRawShape } from "zod";
import { OPERATIONS_META } from "../../src/features/security/orchestrator-shared/operations/catalog";
import { readSessionToken } from "../session-token-cache";

const apiUrl = process.env.WORKESTRATOR_API_URL ?? "http://localhost:8080";
// `WORKESTRATOR_TOKEN` continua funcionando (útil em CI/scripts), mas na maioria dos casos nem
// precisa ser exportado à mão: o app Electron cacheia o token de sessão em
// `~/.workestrator/mcp-session-token.json` a cada login (ver `session-token-cache.ts`), então basta
// ter logado no Workestrator ao menos uma vez com essa sessão ainda válida.
const token = process.env.WORKESTRATOR_TOKEN ?? readSessionToken();

if (!token) {
	console.error(
		"Nenhum token de sessão disponível. Faça login no Workestrator (o app cacheia o token automaticamente) " +
			"ou exporte WORKESTRATOR_TOKEN=... manualmente antes de rodar este MCP server. " +
			"WORKESTRATOR_API_URL é opcional (padrão: http://localhost:8080).",
	);
	process.exit(1);
}

const api: AxiosInstance = axios.create({
	baseURL: apiUrl,
	timeout: 30000,
	headers: { Authorization: `Bearer ${token}` },
});

const getApiErrorMessage = (error: unknown, fallback: string): string => {
	if (axios.isAxiosError(error)) {
		const message = error.response?.data?.message;
		if (typeof message === "string" && message.trim()) return message;
	}
	if (error instanceof Error && error.message) return error.message;
	return fallback;
};

const textResult = (text: string) => ({ content: [{ type: "text" as const, text }] });
const errorResult = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });

type Handler = (input: Record<string, unknown>) => Promise<{ summary: string; data?: unknown }>;

const CONFIRM_SUMMARY = (action: string) =>
	`Isso ${action}. Chame de novo com confirm: true SÓ depois que o usuário confirmar explicitamente.`;

const requireConfirm = (input: Record<string, unknown>, action: string): void => {
	if (input.confirm !== true) throw new ConfirmationRequiredError(CONFIRM_SUMMARY(action));
};

class ConfirmationRequiredError extends Error {}

const HANDLERS: Record<string, Handler> = {
	list_squads: async () => {
		const { data } = await api.get("/squads");
		return { summary: `${data.length} squad(s) encontrado(s).`, data };
	},
	get_squad: async ({ squadId }) => {
		const { data } = await api.get(`/squads/${squadId}`);
		return { summary: `Squad "${data.name}" carregado.`, data };
	},
	create_squad: async (input) => {
		const { data } = await api.post("/squads", input);
		return { summary: `Squad "${data.name}" criado.`, data };
	},
	update_squad: async ({ squadId, patch }) => {
		await api.put(`/squads/${squadId}`, patch);
		const { data } = await api.get(`/squads/${squadId}`);
		return { summary: `Squad "${data.name}" atualizado.`, data };
	},
	delete_squad: async (input) => {
		requireConfirm(input, `apaga o squad "${input.squadId}" e todo o histórico de runs`);
		await api.delete(`/squads/${input.squadId}`);
		return { summary: "Squad excluído." };
	},
	add_agent: async ({ squadId, agent }) => {
		const { data } = await api.post(`/squads/${squadId}/agents`, agent);
		return { summary: `Agent "${data.name}" adicionado ao squad.`, data };
	},
	update_agent: async ({ squadId, agentId, patch }) => {
		const { data } = await api.put(`/squads/${squadId}/agents/${agentId}`, patch);
		return { summary: `Agent "${data.name}" atualizado.`, data };
	},
	remove_agent: async (input) => {
		requireConfirm(input, `remove o agent "${input.agentId}" do squad e libera a cadeira`);
		await api.delete(`/squads/${input.squadId}/agents/${input.agentId}`);
		return { summary: "Agent removido do squad." };
	},
	add_seat: async ({ squadId, col, row, agentId }) => {
		const { data } = await api.post(`/squads/${squadId}/seats`, { col, row, agentId });
		return { summary: `Cadeira criada em (${data.col}, ${data.row}).`, data };
	},
	assign_seat: async ({ squadId, seatId, agentId }) => {
		const { data } = await api.put(`/squads/${squadId}/seats/${seatId}`, { agentId, agentIdProvided: true });
		return { summary: agentId ? `Agent sentado na cadeira ${seatId}.` : `Cadeira ${seatId} esvaziada.`, data };
	},
	remove_seat: async (input) => {
		requireConfirm(input, `remove a cadeira "${input.seatId}" do escritório`);
		await api.delete(`/squads/${input.squadId}/seats/${input.seatId}`);
		return { summary: "Cadeira removida." };
	},
	set_orchestrator: async ({ squadId, config }) => {
		const cfg = config as { systemPrompt: string; modelRef: { providerId: string; model: string }; maxSteps: number };
		await api.put(`/squads/${squadId}`, {
			orchSystemPrompt: cfg.systemPrompt,
			orchProviderId: cfg.modelRef.providerId || null,
			orchModel: cfg.modelRef.model || null,
			orchMaxSteps: cfg.maxSteps,
		});
		return { summary: `Coordenador do squad atualizado (máx. ${cfg.maxSteps} passos).` };
	},
	attach_tool: async ({ squadId, agentId, scriptId }) => {
		const { data: squad } = await api.get(`/squads/${squadId}`);
		const agentDto = squad.agents.find((candidate: { id: string }) => candidate.id === agentId);
		if (!agentDto) throw new Error(`Agent "${agentId}" não encontrado no squad "${squadId}".`);
		const scriptIds = Array.from(new Set([...agentDto.scriptIds, scriptId]));
		const { data } = await api.put(`/squads/${squadId}/agents/${agentId}`, { scriptIds });
		return { summary: `Ferramenta anexada ao agent "${data.name}".`, data };
	},
	list_runs: async ({ squadId }) => {
		const { data } = await api.get(`/squads/${squadId}/runs`);
		return { summary: `${data.length} execução(ões) encontrada(s).`, data };
	},
	list_providers: async () => {
		const { data } = await api.get("/providers");
		return { summary: `${data.length} provider(s) encontrado(s).`, data };
	},
	list_scripts: async () => {
		const { data } = await api.get("/scripts");
		return { summary: `${data.length} script(s) encontrado(s).`, data };
	},
};

const server = new McpServer({ name: "workestrator", version: "1.0.0" });

for (const meta of OPERATIONS_META) {
	// Só expõe tools com handler REST aqui. `run_squad` roda no engine do renderer (não headless),
	// então não é anunciado por este server — evita anunciar uma tool que quebraria ao ser chamada.
	if (!HANDLERS[meta.name]) continue;

	const baseShape = (meta.schema && "shape" in meta.schema ? (meta.schema as z.ZodObject<ZodRawShape>).shape : {}) as ZodRawShape;
	const inputSchema: ZodRawShape = meta.destructive
		? {
				...baseShape,
				confirm: z
					.boolean()
					.optional()
					.describe("Só envie true depois que o usuário confirmou explicitamente esta ação destrutiva."),
			}
		: baseShape;

	server.registerTool(
		meta.name,
		{
			description: meta.destructive ? `${meta.description} DESTRUTIVA — exige confirm: true.` : meta.description,
			inputSchema,
		},
		async (input) => {
			try {
				const result = await HANDLERS[meta.name](input as Record<string, unknown>);
				return textResult(result.data !== undefined ? `${result.summary}\n\n${JSON.stringify(result.data, null, 2)}` : result.summary);
			} catch (error) {
				if (error instanceof ConfirmationRequiredError) return textResult(error.message);
				return errorResult(getApiErrorMessage(error, `Falha ao executar ${meta.name}`));
			}
		},
	);
}

const transport = new StdioServerTransport();
await server.connect(transport);
