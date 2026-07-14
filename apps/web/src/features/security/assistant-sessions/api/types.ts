import type { ConfigAssistantMessage } from "@/features/security/orchestrator-shared/model";

/** Metadados leves de uma sessão do assistente — usados na sidebar de histórico (sem `messages`). */
export type AssistantSessionSummary = {
	id: string;
	title: string;
	providerId?: string;
	model?: string;
	workingDir?: string;
	groupId?: string | null;
	createdAt: string;
	updatedAt: string;
};

/** Sessão completa (com a conversa) — carregada ao abrir `/orquestrador/assistente/:sessionId`. */
export type AssistantSession = AssistantSessionSummary & {
	messages: ConfigAssistantMessage[];
};

export type CreateAssistantSessionPayload = {
	title: string;
	providerId?: string;
	model?: string;
	/** `null` limpa o diretório no backend (o assistente sempre envia o estado completo da sessão). */
	workingDir?: string | null;
	messages: ConfigAssistantMessage[];
};

export type UpdateAssistantSessionPayload = Partial<CreateAssistantSessionPayload>;
