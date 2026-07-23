import { randomUUID } from "node:crypto";

export type AuthFlowStatus = "pending" | "opened" | "approved" | "rejected" | "cancelled" | "expired";

export type AuthFlow = {
	id: string;
	kind: "external_authorization" | "action_approval";
	label: string;
	url?: string;
	status: AuthFlowStatus;
	createdAt: string;
	expiresAt: string;
	resolvedAt?: string;
};

const flows = new Map<string, AuthFlow>();

const refreshExpiry = (flow: AuthFlow): AuthFlow => {
	if (["pending", "opened"].includes(flow.status) && Date.parse(flow.expiresAt) <= Date.now()) {
		const expired = { ...flow, status: "expired" as const, resolvedAt: new Date().toISOString() };
		flows.set(flow.id, expired);
		return expired;
	}
	return flow;
};

export const validateInteractiveUrl = (value: string): string => {
	const url = new URL(value);
	const isLoopback = url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";
	if (url.username || url.password) throw new Error("A URL do fluxo nÃ£o pode conter credenciais.");
	if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
		throw new Error("O fluxo deve usar HTTPS ou loopback local.");
	}
	return url.toString();
};

export const createAuthFlow = (input: {
	kind: AuthFlow["kind"];
	label: string;
	url?: string;
	ttlSeconds?: number;
}): AuthFlow => {
	const label = input.label.trim();
	if (!label) throw new Error("Informe o nome do fluxo.");
	if (input.kind === "external_authorization" && !input.url) throw new Error("Informe a URL de autorizaÃ§Ã£o.");
	const ttlSeconds = Math.min(Math.max(input.ttlSeconds ?? 300, 30), 1800);
	const flow: AuthFlow = {
		id: randomUUID(),
		kind: input.kind,
		label,
		url: input.url ? validateInteractiveUrl(input.url) : undefined,
		status: "pending",
		createdAt: new Date().toISOString(),
		expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
	};
	flows.set(flow.id, flow);
	return flow;
};

export const getAuthFlow = (id: string): AuthFlow => {
	const flow = flows.get(id);
	if (!flow) throw new Error("Fluxo nÃ£o encontrado.");
	return refreshExpiry(flow);
};

export const markAuthFlowOpened = (id: string): AuthFlow => {
	const flow = getAuthFlow(id);
	if (!["pending", "opened"].includes(flow.status)) throw new Error("Este fluxo nÃ£o estÃ¡ mais pendente.");
	const opened = { ...flow, status: "opened" as const };
	flows.set(id, opened);
	return opened;
};

export const resolveAuthFlow = (id: string, approved: boolean): AuthFlow => {
	const flow = getAuthFlow(id);
	if (!["pending", "opened"].includes(flow.status)) throw new Error("Este fluxo nÃ£o estÃ¡ mais pendente.");
	const resolved = {
		...flow,
		status: approved ? ("approved" as const) : ("rejected" as const),
		resolvedAt: new Date().toISOString(),
	};
	flows.set(id, resolved);
	return resolved;
};

export const cancelAuthFlow = (id: string): AuthFlow => {
	const flow = getAuthFlow(id);
	if (!["pending", "opened"].includes(flow.status)) return flow;
	const cancelled = { ...flow, status: "cancelled" as const, resolvedAt: new Date().toISOString() };
	flows.set(id, cancelled);
	return cancelled;
};
