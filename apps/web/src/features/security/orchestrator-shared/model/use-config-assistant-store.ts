import { create } from "zustand";

export type ConfigAssistantMessage = {
	id: string;
	role: "user" | "assistant" | "system";
	content: string;
	actions?: ConfigAssistantMessageAction[];
	/**
	 * Contexto extra visível só para o modelo (ex.: JSON de retorno de uma operação), anexado em
	 * `buildConversationPrompt` mas nunca renderizado no chat — mantém o bubble limpo sem cegar o modelo.
	 */
	promptData?: string;
};

export type ConfigAssistantMessageAction =
	| { type: "open_resources"; label: string }
	| { type: "publish_asset"; label: string; assetId: string };

export type ConfigAssistantPendingConfirmation = {
	operation: string;
	input: unknown;
	summary: string;
};

/** Item da timeline de atividade da rodada atual (o "o que a IA está fazendo/pensando"). */
export type AssistantActivityItem = {
	id: string;
	kind: "thinking" | "step" | "tool" | "output";
	label: string;
	detail?: string;
};

/** Artefatos produzidos na rodada (diff de arquivos, saída de terminal) — alimentam o painel lateral. */
export type AssistantArtifacts = {
	diff?: string;
	terminal?: string;
};

type ConfigAssistantState = {
	/** Sessão persistida atualmente aberta; `null` numa conversa nova ainda não salva. */
	activeSessionId: string | null;
	providerId: string | null;
	model: string | null;
	/** Pasta de trabalho escolhida — quando definida (e provider claude-cli), habilita execução real. */
	workingDir: string | null;
	messages: ConfigAssistantMessage[];
	/** Texto do turno em streaming (modo execução) — some quando a mensagem final é anexada. */
	streamingText: string;
	/** Timeline de atividade/pensamento da rodada atual. */
	activity: AssistantActivityItem[];
	/** Artefatos da rodada (diff, terminal) exibidos no painel lateral. */
	artifacts: AssistantArtifacts;
	pendingConfirmation: ConfigAssistantPendingConfirmation | null;
	isRunning: boolean;
	appendMessage: (message: Omit<ConfigAssistantMessage, "id">) => void;
	setRunning: (running: boolean) => void;
	setPendingConfirmation: (pending: ConfigAssistantPendingConfirmation | null) => void;
	setStreamingText: (text: string) => void;
	appendStreamingText: (chunk: string) => void;
	addActivity: (item: Omit<AssistantActivityItem, "id">) => void;
	clearActivity: () => void;
	setArtifacts: (artifacts: AssistantArtifacts) => void;
	appendTerminal: (chunk: string) => void;
	setModel: (providerId: string | null, model: string | null) => void;
	setWorkingDir: (workingDir: string | null) => void;
	setActiveSessionId: (id: string | null) => void;
	/** Substitui todo o estado da conversa ao abrir uma sessão salva. */
	hydrate: (session: {
		id: string | null;
		providerId?: string | null;
		model?: string | null;
		workingDir?: string | null;
		messages: ConfigAssistantMessage[];
	}) => void;
	reset: () => void;
};

/**
 * Estado do chat do assistente (Etapa 5b) — reflete a sessão aberta no momento. É lido tanto pela UI
 * (`page-config-assistant.tsx`) quanto pelo loop módulo-level em `runtime/config-assistant-runtime.ts`,
 * que roda destacado do ciclo de vida de componentes (mesmo motivo do `useOrchestratorRuntimeStore`).
 * A persistência (REST) é feita pela página via `assistant-sessions/api`; o store guarda só o ao vivo.
 */
export const useConfigAssistantStore = create<ConfigAssistantState>((set) => ({
	activeSessionId: null,
	providerId: null,
	model: null,
	workingDir: null,
	messages: [],
	streamingText: "",
	activity: [],
	artifacts: {},
	pendingConfirmation: null,
	isRunning: false,
	appendMessage: (message) =>
		set((state) => ({ messages: [...state.messages, { ...message, id: crypto.randomUUID() }] })),
	setRunning: (running) => set({ isRunning: running }),
	setPendingConfirmation: (pending) => set({ pendingConfirmation: pending }),
	setStreamingText: (text) => set({ streamingText: text }),
	appendStreamingText: (chunk) => set((state) => ({ streamingText: state.streamingText + chunk })),
	addActivity: (item) => set((state) => ({ activity: [...state.activity, { ...item, id: crypto.randomUUID() }] })),
	clearActivity: () => set({ activity: [], artifacts: {} }),
	setArtifacts: (artifacts) => set((state) => ({ artifacts: { ...state.artifacts, ...artifacts } })),
	appendTerminal: (chunk) => set((state) => ({ artifacts: { ...state.artifacts, terminal: (state.artifacts.terminal ?? "") + chunk } })),
	setModel: (providerId, model) => set({ providerId, model }),
	setWorkingDir: (workingDir) => set({ workingDir }),
	setActiveSessionId: (id) => set({ activeSessionId: id }),
	hydrate: (session) =>
		set({
			activeSessionId: session.id,
			providerId: session.providerId ?? null,
			model: session.model ?? null,
			workingDir: session.workingDir ?? null,
			messages: session.messages,
			streamingText: "",
			activity: [],
			artifacts: {},
			pendingConfirmation: null,
			isRunning: false,
		}),
	reset: () =>
		set({
			activeSessionId: null,
			workingDir: null,
			messages: [],
			streamingText: "",
			activity: [],
			artifacts: {},
			pendingConfirmation: null,
			isRunning: false,
		}),
}));
