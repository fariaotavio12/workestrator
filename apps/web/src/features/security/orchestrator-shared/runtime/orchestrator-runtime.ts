// Motor de execução orquestrada — extraído do antigo store Zustand (que misturava server state com
// runtime). Agora: config (squad/providers/scripts) é lida do cache do TanStack Query (fonte da
// verdade = servidor, um cache por recurso); runtime (efêmero, nunca persistido) mora em
// `use-orchestrator-runtime-store`; o `RunRecord` é criado no backend assim que o run começa
// (`persistRunProgress`/`ensureRunPersisted`) e atualizado incrementalmente (PUT) a cada
// passo/checkpoint/pausa — best-effort, nunca bloqueia nem aborta o run se a rede falhar. Isso é o que
// permite `continueRun` retomar um run mesmo que o app tenha fechado no meio (não só um abortado em
// memória). As funções aqui são módulo-level (não hooks) porque o runner roda destacado do componente
// que iniciou o run.
import { tanStackQueryClient } from "@/app/api/clients";
import { notify } from "@/components/toast/notify";
import { executionsKeys, fetchRunsApi, saveRunApi, updateRunApi } from "@/features/security/executions/api";
import type { ModelProvider } from "@/features/security/orchestrator-shared/types";
import { providersKeys } from "@/features/security/models/api";
import { scriptsKeys } from "@/features/security/scripts/api";
import { squadDetailKeys } from "@/features/security/squad-detail/api";
import type { SquadDetail } from "@/features/security/squad-detail/api";
import { newId, nowIso } from "../data/constants";
import type {
	Agent,
	AgentStatus,
	LiveActivityItem,
	ProviderKind,
	Runtime,
	RunEvent,
	RunRecord,
	RuntimeSnapshot,
	Script,
	SquadRuntimeStatus,
	ToolCallRecord,
} from "../types";
import { searchKnowledgeMulti } from "@/features/security/knowledge/api";
import { AGENT_TURN_INSTRUCTIONS, parseAgentTurn } from "./agent-turn";
import { buildRetrievalBlock } from "./knowledge-retrieval";
import {
	AgentCallError,
	callAgentStep,
	resetWorkspace,
	runnerAvailable,
	runStepEndpointAvailable,
	snapshotRun,
	type ScriptPayload,
} from "./model-client";
import { isApiOnlySquad } from "./squad-readiness";
import { notifyOs } from "./os-notify";
import { parseCoordinatorDecision, UNPARSEABLE_DECISION_REASON } from "./orchestrator-decision";
import { cancelAdvance, runAbortable } from "./runner-controllers";
import { idleRuntime, useOrchestratorRuntimeStore } from "../model/use-orchestrator-runtime-store";
import { useRunDialogStore } from "../model/use-run-dialog-store";

const ACTIVE_RUNTIME_STATUSES = new Set([
	"queued",
	"running",
	"checkpoint",
	"awaiting_input",
	"awaiting_auth",
	"awaiting_approval",
]);
const SLOT_RUNTIME_STATUSES = new Set(["running", "paused"]);
const MAX_CONCURRENT_RUNS = 2;
const queuedExecutionIds: string[] = [];
const queuedContinuations = new Map<string, () => void>();
const workspacePreparationByExecution = new Map<string, Promise<void>>();

/** Origem do disparo — hoje só "manual" existe de verdade; "schedule"/"onComplete" preparam o terreno
 * para o scheduler local (ver docs/plano-integracoes-e-flow-builder.md, Etapa "Scheduler local"). */
export type RunOrigin = "manual" | "schedule" | "onComplete" | "assistant";

type QaPair = { question: string; answer: string };

/** Abre o `RunDialog` global (ver `GlobalRunDialog`) — ação padrão da notificação de SO de run. */
const executionSquadIds = new Map<string, string>();
const approvedPublishExecutionIds = new Set<string>();
const resolveSquadId = (executionIdOrSquadId: string): string =>
	executionSquadIds.get(executionIdOrSquadId) ?? executionIdOrSquadId;

export const isRunActive = (squadId: string): boolean => {
	const state = useOrchestratorRuntimeStore.getState();
	return (state.runIdsBySquad[squadId] ?? []).some((runId) =>
		ACTIVE_RUNTIME_STATUSES.has(state.getRuntime(runId).status),
	);
};

const openRunDialog = (executionIdOrSquadId: string): void =>
	useRunDialogStore
		.getState()
		.openRunDialog(
			resolveSquadId(executionIdOrSquadId),
			executionSquadIds.has(executionIdOrSquadId) ? executionIdOrSquadId : undefined,
		);

let desktopRequiredNotified = false;

/**
 * Decide se este ambiente pode executar ESTE squad.
 *
 * O app desktop roda qualquer squad (tem runner local com acesso a processo). Fora dele, o run ainda
 * é possível quando o squad é 100% de providers de API (`isApiOnlySquad`) — o backend Kotlin serve
 * `POST /run-step` (`RunStepController`) em qualquer ambiente, dev ou publicado, então toda a
 * execução vira request HTTP e nada depende de binário instalado na máquina.
 *
 * Squad com provider de CLI (claude/codex/gpt) continua exigindo o desktop: o binário precisa existir
 * e estar autenticado do lado de quem executa, e isso o backend não tem como fazer por ele.
 */
const requireRunner = (squadId: string): boolean => {
	if (runnerAvailable()) return true;

	const squad = getSquadConfig(squadId);
	const providers = tanStackQueryClient.getQueryData<ModelProvider[]>(providersKeys.list()) ?? [];
	const apiOnly = squad !== undefined && isApiOnlySquad(squad, providers);
	if (runStepEndpointAvailable() && apiOnly) return true;

	if (!desktopRequiredNotified) {
		desktopRequiredNotified = true;
		notify.warning(
			"Execução disponível no app desktop",
			"Este squad usa provider de CLI local (Claude/Codex/GPT), que só roda no app desktop. Squads que usam apenas providers de API rodam direto no navegador.",
			{
				label: "Baixar desktop",
				onClick: () => {
					window.location.assign("/download");
				},
			},
		);
	}
	return false;
};

const truncate = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const toScriptPayload = (script: Script, authRefOverride?: string): ScriptPayload => ({
	id: script.id,
	name: script.name,
	description: script.description,
	kind: script.kind,
	command: script.command,
	args: script.args,
	language: script.language,
	content: script.content,
	path: script.path,
	method: script.method,
	urlTemplate: script.urlTemplate,
	headers: script.headers,
	bodySchema: script.bodySchema,
	responseMap: script.responseMap,
	transport: script.transport,
	url: script.url,
	env: script.env,
	toolAllowlist: script.toolAllowlist,
	connectorProvider: script.connectorProvider,
	config: script.config,
	authRef: authRefOverride ?? script.authRef,
});

// --- Leitura de config (servidor), um cache por recurso ---

const getSquadConfig = (squadId: string): SquadDetail | undefined =>
	tanStackQueryClient.getQueryData<SquadDetail>(squadDetailKeys.detail(resolveSquadId(squadId)));

const getProvider = (providerId: string): ModelProvider | undefined =>
	tanStackQueryClient.getQueryData<ModelProvider[]>(providersKeys.list())?.find((p) => p.id === providerId);

const getScript = (scriptId: string): Script | undefined =>
	tanStackQueryClient.getQueryData<Script[]>(scriptsKeys.list())?.find((s) => s.id === scriptId);

const getRuntime = (squadId: string): Runtime => useOrchestratorRuntimeStore.getState().getRuntime(squadId);

const setRuntime = (squadId: string, runtime: Runtime): void =>
	useOrchestratorRuntimeStore.getState().setRuntime(squadId, runtime);

const patchRuntime = (squadId: string, patch: (runtime: Runtime) => Runtime): void =>
	useOrchestratorRuntimeStore.getState().patchRuntime(squadId, patch);

// --- Histórico (RunRecord): fica em memória enquanto roda; persistido no backend desde o início
// (`ensureRunPersisted`) e atualizado incrementalmente (`persistRunProgress`) — best-effort. ---

const activeRuns = new Map<string, RunRecord>();

const snapshotAuthBindings = (squad: SquadDetail): NonNullable<RunRecord["authBindingsSnapshot"]> =>
	squad.agents.flatMap((agent) => (agent.authBindings ?? []).map((binding) => ({ ...binding, agentId: agent.id })));

const activeRun = (squadId: string): RunRecord | undefined => activeRuns.get(squadId);

const patchRun = (squadId: string, patch: (run: RunRecord) => RunRecord): void => {
	const existing = activeRuns.get(squadId);
	if (!existing) return;
	activeRuns.set(squadId, patch(existing));
};

/** Id real do run no backend, por squad — só existe enquanto o run está ativo (mesmo ciclo de vida de
 * `activeRuns`). Necessário porque o backend gera seu próprio id (diferente do `newId()` local). */
const persistedRunIds = new Map<string, string>();
/** Evita criar o run duas vezes no backend se `persistRunProgress` for chamado de novo antes do
 * primeiro POST resolver (ex.: dois passos rápidos em sequência). */
const runCreationInFlight = new Map<string, Promise<string | undefined>>();

/** Cria o registro do run no backend assim que ele começa a rodar — dali em diante, `persistRunProgress`
 * usa PUT no id retornado. Idempotente/best-effort: nunca lança; se a rede falhar, o run segue só em
 * memória (como sempre foi) e a persistência incremental fica indisponível pra esse run. */
const ensureRunPersisted = (squadId: string): Promise<string | undefined> => {
	const existingId = persistedRunIds.get(squadId);
	if (existingId) return Promise.resolve(existingId);
	const inFlight = runCreationInFlight.get(squadId);
	if (inFlight) return inFlight;

	const run = activeRuns.get(squadId);
	if (!run) return Promise.resolve(undefined);

	const realSquadId = resolveSquadId(squadId);
	const creation = saveRunApi(realSquadId, {
		input: run.input,
		startedAt: run.startedAt,
		endedAt: run.endedAt,
		status: run.status,
		steps: run.steps,
		qaLog: run.qaLog,
		resumedFromRunId: run.resumedFromRunId,
		runtimeSnapshot: run.runtimeSnapshot,
		authBindingsSnapshot: run.authBindingsSnapshot,
	})
		.then((saved) => {
			persistedRunIds.set(squadId, saved.id);
			return saved.id as string | undefined;
		})
		.catch(() => undefined)
		.finally(() => runCreationInFlight.delete(squadId));

	runCreationInFlight.set(squadId, creation);
	return creation;
};

/**
 * Persiste o progresso do run ativo no backend (best-effort, fire-and-forget) — chamada a cada passo
 * concluído, ao entrar em checkpoint/pergunta pendente, e ao pausar. `snapshot` é o estado pendente
 * atual (`null` quando não há nada pendente); vira `Run.runtimeSnapshot`, usado por `continueRun` pra
 * restaurar o checkpoint/pergunta exatos se o app fechar no meio da execução.
 */
const persistRunProgress = (squadId: string, snapshot: RuntimeSnapshot | null): void => {
	if (!activeRuns.has(squadId)) return;
	void (async () => {
		const runId = await ensureRunPersisted(squadId);
		if (!runId) return;
		// Relê o run no momento do PUT (não no momento do agendamento) — outro passo pode ter
		// avançado enquanto `ensureRunPersisted` resolvia.
		const latest = activeRuns.get(squadId);
		if (!latest) return;
		try {
			await updateRunApi(resolveSquadId(squadId), runId, {
				status: latest.status,
				endedAt: latest.endedAt,
				steps: latest.steps,
				qaLog: latest.qaLog,
				runtimeSnapshot: snapshot,
			});
		} catch {
			// Best-effort — falha de rede aqui não deve travar/abortar a execução em andamento.
		}
	})();
};

const persistFinishedRun = (squadId: string, status: "done" | "aborted"): void => {
	const run = activeRuns.get(squadId);
	if (!run) return;
	activeRuns.delete(squadId);
	const endedAt = nowIso();
	const existingId = persistedRunIds.get(squadId);
	persistedRunIds.delete(squadId);
	runCreationInFlight.delete(squadId);

	void (async () => {
		const realSquadId = resolveSquadId(squadId);
		// Garante o id do backend ANTES do snapshot — a pasta `.runs/<id>` é nomeada por ele, então o
		// histórico consegue reabrir os arquivos depois. Sem backend (offline), segue só com o manifesto.
		let runId = existingId;
		if (!runId) {
			try {
				const saved = await saveRunApi(realSquadId, {
					input: run.input,
					startedAt: run.startedAt,
					endedAt,
					status,
					steps: run.steps,
					qaLog: run.qaLog,
					resumedFromRunId: run.resumedFromRunId,
					runtimeSnapshot: null,
					authBindingsSnapshot: run.authBindingsSnapshot,
				});
				runId = saved.id;
			} catch {
				// POST falhou — sem id do backend não dá pra snapshotar/persistir; encerra silenciosamente.
				notify.error("Falha ao salvar o histórico da execução.");
				return;
			}
		}

		// Snapshot dos arquivos gerados (best-effort, nunca lança) — vira `RunRecord.files`.
		const files = await snapshotRun(runId, squadId);

		try {
			await updateRunApi(realSquadId, runId, {
				status,
				endedAt,
				steps: run.steps,
				qaLog: run.qaLog,
				runtimeSnapshot: null,
				files: files.length > 0 ? files : null,
			});
			await tanStackQueryClient.invalidateQueries({ queryKey: executionsKeys.bySquad(realSquadId) });
		} catch {
			notify.error("Falha ao salvar o histórico da execução.");
		}
	})();
};

// --- Helpers de runtime ---

const appendLog = (squadId: string, line: string): void => {
	patchRuntime(squadId, (runtime) => ({ ...runtime, log: [...runtime.log, line] }));
};

/** Anexa um evento estruturado ao timeline da execução — fonte do transcript ao vivo. */
const appendEvent = (squadId: string, event: Omit<RunEvent, "id" | "createdAt">): void => {
	patchRuntime(squadId, (runtime) => ({
		...runtime,
		events: [...runtime.events, { ...event, id: newId(), createdAt: nowIso() }],
	}));
};

const setPerAgentStatus = (squadId: string, seatId: string, status: AgentStatus): void => {
	patchRuntime(squadId, (runtime) => ({
		...runtime,
		perAgentStatus: { ...runtime.perAgentStatus, [seatId]: status },
	}));
};

const setStreamingText = (squadId: string, text: string | null): void => {
	patchRuntime(squadId, (runtime) => ({ ...runtime, streamingText: text }));
};

/** Zera a atividade ao vivo (pensamento/ferramentas/terminal) — no começo de cada passo. */
const clearLiveActivity = (squadId: string): void => {
	patchRuntime(squadId, (runtime) => ({ ...runtime, liveActivity: [], liveTerminal: "" }));
};

const pushLiveActivity = (squadId: string, item: LiveActivityItem): void => {
	patchRuntime(squadId, (runtime) => ({ ...runtime, liveActivity: [...runtime.liveActivity, item] }));
};

/** Atualiza um item de atividade pelo `id` (ex.: ferramenta rodando → concluída/erro). */
const updateLiveActivity = (squadId: string, id: string, patch: Partial<LiveActivityItem>): void => {
	patchRuntime(squadId, (runtime) => ({
		...runtime,
		liveActivity: runtime.liveActivity.map((item) => (item.id === id ? { ...item, ...patch } : item)),
	}));
};

const appendLiveTerminal = (squadId: string, chunk: string): void => {
	patchRuntime(squadId, (runtime) => ({ ...runtime, liveTerminal: runtime.liveTerminal + chunk }));
};

/** Registra uma chamada de ferramenta no log do run inteiro (painel de debug) — não limpa por passo. */
const pushToolCall = (squadId: string, record: ToolCallRecord): void => {
	patchRuntime(squadId, (runtime) => ({ ...runtime, toolLog: [...runtime.toolLog, record] }));
};

/** Fecha o registro de uma chamada pelo `id` quando o resultado chega (output/status/fim). */
const closeToolCall = (squadId: string, id: string, patch: Partial<ToolCallRecord>): void => {
	patchRuntime(squadId, (runtime) => ({
		...runtime,
		toolLog: runtime.toolLog.map((call) => (call.id === id ? { ...call, ...patch } : call)),
	}));
};

/** Fecha o último registro ainda "running" — resultado sem id pareável (provider em modo texto). */
const closeLastRunningToolCall = (squadId: string, patch: Partial<ToolCallRecord>): void => {
	patchRuntime(squadId, (runtime) => {
		let idx = -1;
		for (let i = runtime.toolLog.length - 1; i >= 0; i--) {
			if (runtime.toolLog[i].status === "running") {
				idx = i;
				break;
			}
		}
		if (idx === -1) return runtime;
		const toolLog = [...runtime.toolLog];
		toolLog[idx] = { ...toolLog[idx], ...patch };
		return { ...runtime, toolLog };
	});
};

/** Liga/desliga "coordenador decidindo" — move o foco no mapa do run e mata o buraco de percepção. */
const setCoordinatorThinking = (squadId: string, thinking: boolean): void => {
	patchRuntime(squadId, (runtime) => ({ ...runtime, coordinatorThinking: thinking }));
};

/** Fecha o run ativo do squad e resolve o `runtime.status` final. */
const finishRun = (squadId: string, status: "done" | "aborted"): void => {
	persistFinishedRun(squadId, status);
	patchRuntime(squadId, (runtime) => ({
		...runtime,
		status: status === "done" ? "completed" : "aborted",
		streamingText: null,
		pendingQuestion: null,
		pendingQaHistory: [],
		coordinatorThinking: false,
		stepStartedAt: null,
	}));

	// Só notifica conclusão com sucesso aqui — os caminhos de "aborted" já notificam no ponto exato da
	// falha (mensagem específica), então repetir um genérico aqui duplicaria o aviso (ver Etapa 4.5).
	// Só via notificação de SO (nunca toast in-app): o `RunDialog`/log já mostram isso ao vivo pra quem
	// está com a janela em foco — o toast só duplicava informação que o usuário já está vendo.
	if (status === "done") {
		const squadName = getSquadConfig(squadId)?.name ?? "Squad";
		notifyOs("Execução concluída", squadName, () => openRunDialog(squadId));
	}
	queueMicrotask(drainRunQueue);
};

const buildAgentPrompt = (
	agentName: string,
	agentRole: string,
	context: {
		briefing: string;
		previousOutput?: string;
		qaHistory?: QaPair[];
		scripts?: Script[];
		retrieval?: string;
		providerKind?: ProviderKind;
	},
): string => {
	const source = context.previousOutput
		? `Isto é o que o passo anterior produziu:\n"""\n${context.previousOutput}\n"""`
		: `Este é o briefing inicial do usuário:\n"""\n${context.briefing}\n"""`;
	// Contexto recuperado das bases de conhecimento do agent (RAG), com orçamento de tokens fixo.
	const retrievalBlock = context.retrieval ? `\n\n${context.retrieval}` : "";
	const qaBlock =
		context.qaHistory && context.qaHistory.length > 0
			? `\n\nVocê já perguntou isso ao usuário nesse mesmo turno:\n${context.qaHistory
					.map((qa) => `P: ${qa.question}\nR: ${qa.answer}`)
					.join("\n\n")}`
			: "";
	// command/inline/file rodam via Bash/Read/Write/Edit da CLI local. Providers HTTP (openai,
	// openai-compat/Ollama) não têm esse canal — lá o runner só expõe ferramentas de rede como
	// function tools (ver `resolveOpenAiTools`). Anunciar execução local pra eles instrui o agent a
	// usar uma capacidade que o transporte não entrega: ele gasta o turno tentando e não fecha o
	// passo, e o coordenador redispacha em loop.
	const supportsLocalExecution = context.providerKind !== "openai" && context.providerKind !== "openai-compat";
	const executableScripts = (supportsLocalExecution ? (context.scripts ?? []) : []).filter(
		(s): s is Script & { kind: "command" | "inline" | "file" } =>
			s.kind === "command" || s.kind === "inline" || s.kind === "file",
	);
	const scriptsBlock =
		executableScripts.length > 0
			? `\n\nVocê pode executar comandos e criar arquivos numa pasta de trabalho. Scripts já disponíveis:\n${executableScripts
					.map((s) => {
						const how =
							s.kind === "command"
								? `rode com: ${[s.command, ...(s.args ?? [])].join(" ")}`
								: s.kind === "file"
									? `arquivo/diretório em ${s.path}`
									: `arquivo em scripts/${s.name}`;
						return `- ${s.name}${s.description ? ` — ${s.description}` : ""} (${how})`;
					})
					.join("\n")}\nVocê também pode criar novos scripts na pasta \`scripts/\` se precisar.`
			: "";
	// mcp/http/connector viram tools MCP de verdade plugadas na CLI pelo runner (Etapa 3) — só
	// precisam ser mencionadas por nome pro agent saber que existem; a CLI já lista as tools MCP
	// disponíveis separadamente, então não precisa de instrução de "como rodar" igual aos scripts locais.
	const integrationScripts = (context.scripts ?? []).filter(
		(s) => s.kind === "mcp" || s.kind === "http" || s.kind === "connector",
	);
	const integrationsBlock =
		integrationScripts.length > 0
			? `\n\nVocê também tem acesso a estas ferramentas de integração (aparecem como tools MCP):\n${integrationScripts
					.map((s) => `- ${s.name}${s.description ? ` — ${s.description}` : ""}`)
					.join("\n")}`
			: "";
	return `Você é ${agentName}, ${agentRole}. ${source}${retrievalBlock}${qaBlock}${scriptsBlock}${integrationsBlock}\n\nExecute sua parte da tarefa e responda só com o resultado, sem explicações extras.`;
};

/**
 * Recupera contexto das bases de conhecimento anexadas ao agent (RAG). Best-effort: qualquer falha na
 * busca vira contexto vazio — nunca derruba o run. Query = saída do passo anterior ou o briefing.
 */
const retrieveAgentContext = async (agent: Agent, query: string): Promise<string> => {
	const collectionIds = agent.knowledgeCollectionIds ?? [];
	if (collectionIds.length === 0 || !query.trim()) return "";
	try {
		const chunks = await searchKnowledgeMulti(collectionIds, query);
		return buildRetrievalBlock(chunks);
	} catch {
		return "";
	}
};

/**
 * Orçamento de caracteres pro histórico dentro do prompt do coordenador. A CLI local (Windows) roda
 * via `cmd.exe` (shim `.cmd` do npm), sujeito ao limite clássico de ~8191 caracteres por linha de
 * comando — sem teto aqui, o histórico concatena o conteúdo INTEIRO de todo artifact já produzido, a
 * cada passo, e cresce sem limite pelo resto do run (pior ainda em "Continuar de onde parou", que
 * reconstrói a partir de todos os passos anteriores de uma vez). Isso derruba o coordenador com
 * "Linha de comando muito longa" (erro do próprio Windows) em runs longos ou com artifacts grandes
 * (ex.: HTML de slides de um carrossel).
 */
const COORDINATOR_HISTORY_CHAR_BUDGET = 4000;

/**
 * Monta o histórico de passos já produzidos, do mais recente pro mais antigo, empilhando enquanto
 * couber no orçamento — o coordenador precisa sobretudo do que aconteceu por último pra decidir o
 * próximo passo. Passos mais antigos que não couberem são omitidos com um aviso explícito (nunca
 * silenciosamente). O passo mais recente sempre entra, mesmo que sozinho já estoure o orçamento
 * (truncado) — o coordenador nunca fica sem nenhum contexto.
 */
export const buildCoordinatorHistory = (steps: RunRecord["steps"], agentNames?: Map<string, string>): string => {
	const entries = steps
		.map((step, index) => (step.artifact ? { index, content: step.artifact.content, agentId: step.agentId } : null))
		.filter((entry): entry is { index: number; content: string; agentId: string | undefined } => Boolean(entry));

	const kept: string[] = [];
	let used = 0;
	let omitted = 0;
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		// Cabeçalho com o nome do agente (quando disponível) — deixa o coordenador referenciar o passo
		// certo em `context_steps` sem precisar ler o conteúdo inteiro.
		const name = entry.agentId ? agentNames?.get(entry.agentId) : undefined;
		let text = `Passo ${entry.index + 1}${name ? ` — ${name}` : ""}:\n${entry.content}`;
		if (kept.length === 0 && text.length > COORDINATOR_HISTORY_CHAR_BUDGET) {
			text = `${text.slice(0, COORDINATOR_HISTORY_CHAR_BUDGET)}\n[conteúdo truncado por espaço]`;
		} else if (used + text.length > COORDINATOR_HISTORY_CHAR_BUDGET) {
			omitted++;
			continue;
		}
		kept.unshift(text);
		used += text.length;
	}

	const omittedNote = omitted > 0 ? `[${omitted} passo(s) mais antigo(s) omitido(s) por espaço]\n\n` : "";
	return omittedNote + kept.join("\n\n");
};

const RUN_HISTORY_MAX_RUNS = 5;
const RUN_HISTORY_CHAR_BUDGET = 1500;
const RUN_HISTORY_BRIEFING_CHARS = 140;
const RUN_HISTORY_RESULT_CHARS = 200;

/**
 * Resumo das execuções anteriores do squad (uma linha por run: data + briefing + resultado do último
 * passo, truncados), do mais recente pro mais antigo até o orçamento acabar. Alimenta o prompt do
 * coordenador quando `orchestrator.useRunHistory` está ligado, pra ele evitar repetir temas/decisões.
 */
export const buildRunHistorySummary = (runs: RunRecord[]): string => {
	const oneLine = (s: string, max: number): string => {
		const flat = s.replace(/\s+/g, " ").trim();
		return flat.length > max ? `${flat.slice(0, max)}…` : flat;
	};
	const past = runs
		.filter((r) => r.status === "done" || r.status === "aborted" || r.status === "failed")
		.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
		.slice(0, RUN_HISTORY_MAX_RUNS);

	const lines: string[] = [];
	let used = 0;
	for (const run of past) {
		const date = new Date(run.startedAt).toLocaleDateString("pt-BR");
		const briefing = oneLine(run.input, RUN_HISTORY_BRIEFING_CHARS);
		const lastArtifact = [...run.steps].reverse().find((s) => s.artifact)?.artifact?.content;
		const result = lastArtifact ? ` → ${oneLine(lastArtifact, RUN_HISTORY_RESULT_CHARS)}` : "";
		const line = `- ${date}: "${briefing}"${result}`;
		if (used + line.length > RUN_HISTORY_CHAR_BUDGET) break;
		lines.push(line);
		used += line.length;
	}
	return lines.join("\n");
};

/** Resumo dos runs anteriores por squad — carregado no início do run (best-effort), lido pelo prompt. */
const runHistorySummaries = new Map<string, string>();

/** Busca os runs anteriores do squad e guarda o resumo pra este run. Best-effort: falha vira histórico vazio. */
const loadRunHistorySummary = async (squadId: string): Promise<void> => {
	try {
		const summary = buildRunHistorySummary(await fetchRunsApi(resolveSquadId(squadId)));
		if (summary) runHistorySummaries.set(squadId, summary);
		else runHistorySummaries.delete(squadId);
	} catch {
		runHistorySummaries.delete(squadId);
	}
};

/**
 * Prepara o resumo do histórico conforme a flag `useRunHistory` do squad — carrega (best-effort) quando
 * ligada, limpa quando desligada. Compartilhado por `startRun`/`continueRun`/`retryLastStep`/`resumeRun`
 * pra todos acionarem o coordenador já com (ou sem) o contexto das execuções anteriores. Nunca lança.
 */
const prepareRunHistory = (squadId: string, squad: SquadDetail): Promise<void> => {
	if (!squad.orchestrator.useRunHistory) {
		runHistorySummaries.delete(squad.id);
		return Promise.resolve();
	}
	return loadRunHistorySummary(resolveSquadId(squadId));
};

const normalizeAgentKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const parseReviewContextSteps = (content: string, reviewStepNumber: number): number[] => {
	const jsonContext = content.match(/"requiredContextSteps"\s*:\s*\[([^\]]+)\]/i)?.[1];
	const textContext = content.match(/context_steps\s*=\s*\[?([0-9,\s]+)\]?/i)?.[1];
	const raw = jsonContext ?? textContext;
	const parsed = raw
		? raw
				.split(",")
				.map((value) => Number(value.trim()))
				.filter((value) => Number.isInteger(value) && value > 0 && value <= reviewStepNumber)
		: [];
	const fallback = reviewStepNumber > 1 ? [1, reviewStepNumber] : [reviewStepNumber];
	return [...new Set(parsed.length > 0 ? [...parsed, reviewStepNumber] : fallback)];
};

const findPendingReviewOwner = (
	squad: SquadDetail | undefined,
	steps: RunRecord["steps"],
): { target: string; contextSteps: number[]; ownerLabel: string } | null => {
	if (!squad) return null;
	for (let index = steps.length - 1; index >= 0; index -= 1) {
		const content = steps[index]?.artifact?.content ?? "";
		if (!/REVIEW_CHANGES|changes_requested/i.test(content)) continue;
		const owner =
			content.match(/REVIEW_CHANGES\s+owner\s*=\s*"?([^"\s,;]+)/i)?.[1] ??
			content.match(/"ownerSeatId"\s*:\s*"([^"]+)"/i)?.[1] ??
			content.match(/"ownerAgentId"\s*:\s*"([^"]+)"/i)?.[1] ??
			content.match(/"owner"\s*:\s*"([^"]+)"/i)?.[1];
		if (!owner) return null;
		const ownerKey = normalizeAgentKey(owner);
		const seatById = squad.seats.find((seat) => normalizeAgentKey(seat.id) === ownerKey && seat.agentId);
		if (seatById)
			return { target: seatById.id, contextSteps: parseReviewContextSteps(content, index + 1), ownerLabel: owner };
		const agent = squad.agents.find((candidate) => {
			const nameKey = normalizeAgentKey(candidate.name);
			const idKey = normalizeAgentKey(candidate.id);
			return nameKey === ownerKey || idKey === ownerKey;
		});
		const seatForAgent = agent ? squad.seats.find((seat) => seat.agentId === agent.id) : undefined;
		return seatForAgent
			? { target: seatForAgent.id, contextSteps: parseReviewContextSteps(content, index + 1), ownerLabel: owner }
			: null;
	}
	return null;
};

/** Monta o contexto que o coordenador vê: briefing, agents sentados disponíveis e o que já rodou. */
const buildCoordinatorPrompt = (squad: SquadDetail, run: RunRecord, briefing: string): string => {
	const seatOptions = squad.seats
		.map((seat) => {
			const seatAgent = seat.agentId ? squad.agents.find((a) => a.id === seat.agentId) : undefined;
			return seatAgent ? `- seatId "${seat.id}": ${seatAgent.name} (${seatAgent.role})` : null;
		})
		.filter((line): line is string => Boolean(line))
		.join("\n");

	const agentNames = new Map(squad.agents.map((a) => [a.id, a.name]));
	const history = buildCoordinatorHistory(run.steps, agentNames);
	const runHistory = squad.orchestrator.useRunHistory ? runHistorySummaries.get(squad.id) : undefined;

	return [
		`Briefing inicial: "${briefing}"`,
		"",
		"Agents disponíveis (cadeiras ocupadas):",
		seatOptions || "(nenhum agent sentado)",
		"",
		...(runHistory
			? [`Execuções anteriores deste squad (evite repetir os temas/decisões abaixo):\n${runHistory}`, ""]
			: []),
		history ? `Histórico do que já foi produzido:\n${history}` : "Ainda não rodou nenhum passo.",
		"",
		// Instrução deliberadamente rígida: CLIs agênticos (Codex/gpt) tendem a explorar o disco, pedir mais
		// contexto ou responder em prosa. Todo o contexto necessário já está acima — a saída precisa ser só o JSON.
		"REGRAS DE RESPOSTA (obrigatórias):",
		"- NÃO use ferramentas, NÃO leia arquivos, NÃO explore diretórios, NÃO peça mais informações.",
		"- Todo o contexto necessário já está acima. Se nenhum passo rodou ainda, escolha o primeiro agent adequado para começar.",
		"- Sua resposta deve conter APENAS um objeto JSON, sem nenhum outro texto, sem markdown, sem ```.",
		'- Formato: {"next": "<seatId>", "context_steps": [<números de passos>], "reason": "<motivo curto>"} para acionar um agent,',
		'  ou {"next": "done", "reason": "<motivo>"} quando a tarefa estiver completa.',
		'- "context_steps": os NÚMEROS dos passos do histórico acima cujo conteúdo o agente escolhido precisa para',
		"  trabalhar (ex.: o roteiro, a lista de imagens). Escolha pelo PAPEL do agente. Use [] se ele não precisar de",
		"  nenhum passo anterior. O sistema entrega o conteúdo COMPLETO desses passos ao agente — você não precisa copiá-lo.",
		'- Use exatamente um dos seatId listados acima (o valor entre aspas após "seatId"), não o nome do agent.',
		'Exemplo de resposta válida: {"next": "' +
			(squad.seats.find((s) => s.agentId)?.id ?? "seat-id") +
			'", "context_steps": [2], "reason": "revisar o roteiro do passo 2"}',
	].join("\n");
};

/** Registra o artefato do agent escolhido pelo coordenador e volta a perguntar o próximo passo. */
const completeOrchestratedStep = (
	squadId: string,
	stepId: string,
	seatId: string,
	content: string,
	publicationAlreadyApproved = false,
): void => {
	if (getRuntime(squadId).status !== "running") return;

	const squad = getSquadConfig(squadId);
	const seat = squad?.seats.find((s) => s.id === seatId);
	const agent = seat?.agentId ? squad?.agents.find((a) => a.id === seat.agentId) : undefined;

	patchRun(squadId, (r) => ({
		...r,
		steps: [
			...r.steps,
			{ stepId, agentId: agent?.id, seatId, artifact: { stepId, kind: "text" as const, content, createdAt: nowIso() } },
		],
	}));
	appendLog(squadId, content);
	appendEvent(squadId, { kind: "agent", seatId, agentId: agent?.id, title: agent?.name ?? "Agent", content });
	setPerAgentStatus(squadId, seatId, "done");
	patchRuntime(squadId, (runtime) => ({ ...runtime, currentStep: runtime.currentStep + 1 }));
	persistRunProgress(squadId, null);

	const requiresPublicationApproval =
		!publicationAlreadyApproved &&
		agent?.scriptIds.some((scriptId) => getScript(scriptId)?.connectorProvider === "instagram");
	if (agent && ((!publicationAlreadyApproved && agent.requiresCheckpointAfter) || requiresPublicationApproval)) {
		patchRuntime(squadId, (r) => ({
			...r,
			status: "checkpoint",
			pendingSeatId: seatId,
			pendingCheckpointKind: "after",
		}));
		appendLog(squadId, `Checkpoint: aprovação necessária antes de seguir depois de ${agent.name}.`);
		appendEvent(squadId, {
			kind: "checkpoint",
			seatId,
			agentId: agent.id,
			title: `Aprovação necessária antes de seguir depois de ${agent.name}`,
		});
		notifyOs("Aprovação necessária", `Antes de seguir depois de ${agent.name}`, () => openRunDialog(squadId));
		persistRunProgress(squadId, {
			currentStep: getRuntime(squadId).currentStep,
			pendingSeatId: seatId,
			pendingCheckpointKind: "after",
			pendingQuestion: null,
		});
		queueMicrotask(drainRunQueue);
		return;
	}

	advanceOrchestrated(squadId);
};

/**
 * Chama de verdade o provider configurado no agent escolhido pelo coordenador. `qaHistory` carrega
 * as perguntas já respondidas nesse mesmo turno (o agent pode perguntar mais de uma vez antes de
 * finalizar). Se a resposta for uma pergunta (ver `runtime/agent-turn.ts`), pausa em vez de concluir.
 */
const runOrchestratedAgentStep = (
	squadId: string,
	seatId: string,
	agent: Agent,
	briefing: string,
	qaHistory: QaPair[] = [],
	/** Passos (1-based) que o coordenador escolheu como contexto deste agente; vazio/ausente = só o passo anterior. */
	contextSteps?: number[],
): void => {
	const provider = getProvider(agent.modelRef.providerId);
	if (!provider) {
		appendLog(squadId, `Erro em ${agent.name}: provider "${agent.modelRef.providerId}" não está mais cadastrado.`);
		appendEvent(squadId, {
			kind: "error",
			seatId,
			agentId: agent.id,
			title: `Erro em ${agent.name}`,
			content: `Provider "${agent.modelRef.providerId}" não está mais cadastrado.`,
		});
		notify.error("Provider do agent não foi encontrado.");
		finishRun(squadId, "aborted");
		return;
	}

	setPerAgentStatus(squadId, seatId, "working");
	setStreamingText(squadId, "");
	clearLiveActivity(squadId);
	// Agente assumiu: coordenador não está mais decidindo; marca o início do passo (cronômetro ao vivo).
	patchRuntime(squadId, (runtime) => ({ ...runtime, coordinatorThinking: false, stepStartedAt: nowIso() }));
	const run = activeRun(squadId);
	// Contexto do agente: os passos que o coordenador citou em `context_steps` (conteúdo completo, montado
	// aqui pelo runtime — não pelo LLM), com fallback pro passo anterior quando ele não citar nada.
	const steps = run?.steps ?? [];
	const selectedContext = (contextSteps ?? [])
		.map((n) => {
			const content = steps[n - 1]?.artifact?.content;
			return content ? `Passo ${n}:\n${content}` : null;
		})
		.filter((c): c is string => Boolean(c));
	const previousOutput = selectedContext.length > 0 ? selectedContext.join("\n\n") : steps.at(-1)?.artifact?.content;
	const stepId = newId();
	const scripts = agent.scriptIds.map((id) => getScript(id)).filter((s): s is Script => Boolean(s));
	const hasInstagramPublisher = scripts.some((script) => script.connectorProvider === "instagram");
	const publicationApproved = approvedPublishExecutionIds.has(squadId) && hasInstagramPublisher;
	// Ferramentas de rede (http/mcp/connector) não tocam a máquina — o runner as resolve como function
	// tools mesmo em provider de API. Só command/inline/file dependem de `canExecute` (execução local).
	const isNetworkScript = (s: Script): boolean => s.kind === "http" || s.kind === "mcp" || s.kind === "connector";
	const availableScripts = scripts.filter((s) => isNetworkScript(s) || agent.canExecute);

	runAbortable(squadId, async (signal) => {
		try {
			await workspacePreparationByExecution.get(squadId)?.catch(() => undefined);
			const retrieval = await retrieveAgentContext(agent, previousOutput ?? briefing);
			const result = await callAgentStep(
				{
					executionId: squadId,
					systemPrompt: `${agent.systemPrompt}${AGENT_TURN_INSTRUCTIONS}${
						publicationApproved
							? "\n\nA publicação deste run foi aprovada pelo usuário. Execute agora a ferramenta Instagram com dryRun:false e a mesma chave de idempotência retornada no dry run."
							: hasInstagramPublisher
								? "\n\nAntes de qualquer publicação no Instagram, execute apenas o dry run com dryRun:true e devolva o preview/resultado para aprovação. dryRun:false está bloqueado até o usuário aprovar o checkpoint."
								: ""
					}`,
					prompt: buildAgentPrompt(agent.name, agent.role, {
						briefing,
						previousOutput,
						qaHistory,
						scripts: availableScripts.length > 0 ? availableScripts : undefined,
						retrieval,
						providerKind: provider.kind,
					}),
					model: agent.modelRef.model,
					providerKind: provider.kind,
					baseUrl: provider.baseUrl,
					apiKeyRef: provider.apiKeyRef,
					canExecute: agent.canExecute,
					scripts:
						availableScripts.length > 0
							? availableScripts.map((script) => {
									const binding =
										run?.authBindingsSnapshot?.find(
											(item) => item.agentId === agent.id && item.scriptId === script.id && item.isDefault,
										) ?? agent.authBindings?.find((item) => item.scriptId === script.id && item.isDefault);
									const payload = toScriptPayload(script, binding?.connectionId);
									return publicationApproved && script.connectorProvider === "instagram"
										? {
												...payload,
												env: {
													...payload.env,
													WORKESTRATOR_PUBLISH_APPROVED: "true",
													WORKESTRATOR_RUN_ID: squadId,
												},
											}
										: payload;
								})
							: undefined,
					maxBudgetUsd: agent.maxBudgetUsd,
				},
				signal,
				(chunk) => {
					patchRuntime(squadId, (runtime) => ({
						...runtime,
						streamingText: (runtime.streamingText ?? "") + chunk,
					}));
				},
				{
					onThinking: (text) => pushLiveActivity(squadId, { id: newId(), kind: "thinking", detail: text }),
					onActivity: (activity) => {
						if (activity.kind === "tool" && activity.status === "running") {
							// Início de uma ferramenta — item novo, status "running" (fecha no tool_result pelo id).
							const id = activity.id ?? newId();
							pushLiveActivity(squadId, {
								id,
								kind: "tool",
								toolName: activity.toolName,
								detail: activity.detail,
								status: "running",
							});
							pushToolCall(squadId, {
								id,
								seatId,
								agentId: agent.id,
								toolName: activity.toolName ?? "ferramenta",
								input: activity.detail,
								status: "running",
								startedAt: nowIso(),
							});
						} else if (activity.id) {
							// Resultado de uma ferramenta já listada — fecha o status pelo id.
							updateLiveActivity(squadId, activity.id, { status: activity.status ?? "done" });
							closeToolCall(squadId, activity.id, {
								output: truncate(activity.detail ?? "", 8000),
								status: activity.status ?? "done",
								endedAt: nowIso(),
								sentHeaders: activity.sentHeaders,
							});
						} else {
							// Resultado sem id pareável (provider em modo texto) — vira uma linha de saída solta.
							pushLiveActivity(squadId, {
								id: newId(),
								kind: "output",
								detail: activity.detail,
								status: activity.status ?? "done",
							});
							closeLastRunningToolCall(squadId, {
								output: truncate(activity.detail ?? "", 8000),
								status: activity.status ?? "done",
								endedAt: nowIso(),
							});
						}
					},
					onTerminal: (text) => appendLiveTerminal(squadId, text),
				},
			);
			setStreamingText(squadId, null);

			const turn = parseAgentTurn(result.output);
			if (turn.kind === "question") {
				patchRuntime(squadId, (runtime) => ({
					...runtime,
					status: "awaiting_input",
					pendingSeatId: seatId,
					pendingQuestion: { seatId, question: turn.question, options: turn.options },
					pendingQaHistory: qaHistory,
				}));
				appendLog(squadId, `${agent.name} perguntou: ${turn.question}`);
				appendEvent(squadId, {
					kind: "question",
					seatId,
					agentId: agent.id,
					title: `${agent.name} perguntou`,
					content: turn.question,
				});
				// Caso prioritário da notificação de SO — é o que mais trava um run sem o usuário perceber.
				// Só via SO (sem toast in-app): o `RunDialog` já mostra a pergunta pendente pra quem está olhando.
				notifyOs(`${agent.name} precisa da sua resposta`, truncate(turn.question, 140), () => openRunDialog(squadId));
				persistRunProgress(squadId, {
					currentStep: getRuntime(squadId).currentStep,
					pendingSeatId: seatId,
					pendingCheckpointKind: null,
					pendingQuestion: { seatId, question: turn.question, options: turn.options },
				});
				queueMicrotask(drainRunQueue);
				return;
			}

			const prefix = result.usedFallbackModel
				? `[modelo "${agent.modelRef.model}" indisponível no provider "${provider.label}" — usado o padrão]\n`
				: "";
			if (publicationApproved) approvedPublishExecutionIds.delete(squadId);
			completeOrchestratedStep(squadId, stepId, seatId, `${prefix}${turn.content}`, publicationApproved);
		} catch (err) {
			if (publicationApproved) approvedPublishExecutionIds.delete(squadId);
			if (signal.aborted) return;
			setStreamingText(squadId, null);
			const message = err instanceof AgentCallError ? err.message : "Erro desconhecido ao chamar o provider de modelo.";
			if (err instanceof AgentCallError && err.code === "unauthenticated" && agent.authBindings?.length) {
				setPerAgentStatus(squadId, seatId, "checkpoint");
				patchRuntime(squadId, (runtime) => ({
					...runtime,
					status: "awaiting_auth",
					pendingSeatId: seatId,
				}));
				appendLog(squadId, `Autenticação necessária para ${agent.name}: ${message}`);
				appendEvent(squadId, {
					kind: "error",
					seatId,
					agentId: agent.id,
					title: "Reconecte a conta para continuar",
					content: message,
				});
				persistRunProgress(squadId, {
					currentStep: getRuntime(squadId).currentStep,
					pendingSeatId: seatId,
					pendingCheckpointKind: null,
					pendingQuestion: null,
				});
				queueMicrotask(drainRunQueue);
				return;
			}
			appendLog(squadId, `Erro em ${agent.name}: ${message}`);
			appendEvent(squadId, {
				kind: "error",
				seatId,
				agentId: agent.id,
				title: `Erro em ${agent.name}`,
				content: message,
			});
			notify.error("Falha ao chamar o provider de modelo.");
			finishRun(squadId, "aborted");
		}
	});
};

/** Pergunta ao coordenador qual o próximo passo — repete até "done" ou até bater o guardrail `maxSteps`. */
const advanceOrchestrated = (squadId: string): void => {
	const squad = getSquadConfig(squadId);
	const runtime = getRuntime(squadId);
	if (!squad || runtime.status !== "running") return;
	const config = squad.orchestrator;

	if (runtime.currentStep >= config.maxSteps) {
		appendLog(squadId, `Limite de ${config.maxSteps} passos do coordenador atingido — encerrando.`);
		finishRun(squadId, "done");
		return;
	}

	const provider = getProvider(config.modelRef.providerId);
	if (!provider) {
		appendLog(squadId, "Erro: provider do coordenador não está mais cadastrado.");
		appendEvent(squadId, {
			kind: "error",
			title: "Erro no coordenador",
			content: "Provider do coordenador não está mais cadastrado.",
		});
		notify.error("Provider do coordenador não foi encontrado.");
		finishRun(squadId, "aborted");
		return;
	}

	const run = activeRun(squadId);
	if (!run) return;
	const briefing = run.input;
	const prompt = buildCoordinatorPrompt(squad, run, briefing);

	setCoordinatorThinking(squadId, true);
	runAbortable(squadId, async (signal) => {
		try {
			const result = await callAgentStep(
				{
					systemPrompt: config.systemPrompt,
					prompt,
					model: config.modelRef.model,
					providerKind: provider.kind,
					baseUrl: provider.baseUrl,
					apiKeyRef: provider.apiKeyRef,
				},
				signal,
			);
			const decision = parseCoordinatorDecision(result.output);
			const currentSquad = getSquadConfig(squadId);
			// Parse falhou (coordenador não devolveu JSON): antes de desistir, tenta casar a saída crua com
			// um agent — ele com frequência responde só o nome em texto puro (ex.: "Copywriter").
			const unparseable = decision.next === "done" && decision.reason === UNPARSEABLE_DECISION_REASON;

			// "done" real do coordenador (nunca o fallback de parse).
			if (decision.next === "done" && !unparseable) {
				appendLog(squadId, `Orquestrador encerrou${decision.reason ? `: ${decision.reason}` : "."}`);
				appendEvent(squadId, { kind: "system", title: "Execução concluída", content: decision.reason });
				finishRun(squadId, "done");
				return;
			}

			// Alvo: o `next` da decisão; quando não-interpretável, a própria saída crua (tenta o nome do agent).
			const reviewOverride = findPendingReviewOwner(currentSquad, run.steps);
			const target = (reviewOverride?.target ?? (unparseable ? result.output : decision.next)).trim();
			const targetKey = target.toLowerCase();
			// Normaliza pra um match tolerante: minúsculas, só alfanumérico. Deixa "COPYWRITER_ROTEIRO_..."
			// casar com o agent "Copywriter" (o coordenador às vezes devolve um "token" em vez do nome puro).
			const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
			const targetNorm = normalize(target);
			// Resolve por seatId (formato pedido) ou, como fallback tolerante, pelo nome/id do agent.
			const { seat, nextAgent } = ((): { seat?: SquadDetail["seats"][number]; nextAgent?: Agent } => {
				const bySeatId = currentSquad?.seats.find((s) => s.id === target);
				if (bySeatId?.agentId) {
					return { seat: bySeatId, nextAgent: currentSquad?.agents.find((a) => a.id === bySeatId.agentId) };
				}
				const agent =
					currentSquad?.agents.find(
						(a) => a.name.trim().toLowerCase() === targetKey || a.id.toLowerCase() === targetKey,
					) ??
					// Último recurso: prefixo normalizado (nunca substring, pra prosa longa não casar por acaso).
					(targetNorm.length >= 3
						? currentSquad?.agents.find((a) => {
								const nameNorm = normalize(a.name);
								return nameNorm.length >= 3 && (targetNorm.startsWith(nameNorm) || nameNorm.startsWith(targetNorm));
							})
						: undefined);
				const seatForAgent = agent ? currentSquad?.seats.find((s) => s.agentId === agent.id) : undefined;
				return { seat: seatForAgent, nextAgent: seatForAgent ? agent : undefined };
			})();
			if (!seat || !nextAgent) {
				// Não-interpretável e não casou nenhum agent: expõe a saída crua no transcript — sem isso o
				// run encerra com o dialog em branco e não há como diagnosticar o que o coordenador respondeu.
				if (unparseable) {
					const rawOutput = truncate(result.output.trim() || "(vazia)", 2000);
					appendLog(squadId, `${UNPARSEABLE_DECISION_REASON}\nResposta crua do coordenador:\n${rawOutput}`);
					appendEvent(squadId, {
						kind: "error",
						title: "Decisão do coordenador não interpretável",
						content: `${UNPARSEABLE_DECISION_REASON}\n\nResposta crua:\n${rawOutput}`,
					});
					finishRun(squadId, "done");
					return;
				}
				appendLog(squadId, `Orquestrador apontou uma cadeira inválida ("${decision.next}") — encerrando.`);
				appendEvent(squadId, {
					kind: "error",
					title: "Cadeira inválida",
					content: `O orquestrador apontou uma cadeira inválida ("${decision.next}").`,
				});
				notify.error("O orquestrador apontou uma cadeira inválida — execução encerrada.");
				finishRun(squadId, "aborted");
				return;
			}

			// Não vaza o motivo sintético do fallback de parse como se fosse a justificativa do coordenador.
			const effectiveReason = reviewOverride
				? `revisao pendente direcionada para ${reviewOverride.ownerLabel}`
				: unparseable
					? undefined
					: decision.reason;
			appendLog(squadId, `→ Orquestrador escolheu ${nextAgent.name}${effectiveReason ? ` — ${effectiveReason}` : ""}`);
			appendEvent(squadId, {
				kind: "coordinator",
				seatId: seat.id,
				agentId: nextAgent.id,
				title: `Coordenador acionou ${nextAgent.name}`,
				reason: effectiveReason,
			});

			if (nextAgent.requiresCheckpoint) {
				patchRuntime(squadId, (r) => ({
					...r,
					status: "checkpoint",
					pendingSeatId: seat.id,
					pendingCheckpointKind: "before",
					coordinatorThinking: false,
				}));
				appendLog(squadId, `Checkpoint: aprovação necessária antes de acionar ${nextAgent.name}.`);
				appendEvent(squadId, {
					kind: "checkpoint",
					seatId: seat.id,
					agentId: nextAgent.id,
					title: `Aprovação necessária antes de acionar ${nextAgent.name}`,
				});
				// Só via SO (sem toast in-app): o banner de checkpoint no `RunDialog` já cobre quem está olhando.
				notifyOs("Aprovação necessária", `Antes de acionar ${nextAgent.name}`, () => openRunDialog(squadId));
				persistRunProgress(squadId, {
					currentStep: getRuntime(squadId).currentStep,
					pendingSeatId: seat.id,
					pendingCheckpointKind: "before",
					pendingQuestion: null,
				});
				queueMicrotask(drainRunQueue);
				return;
			}

			runOrchestratedAgentStep(
				squadId,
				seat.id,
				nextAgent,
				briefing,
				[],
				reviewOverride?.contextSteps ?? decision.contextSteps,
			);
		} catch (err) {
			if (signal.aborted) return;
			const message = err instanceof AgentCallError ? err.message : "Erro desconhecido ao chamar o coordenador.";
			appendLog(squadId, `Erro no coordenador: ${message}`);
			appendEvent(squadId, { kind: "error", title: "Erro no coordenador", content: message });
			notify.error("Falha ao chamar o coordenador.");
			finishRun(squadId, "aborted");
		}
	});
};

// --- API pública: funções módulo-level (não hooks), chamadas direto de handlers de UI ---

const activeSlotCount = (): number => {
	const state = useOrchestratorRuntimeStore.getState();
	return Object.values(state.runtimes).filter((runtime) => SLOT_RUNTIME_STATUSES.has(runtime.status)).length;
};

const launchPreparedExecution = (executionId: string, squad: SquadDetail, origin: RunOrigin): void => {
	patchRuntime(executionId, (runtime) => ({ ...runtime, status: "running" }));
	persistRunProgress(executionId, null);
	notifyOs(origin === "manual" ? "Execução iniciada" : "Execução automática iniciada", squad.name, () =>
		openRunDialog(executionId),
	);
	const workspacePreparation = resetWorkspace(executionId);
	workspacePreparationByExecution.set(executionId, workspacePreparation);
	void Promise.allSettled([workspacePreparation, prepareRunHistory(executionId, squad)]).finally(() => {
		workspacePreparationByExecution.delete(executionId);
		advanceOrchestrated(executionId);
	});
};

const runOrQueueContinuation = (executionId: string, continuation: () => void): void => {
	if (activeSlotCount() < MAX_CONCURRENT_RUNS) {
		patchRuntime(executionId, (runtime) => ({ ...runtime, status: "running" }));
		continuation();
		return;
	}
	queuedContinuations.set(executionId, continuation);
	if (!queuedExecutionIds.includes(executionId)) queuedExecutionIds.push(executionId);
	patchRuntime(executionId, (runtime) => ({ ...runtime, status: "queued" }));
};

const drainRunQueue = (): void => {
	while (activeSlotCount() < MAX_CONCURRENT_RUNS && queuedExecutionIds.length > 0) {
		const executionId = queuedExecutionIds.shift();
		if (!executionId) return;
		const runtime = getRuntime(executionId);
		const squad = getSquadConfig(executionId);
		if (runtime.status !== "queued" || !squad) continue;
		const continuation = queuedContinuations.get(executionId);
		if (continuation) {
			queuedContinuations.delete(executionId);
			patchRuntime(executionId, (current) => ({ ...current, status: "running" }));
			continuation();
			continue;
		}
		launchPreparedExecution(executionId, squad, "manual");
	}
};

export const startRun = (squadId: string, input: string, origin: RunOrigin = "manual"): string | undefined => {
	if (!requireRunner(squadId)) return;
	const squad = getSquadConfig(squadId);
	if (!squad) return;
	if (!squad.seats.some((s) => s.agentId)) {
		// Origem "schedule"/"onComplete" não tem usuário na tela pra ler um `notify.error` — vira só
		// log/notificação de falha em vez de bloquear silenciosamente (ver `scheduler.ts`).
		if (origin === "manual") {
			notify.error("Sente ao menos um agent antes de rodar.");
		} else {
			notify.error(`Execução automática de "${squad.name}" não iniciou — nenhum agent sentado.`);
		}
		return;
	}

	const executionId = newId();
	executionSquadIds.set(executionId, squadId);
	activeRuns.set(executionId, {
		id: executionId,
		squadId,
		input,
		startedAt: nowIso(),
		endedAt: null,
		status: "running",
		steps: [],
		qaLog: [],
		authBindingsSnapshot: snapshotAuthBindings(squad),
	});

	useOrchestratorRuntimeStore.getState().registerRun(squadId, executionId);
	const queued = activeSlotCount() >= MAX_CONCURRENT_RUNS;
	setRuntime(executionId, {
		...idleRuntime(),
		runId: executionId,
		squadId,
		status: queued ? "queued" : "running",
		startedAt: nowIso(),
		log: [`Iniciado: ${input}`],
	});
	openRunDialog(executionId);
	if (queued) {
		queuedExecutionIds.push(executionId);
		appendEvent(executionId, {
			kind: "system",
			title: "Execução na fila",
			content: "Aguardando um dos 2 slots disponíveis.",
		});
		persistRunProgress(executionId, null);
	} else {
		launchPreparedExecution(executionId, squad, origin);
	}
	return executionId;
};

export const pauseRun = (squadId: string): void => {
	const runtime = getRuntime(squadId);
	if (runtime.status !== "running") return;
	cancelAdvance(squadId);
	patchRuntime(squadId, (r) => ({ ...r, status: "paused" }));
	persistRunProgress(squadId, {
		currentStep: runtime.currentStep,
		pendingSeatId: runtime.pendingSeatId,
		pendingCheckpointKind: runtime.pendingCheckpointKind,
		pendingQuestion: runtime.pendingQuestion,
	});
};

export const resumeRun = (squadId: string): void => {
	const runtime = getRuntime(squadId);
	if (runtime.status !== "paused" && runtime.status !== "awaiting_auth") return;
	const squad = getSquadConfig(squadId);
	runOrQueueContinuation(squadId, () => {
		if (runtime.status === "awaiting_auth" && squad && runtime.pendingSeatId) {
			const seat = squad.seats.find((item) => item.id === runtime.pendingSeatId);
			const agent = seat?.agentId ? squad.agents.find((item) => item.id === seat.agentId) : undefined;
			if (seat && agent) {
				patchRuntime(squadId, (current) => ({ ...current, pendingSeatId: null }));
				runOrchestratedAgentStep(squadId, seat.id, agent, activeRun(squadId)?.input ?? "");
				return;
			}
		}
		if (squad) void prepareRunHistory(squadId, squad).finally(() => advanceOrchestrated(squadId));
		else advanceOrchestrated(squadId);
	});
};

export const stopRun = (squadId: string): void => {
	const runtime = getRuntime(squadId);
	if (!ACTIVE_RUNTIME_STATUSES.has(runtime.status) && runtime.status !== "paused") return;
	cancelAdvance(squadId);
	finishRun(squadId, "aborted");
};

/** Volta o runtime a `idle` — só permitido fora de uma execução ativa. */
export const resetRun = (squadId: string): void => {
	const runtime = getRuntime(squadId);
	if (ACTIVE_RUNTIME_STATUSES.has(runtime.status) || runtime.status === "paused") return;
	setRuntime(squadId, idleRuntime());
};

/** Aprova ou rejeita o agent pendente (`runtime.pendingSeatId`) que exige checkpoint. */
export const resolveCheckpoint = (squadId: string, approved: boolean): void => {
	const squad = getSquadConfig(squadId);
	const runtime = getRuntime(squadId);
	if (!squad || runtime.status !== "checkpoint" || !runtime.pendingSeatId) return;
	const seatId = runtime.pendingSeatId;
	const checkpointKind = runtime.pendingCheckpointKind;
	const seat = squad.seats.find((item) => item.id === seatId);
	const agent = seat?.agentId ? squad.agents.find((item) => item.id === seat.agentId) : undefined;

	if (!approved) {
		appendLog(squadId, "Checkpoint rejeitado.");
		finishRun(squadId, "aborted");
		return;
	}

	if (checkpointKind === "after") {
		appendLog(squadId, "Checkpoint aprovado.");
		runOrQueueContinuation(squadId, () => {
			patchRuntime(squadId, (r) => ({ ...r, pendingSeatId: null, pendingCheckpointKind: null }));
			const hasInstagramPublisher = agent?.scriptIds.some(
				(scriptId) => getScript(scriptId)?.connectorProvider === "instagram",
			);
			if (seat && agent && hasInstagramPublisher) {
				approvedPublishExecutionIds.add(squadId);
				const run = activeRun(squadId);
				runOrchestratedAgentStep(
					squadId,
					seat.id,
					agent,
					run?.input ?? "",
					[],
					run?.steps.length ? [run.steps.length] : [],
				);
				return;
			}
			advanceOrchestrated(squadId);
		});
		return;
	}

	if (!seat || !agent) {
		appendLog(squadId, "Checkpoint aprovado, mas a cadeira não existe mais — encerrando.");
		notify.error("A cadeira aprovada não existe mais — execução encerrada.");
		finishRun(squadId, "aborted");
		return;
	}

	appendLog(squadId, "Checkpoint aprovado.");
	const run = activeRun(squadId);
	runOrQueueContinuation(squadId, () => {
		patchRuntime(squadId, (r) => ({ ...r, pendingSeatId: null, pendingCheckpointKind: null }));
		runOrchestratedAgentStep(squadId, seat.id, agent, run?.input ?? "");
	});
};

/** Responde a pergunta que um agent fez no meio do turno (`runtime.pendingQuestion`) e ele continua. */
export const answerPrompt = (squadId: string, answer: string): void => {
	const squad = getSquadConfig(squadId);
	const runtime = getRuntime(squadId);
	if (!squad || runtime.status !== "awaiting_input" || !runtime.pendingQuestion) return;
	const { seatId, question } = runtime.pendingQuestion;
	const qaHistory = [...runtime.pendingQaHistory, { question, answer }];

	const seat = squad.seats.find((s) => s.id === seatId);
	const agent = seat?.agentId ? squad.agents.find((a) => a.id === seat.agentId) : undefined;
	if (!seat || !agent) {
		appendLog(squadId, "Resposta enviada, mas a cadeira não existe mais — encerrando.");
		notify.error("A cadeira não existe mais — execução encerrada.");
		finishRun(squadId, "aborted");
		return;
	}

	const run = activeRun(squadId);
	patchRun(squadId, (r) => ({ ...r, qaLog: [...r.qaLog, { seatId, question, answer }] }));
	appendLog(squadId, `Você respondeu: ${answer}`);

	runOrQueueContinuation(squadId, () => {
		patchRuntime(squadId, (r) => ({
			...r,
			pendingSeatId: null,
			pendingQuestion: null,
			pendingQaHistory: [],
		}));
		runOrchestratedAgentStep(squadId, seat.id, agent, run?.input ?? "", qaHistory);
	});
};

// --- Continuar de onde parou (retomar um run terminado / refazer o último passo) ---

/**
 * Recria `activeRun`+transcript (events/log/perAgentStatus) a partir do histórico de um run anterior —
 * base comum de `continueRun`/`retryLastStep`. Cria um NOVO `RunRecord` (não reescreve o antigo) com
 * `resumedFromRunId` apontando pra origem, mantendo o histórico velho intacto e auditável. Não mexe em
 * `runtime.status` — cada chamador decide o estado inicial (running/checkpoint/awaiting_input).
 */
const seedRunFromHistory = (
	executionId: string,
	squadId: string,
	squad: SquadDetail,
	sourceRun: RunRecord,
	steps: RunRecord["steps"],
): { perAgentStatus: Record<string, AgentStatus>; events: RunEvent[]; log: string[] } => {
	activeRuns.set(executionId, {
		id: executionId,
		squadId,
		input: sourceRun.input,
		startedAt: nowIso(),
		endedAt: null,
		status: "running",
		steps,
		qaLog: sourceRun.qaLog,
		resumedFromRunId: sourceRun.id,
		runtimeSnapshot: null,
		authBindingsSnapshot: sourceRun.authBindingsSnapshot ?? snapshotAuthBindings(squad),
	});

	const perAgentStatus: Record<string, AgentStatus> = {};
	const events: RunEvent[] = [];
	const log: string[] = [];
	for (const step of steps) {
		if (!step.artifact) continue;
		const agent = step.agentId ? squad.agents.find((a) => a.id === step.agentId) : undefined;
		if (step.seatId) perAgentStatus[step.seatId] = "done";
		events.push({
			id: newId(),
			kind: "agent",
			seatId: step.seatId,
			agentId: step.agentId,
			title: agent?.name ?? "Agent",
			content: step.artifact.content,
			createdAt: step.artifact.createdAt,
		});
		log.push(step.artifact.content);
	}
	return { perAgentStatus, events, log };
};

/**
 * Retoma um run terminado (abortado por erro, rejeitado, ou interrompido por um fechamento do app) a
 * partir do ponto onde parou — sem refazer os passos já produzidos. Nome `continueRun` (não `resumeRun`)
 * pra não colidir com o `resumeRun(squadId)` existente, que só tira um run do estado "paused". Se o run
 * guardava um `runtimeSnapshot` com checkpoint/pergunta pendente, restaura exatamente esse estado (o
 * usuário resolve pelos mesmos painéis de sempre, `resolveCheckpoint`/`answerPrompt`). Caso contrário —
 * inclusive quando o motivo foi o coordenador não devolver uma decisão válida — apenas pergunta ao
 * coordenador qual é o próximo passo a partir do histórico (`advanceOrchestrated` é stateless por
 * chamada, então isso já resolve sozinho).
 */
export const continueRun = (squadId: string, run: RunRecord): void => {
	if (!requireRunner(squadId)) return;
	const squad = getSquadConfig(squadId);
	if (!squad) return;
	if (!squad.seats.some((s) => s.agentId)) {
		notify.error("Sente ao menos um agent antes de retomar.");
		return;
	}

	const executionId = newId();
	executionSquadIds.set(executionId, squadId);
	useOrchestratorRuntimeStore.getState().registerRun(squadId, executionId);
	const { perAgentStatus, events, log } = seedRunFromHistory(executionId, squadId, squad, run, run.steps);
	log.unshift(`Retomado a partir do run ${run.id} (${run.steps.length} passo(s) já produzido(s)).`);

	const snapshot = run.runtimeSnapshot ?? null;
	const initialStatus: SquadRuntimeStatus = snapshot?.pendingQuestion
		? "awaiting_input"
		: snapshot?.pendingCheckpointKind
			? "checkpoint"
			: "running";

	setRuntime(executionId, {
		...idleRuntime(),
		runId: executionId,
		squadId,
		status: initialStatus,
		startedAt: nowIso(),
		currentStep: run.steps.length,
		perAgentStatus,
		log,
		events,
		pendingSeatId: snapshot?.pendingSeatId ?? null,
		pendingCheckpointKind: snapshot?.pendingCheckpointKind ?? null,
		pendingQuestion: snapshot?.pendingQuestion ?? null,
		pendingQaHistory: [],
	});

	openRunDialog(executionId);
	notifyOs("Execução retomada", squad.name, () => openRunDialog(executionId));
	persistRunProgress(executionId, snapshot);

	// Carrega o resumo do histórico (se a flag ligar) — em checkpoint/pergunta o coordenador só roda depois
	// da interação do usuário, então basta disparar em background; na trilha "running" segura o advance.
	const historyReady = prepareRunHistory(executionId, squad);
	const workspaceReady = resetWorkspace(executionId, "", run.id);
	workspacePreparationByExecution.set(executionId, workspaceReady);

	if (initialStatus === "awaiting_input") {
		appendLog(executionId, "Pergunta pendente restaurada — aguardando sua resposta.");
		return;
	}
	if (initialStatus === "checkpoint") {
		appendLog(executionId, "Checkpoint restaurado — aprovação necessária para continuar.");
		return;
	}
	runOrQueueContinuation(executionId, () => {
		void Promise.allSettled([historyReady, workspaceReady]).finally(() => {
			workspacePreparationByExecution.delete(executionId);
			advanceOrchestrated(executionId);
		});
	});
};

/**
 * Descarta o último passo produzido por um run terminado e re-executa a mesma cadeira — útil quando o
 * último passo saiu ruim/incompleto em vez de o run ter falhado de vez. Diferente de `continueRun`: não
 * pergunta ao coordenador o próximo passo, refaz especificamente o último agent que rodou.
 */
export const retryLastStep = (squadId: string, run: RunRecord): void => {
	const squad = getSquadConfig(squadId);
	if (!squad) return;
	const lastStep = run.steps.at(-1);
	if (!lastStep?.seatId) {
		notify.error("Não há um passo anterior para refazer.");
		return;
	}
	const seat = squad.seats.find((s) => s.id === lastStep.seatId);
	const agent = seat?.agentId ? squad.agents.find((a) => a.id === seat.agentId) : undefined;
	if (!seat || !agent) {
		notify.error("O agent do último passo não existe mais neste squad.");
		return;
	}

	if (!requireRunner(squadId)) return;

	const executionId = newId();
	executionSquadIds.set(executionId, squadId);
	useOrchestratorRuntimeStore.getState().registerRun(squadId, executionId);
	const remainingSteps = run.steps.slice(0, -1);
	const { perAgentStatus, events, log } = seedRunFromHistory(executionId, squadId, squad, run, remainingSteps);
	log.unshift(`Refazendo o último passo (${agent.name}) a partir do run ${run.id}.`);

	setRuntime(executionId, {
		...idleRuntime(),
		runId: executionId,
		squadId,
		status: "running",
		startedAt: nowIso(),
		currentStep: remainingSteps.length,
		perAgentStatus,
		log,
		events,
		pendingSeatId: null,
		pendingCheckpointKind: null,
		pendingQuestion: null,
		pendingQaHistory: [],
	});

	openRunDialog(executionId);
	notifyOs("Refazendo último passo", `${agent.name} — ${squad.name}`, () => openRunDialog(executionId));
	persistRunProgress(executionId, null);
	// O coordenador só roda depois que este agent terminar (async), então dá tempo do resumo carregar em background.
	void prepareRunHistory(executionId, squad);
	const workspaceReady = resetWorkspace(executionId, "", run.id);
	workspacePreparationByExecution.set(executionId, workspaceReady);
	runOrQueueContinuation(executionId, () => {
		void workspaceReady.finally(() => {
			workspacePreparationByExecution.delete(executionId);
			runOrchestratedAgentStep(executionId, seat.id, agent, run.input);
		});
	});
};
