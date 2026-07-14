// Motor do assistente conversacional (Etapa 5b do plano) — módulo-level, mesmo motivo do
// `orchestrator-runtime.ts`: o loop chama o modelo várias vezes seguidas (uma por operação executada)
// sem depender do componente que disparou a mensagem continuar montado.
//
// Dois modos, decididos pela sessão (ver plano, Etapa 4.4):
// - CONFIG (sem `workingDir`): loop de operações JSON contra o backend REST — cria/ajusta squads,
//   agents, cadeiras. Provider-agnóstico. Sem streaming de tokens (a saída do modelo é JSON).
// - EXECUÇÃO (`workingDir` definido + provider claude-cli): uma chamada com `canExecute`, o CLI usa
//   Bash/Read/Write/Edit na pasta escolhida (estilo Claude Code). Tokens transmitidos ao vivo.
import { useConfigAssistantStore } from "../model/use-config-assistant-store";
import { buildAssistantSystemPrompt, ASSISTANT_MAX_STEPS, parseAssistantAction } from "../operations/assistant";
import { getOperationDef } from "../operations/registry";
import type { ModelProvider } from "../types";
import { AgentCallError, callAgentStep } from "./model-client";
import { cancelAdvance, runAbortable } from "./runner-controllers";

const RUNTIME_KEY = "config-assistant";

const roleLabel: Record<"user" | "assistant" | "system", string> = {
	user: "Usuário",
	assistant: "Você",
	system: "Sistema",
};

const buildConversationPrompt = (): string =>
	useConfigAssistantStore
		.getState()
		.messages.map((message) => {
			const base = `${roleLabel[message.role]}: ${message.content}`;
			return message.promptData ? `${base}\nDados: ${message.promptData}` : base;
		})
		.join("\n\n");

/** Limite do payload realimentado ao modelo — evita estourar o contexto com listas grandes. */
const MAX_OBSERVATION_DATA_CHARS = 4000;

/**
 * Serializa o `data` de uma operação bem-sucedida para o modelo enxergar ids/nomes que o `summary`
 * (só contagem) esconde. Sem isso, operações de descoberta (`list_squads`, `get_squad`, ...) voltam
 * cegas e o modelo repete a mesma chamada até bater `ASSISTANT_MAX_STEPS`. Volta `undefined` quando
 * não há nada útil, para o chat não exibir um `Dados:` vazio.
 */
const serializeObservationData = (data: unknown): string | undefined => {
	if (data === undefined || data === null) return undefined;
	let json: string;
	try {
		json = JSON.stringify(data);
	} catch {
		return undefined;
	}
	if (json === "{}" || json === "[]") return undefined;
	return json.length > MAX_OBSERVATION_DATA_CHARS ? `${json.slice(0, MAX_OBSERVATION_DATA_CHARS)}… (truncado)` : json;
};

/** System prompt do modo execução — o CLI opera com tools reais na pasta escolhida. */
const getCreatedSkillData = (data: unknown): { id: string; title: string } | null => {
	if (!data || typeof data !== "object") return null;
	const record = data as Record<string, unknown>;
	if (typeof record.id !== "string" || typeof record.title !== "string") return null;
	return { id: record.id, title: record.title };
};

const buildExecutionSystemPrompt = (workingDir: string): string =>
	[
		"Você é um assistente de engenharia que trabalha DENTRO de um diretório de projeto local.",
		`Diretório de trabalho: ${workingDir}`,
		"Use as ferramentas disponíveis (Bash, Read, Write, Edit, Glob, Grep) para inspecionar e alterar",
		"arquivos nessa pasta conforme o pedido do usuário. Responda em português, de forma objetiva,",
		"explicando o que fez ao final.",
	].join(" ");

const finishError = (err: unknown, signal: AbortSignal): void => {
	if (signal.aborted) return;
	const store = useConfigAssistantStore.getState();
	const message = err instanceof AgentCallError ? err.message : "Erro desconhecido ao chamar o modelo.";
	store.appendMessage({ role: "assistant", content: `Erro: ${message}` });
	store.setStreamingText("");
	store.setRunning(false);
};

/** Modo execução: uma chamada com tools reais, streaming de tokens ao vivo. */
const runExecutionTurn = async (provider: ModelProvider, model: string, workingDir: string, signal: AbortSignal) => {
	const store = useConfigAssistantStore;
	store.getState().setStreamingText("");
	store.getState().addActivity({
		kind: "step",
		label: "Iniciando CLI",
		detail: `Preparando execução em ${workingDir}.`,
	});

	let result;
	try {
		result = await callAgentStep(
			{
				systemPrompt: buildExecutionSystemPrompt(workingDir),
				prompt: buildConversationPrompt(),
				model,
				providerKind: provider.kind,
				baseUrl: provider.baseUrl,
				apiKeyRef: provider.apiKeyRef,
				canExecute: true,
				workingDir,
			},
			signal,
			(chunk) => store.getState().appendStreamingText(chunk),
			{
				onThinking: (text) => store.getState().addActivity({ kind: "thinking", label: "Pensando", detail: text }),
				onActivity: (activity) =>
					store.getState().addActivity({ kind: activity.kind, label: activity.label, detail: activity.detail }),
				onTerminal: (text) => store.getState().appendTerminal(text),
			},
		);
	} catch (err) {
		finishError(err, signal);
		return;
	}

	if (signal.aborted) return;
	if (result.diff) store.getState().setArtifacts({ diff: result.diff });
	store.getState().appendMessage({ role: "assistant", content: result.output });
	store.getState().setStreamingText("");
	store.getState().setRunning(false);
};

/** Modo config: loop de operações JSON contra o backend. */
const runConfigLoop = async (provider: ModelProvider, model: string, signal: AbortSignal): Promise<void> => {
	const store = useConfigAssistantStore;
	store.getState().addActivity({
		kind: "thinking",
		label: "Lendo pedido",
		detail: "Organizando a proxima acao antes de responder.",
	});

	for (let step = 0; step < ASSISTANT_MAX_STEPS; step++) {
		let result;
		try {
			result = await callAgentStep(
				{
					systemPrompt: buildAssistantSystemPrompt(),
					prompt: buildConversationPrompt(),
					model,
					providerKind: provider.kind,
					baseUrl: provider.baseUrl,
					apiKeyRef: provider.apiKeyRef,
				},
				signal,
			);
		} catch (err) {
			finishError(err, signal);
			return;
		}

		const action = parseAssistantAction(result.output);

		if (action.type === "reply") {
			store.getState().appendMessage({ role: "assistant", content: action.message });
			store.getState().setRunning(false);
			return;
		}

		const def = getOperationDef(action.operation);
		if (!def) {
			store.getState().appendMessage({ role: "system", content: `Operação desconhecida: "${action.operation}".` });
			store.getState().setRunning(false);
			return;
		}

		const opResult = await def.call(action.input);

		if (!opResult.ok && opResult.requiresConfirmation) {
			store.getState().appendMessage({ role: "system", content: opResult.summary });
			store.getState().setPendingConfirmation({ operation: def.name, input: action.input, summary: opResult.summary });
			store.getState().setRunning(false);
			return;
		}

		const observation = opResult.ok
			? `Executou ${def.name}: ${opResult.summary}`
			: `Falha em ${def.name}: ${opResult.error}`;
		store
			.getState()
			.addActivity({ kind: "step", label: def.name, detail: opResult.ok ? opResult.summary : opResult.error });
		store.getState().appendMessage({
			role: "system",
			content: observation,
			promptData: opResult.ok ? serializeObservationData(opResult.data) : undefined,
		});
		if (opResult.ok && def.name === "create_skill") {
			const skill = getCreatedSkillData(opResult.data);
			store.getState().appendMessage({
				role: "assistant",
				content: skill ? `Skill criada: **${skill.title}**.` : "Skill criada.",
				actions: skill
					? [
							{ type: "open_resources", label: "Abrir recursos" },
							{ type: "publish_asset", label: "Publicar no Explore", assetId: skill.id },
						]
					: [{ type: "open_resources", label: "Abrir recursos" }],
			});
			store.getState().setRunning(false);
			return;
		}
		// Sem early-return aqui: o loop chama o modelo de novo já com essa observação no histórico.
	}

	store
		.getState()
		.appendMessage({ role: "system", content: `Limite de ${ASSISTANT_MAX_STEPS} passos atingido nesta rodada.` });
	store.getState().setRunning(false);
};

const runAssistantLoop = async (provider: ModelProvider, model: string, signal: AbortSignal): Promise<void> => {
	const { workingDir } = useConfigAssistantStore.getState();
	const executionMode = Boolean(workingDir?.trim()) && provider.kind === "claude-cli";

	if (executionMode) {
		await runExecutionTurn(provider, model, workingDir!.trim(), signal);
		return;
	}
	await runConfigLoop(provider, model, signal);
};

/** Envia a mensagem do usuário e dispara o loop — ignorado se já há uma rodada em curso ou uma confirmação pendente. */
export const sendAssistantMessage = (text: string, provider: ModelProvider, model: string): void => {
	const trimmed = text.trim();
	if (!trimmed) return;
	const { isRunning, pendingConfirmation, appendMessage, setRunning } = useConfigAssistantStore.getState();
	if (isRunning || pendingConfirmation) return;

	appendMessage({ role: "user", content: trimmed });
	useConfigAssistantStore.getState().clearActivity();
	setRunning(true);
	runAbortable(RUNTIME_KEY, (signal) => runAssistantLoop(provider, model, signal));
};

/** Clique em "Confirmar" no banner de checkpoint — reexecuta a MESMA operação com `confirm: true`. */
export const confirmPendingAction = (): void => {
	const { pendingConfirmation, setPendingConfirmation, appendMessage, setRunning } = useConfigAssistantStore.getState();
	if (!pendingConfirmation) return;
	const def = getOperationDef(pendingConfirmation.operation);
	setPendingConfirmation(null);
	if (!def?.confirm) return;

	setRunning(true);
	runAbortable(RUNTIME_KEY, async () => {
		const result = await def.confirm!(pendingConfirmation.input);
		appendMessage({
			role: "system",
			content: result.ok ? result.summary : result.requiresConfirmation ? result.summary : result.error,
		});
		setRunning(false);
	});
};

/** Clique em "Cancelar" — descarta a operação proposta sem chamar a API. */
export const cancelPendingAction = (): void => {
	const { pendingConfirmation, setPendingConfirmation, appendMessage } = useConfigAssistantStore.getState();
	if (!pendingConfirmation) return;
	setPendingConfirmation(null);
	appendMessage({ role: "system", content: "Ação cancelada." });
};

/** Interrompe uma rodada em curso (ex.: usuário fechou o painel no meio de uma chamada). */
export const stopAssistant = (): void => {
	cancelAdvance(RUNTIME_KEY);
	const store = useConfigAssistantStore.getState();
	store.setStreamingText("");
	store.setRunning(false);
};

/** Limpa a conversa inteira. */
export const resetAssistant = (): void => {
	cancelAdvance(RUNTIME_KEY);
	useConfigAssistantStore.getState().reset();
};
