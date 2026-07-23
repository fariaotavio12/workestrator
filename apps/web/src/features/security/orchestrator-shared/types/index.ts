// Modelo de domínio do orquestrador de squads (client-only, mock).
// O mesmo contrato de tipos será reusado quando o backend entrar — ver Task/orquestrador-plano.md.

export type Gender = "male" | "female";

export type CharacterName =
	| "Male1"
	| "Male2"
	| "Male3"
	| "Male4"
	| "Female1"
	| "Female2"
	| "Female3"
	| "Female4"
	| "Female5"
	| "Female6";

export type AgentStatus = "idle" | "working" | "done" | "checkpoint";

/**
 * Script reutilizável — a "biblioteca" que os agents podem usar como ferramenta, em vez de cada
 * agent guardar sua própria cópia. `kind: "command"` aponta pra um comando/binário já existente
 * (ex.: `npm test`); `kind: "inline"` guarda o corpo do script (escrito pelo usuário ou salvo a
 * partir de uma saída de um agent) — materializado em arquivo só quando o agent que o usa tem
 * `canExecute: true` (ver `Agent.canExecute`); `kind: "file"` referencia um arquivo/diretório no
 * disco de onde o runner executa — lido ao vivo na execução, nunca uma cópia. Só providers locais
 * (claude-cli) conseguem resolver `path`; providers remotos não têm acesso ao disco.
 * `kind: "http"` é um request declarativo a uma API qualquer; `kind: "mcp"` referencia um servidor
 * MCP (stdio local ou HTTP remoto) — o runner escreve a entrada em `.mcp.json`/`--mcp-config` da
 * Claude CLI; `kind: "connector"` é um MCP gateway de terceiro/local (Composio/Zapier/n8n/youtube/instagram).
 */
export type ScriptKind = "command" | "inline" | "file" | "http" | "mcp" | "connector";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type McpTransport = "stdio" | "http";

export type ConnectorProvider = "composio" | "zapier" | "n8n" | "youtube" | "instagram";

export type Script = {
	id: string;
	name: string;
	description?: string;
	kind: ScriptKind;
	/** Só para kind "command" (e "mcp" com transport "stdio" — comando que sobe o servidor). */
	command?: string;
	args?: string[];
	/** Só para kind "inline". */
	language?: "bash" | "node" | "python";
	content?: string;
	/** Só para kind "file" — caminho absoluto de um arquivo ou diretório na máquina do runner. */
	path?: string;
	/** Só para kind "http" — request declarativo (método, URL template, headers, resposta). */
	method?: HttpMethod;
	urlTemplate?: string;
	headers?: Record<string, string>;
	bodySchema?: string;
	responseMap?: string;
	/** Só para kind "mcp" — "stdio" reusa `command`/`args`; "http" usa `url`. */
	transport?: McpTransport;
	url?: string;
	env?: Record<string, string>;
	/** Whitelist das tools expostas pelo servidor MCP — controla orçamento de contexto e segurança. */
	toolAllowlist?: string[];
	/** Só para kind "connector" — provider do MCP gateway + config específica dele. */
	connectorProvider?: ConnectorProvider;
	config?: string;
	/** Referência a um `Secret` (nunca o valor cru) — usada por http/mcp/connector. */
	authRef?: string;
	createdAt: string;
	updatedAt: string;
};

/**
 * Esquema de injeção do valor no momento do uso (ver docs/plano-integracoes-e-flow-builder.md §8.3).
 * `metadata` carrega os parâmetros não sensíveis de cada esquema: `headerName`/`valuePrefix` (header),
 * `queryParam` (query), `basicUsername` (basic), `tokenUrl`/`clientId`/`scopes` (oauth2_*). Chaves de
 * `metadata` fora dessas são tratadas como headers fixos sempre enviados (ex.: `anthropic-version`).
 */
export type SecretAuthType =
	| "bearer"
	| "header"
	| "query"
	| "basic"
	| "oauth2_client_credentials"
	| "oauth2_refresh"
	| "raw";

export type AuthConnectionStatus = "connected" | "expired" | "revoked" | "error";

/**
 * Credencial cifrada no backend (AES-256-GCM) — o valor real nunca é devolvido por `GET /secrets`,
 * só resolvido pelo runner em runtime via `GET /secrets/{id}/value`. `apiKeyRef`/`authRef` referenciam
 * o `id` de um `Secret`.
 */
export type Secret = {
	id: string;
	label: string;
	authType: SecretAuthType;
	metadata?: Record<string, string>;
	/** Id do preset do catálogo de conectores que originou este secret (ex.: "google") — só informativo. */
	connectorId?: string;
	/** Identidade segura da conta conectada; o token continua separado e nunca aparece na UI. */
	accountExternalId?: string;
	accountDisplayName?: string;
	scopes: string[];
	status: AuthConnectionStatus;
	expiresAt?: string;
	lastValidatedAt?: string;
	hasValue: boolean;
	createdAt: string;
	updatedAt: string;
};

export type AgentAuthBinding = {
	scriptId: string;
	authSlot: string;
	connectionId: string;
	alias: string;
	isDefault: boolean;
};

/** Provider de modelo cadastrado (CLI local já autenticado na máquina ou API externa com key própria). */
export type ProviderKind = "claude-cli" | "codex-cli" | "gpt-cli" | "anthropic-api" | "openai" | "openai-compat";

export type ModelProvider = {
	id: string;
	label: string;
	kind: ProviderKind;
	/** Só para providers "openai-compat" (endpoint custom). */
	baseUrl?: string;
	/** Referência à key (nome), nunca o valor — o valor fica fora do localStorage. */
	apiKeyRef?: string;
	models: { value: string; label: string }[];
	createdAt: string;
	updatedAt: string;
};

export type ModelRef = { providerId: string; model: string };

/** Agent pertence ao squad que o criou — não é mais biblioteca global reutilizável. */
export type Agent = {
	id: string;
	name: string;
	role: string;
	systemPrompt: string;
	modelRef: ModelRef;
	/** Referências à biblioteca de scripts (`PersistedRoot.scripts`) — não guarda cópia, só o id. */
	scriptIds: string[];
	/**
	 * Bases de conhecimento (RAG) que este agente consulta durante o run — só os ids das coleções
	 * (feature `knowledge`). Vazio = sem RAG. O runtime recupera top-K trechos dessas bases e injeta
	 * no prompt do agente (ver `buildRetrievalBlock` e `orchestrator-runtime`).
	 */
	knowledgeCollectionIds?: string[];
	/** Contas que este agente pode usar em cada slot das suas ferramentas. */
	authBindings?: AgentAuthBinding[];
	/**
	 * Fase B (execução real): habilita tools de verdade (Bash/Read/Write/Edit) numa pasta de trabalho
	 * escopada, com auto-aceite (sem prompt de permissão ao vivo — exigiria stream bidirecional).
	 * ⚠️ Pasta escopada limita só onde o comando *começa*, não é sandbox — só ligar em agent confiável.
	 */
	canExecute: boolean;
	/**
	 * Teto de custo (USD) por invocação deste agente, repassado ao Claude CLI via `--max-budget-usd`.
	 * Ausente = usa o default do runner (`DEFAULT_MAX_BUDGET_USD`). Suba pra agentes que fazem muito num
	 * só contexto (ex.: gerar + renderizar vários slides) e vinham morrendo com "Exceeded USD budget".
	 */
	maxBudgetUsd?: number;
	/** Pausa o run pedindo aprovação antes de acionar este agent (ex.: antes de publicar). */
	requiresCheckpoint: boolean;
	/** Pausa o run pedindo aprovação depois que este agent produz a saída, antes do coordenador seguir. */
	requiresCheckpointAfter: boolean;
	character: CharacterName;
	gender: Gender;
	accentColor: string;
	createdAt: string;
	updatedAt: string;
};

/** A "cadeira": posição fixa no grid do escritório, com ou sem agent sentado. */
export type Seat = {
	id: string;
	col: number;
	row: number;
	agentId: string | null;
};

/**
 * Todo squad roda no modo orquestrado: um agent coordenador decide qual cadeira chamar a cada
 * passo, até responder "done" ou atingir `maxSteps`. Não existe mais fluxo/pipeline fixo — quem
 * precisa de aprovação antes de agir é configurado por agent (`Agent.requiresCheckpoint`).
 */
export type OrchestratorConfig = {
	systemPrompt: string;
	modelRef: ModelRef;
	/** Guardrail obrigatório contra loop infinito/custo — encerra o run mesmo sem "done". */
	maxSteps: number;
	/**
	 * Opt-in: injeta no prompt do coordenador um resumo das execuções anteriores deste squad (briefing +
	 * resultado resumido), pra ele evitar repetir temas/decisões. Desligado por padrão (custo de tokens).
	 */
	useRunHistory?: boolean;
};

/** Gatilho de execução do squad. */
export type Trigger =
	| { type: "manual" }
	| { type: "schedule"; every: "5m" | "1h" | "daily"; enabled: boolean }
	| { type: "onComplete"; squadId: string };

export type SquadRuntimeStatus =
	| "idle"
	| "queued"
	| "running"
	| "paused"
	| "completed"
	| "checkpoint"
	| "awaiting_input"
	| "awaiting_auth"
	| "awaiting_approval"
	| "aborted";

/** Pergunta que um agent fez no meio do próprio turno — pausa o run até o usuário responder. */
export type PendingQuestion = { seatId: string; question: string; options?: string[] };

/** Evento estruturado da execução — alimenta o transcript ao vivo (chat por agent + timeline). */
export type RunEvent = {
	id: string;
	kind: "coordinator" | "agent" | "question" | "checkpoint" | "system" | "error";
	seatId?: string;
	agentId?: string;
	title: string;
	/** Corpo principal (saída do agent / mensagem) renderizado em markdown quando aplicável. */
	content?: string;
	/** Raciocínio do coordenador (por que escolheu este agent) — exibido colapsável. */
	reason?: string;
	createdAt: string;
};

export type Runtime = {
	/** Identidade da execução ao vivo. Ausente somente no estado idle legado. */
	runId?: string;
	squadId?: string;
	status: SquadRuntimeStatus;
	/** Início da execução atual (ISO) — usado pelo cronômetro ao vivo. Ausente quando idle. */
	startedAt?: string | null;
	currentStep: number;
	/** seatId -> status do agent naquela cadeira durante a execução. */
	perAgentStatus: Record<string, AgentStatus>;
	log: string[];
	/** Timeline estruturado da execução (fonte do transcript). Vive junto ao `log` (que segue para export). */
	events: RunEvent[];
	/** Cadeira aguardando aprovação (status "checkpoint") — null fora desse estado. */
	pendingSeatId: string | null;
	/**
	 * Distingue o momento do checkpoint pendente: "before" pausa antes de acionar o agent,
	 * "after" pausa depois que ele já produziu a saída, antes do coordenador seguir. Null fora
	 * do status "checkpoint".
	 */
	pendingCheckpointKind: "before" | "after" | null;
	/** Texto sendo gerado agora (streaming), antes do passo fechar e virar uma linha do `log`. */
	streamingText: string | null;
	/** Presente só quando status === "awaiting_input". */
	pendingQuestion: PendingQuestion | null;
	/** Perguntas já respondidas no turno atual (ainda não fechado) — dá contexto ao continuar o agent. */
	pendingQaHistory: { question: string; answer: string }[];
	/**
	 * Atividade ao vivo do agente que está trabalhando agora (pensamento, chamadas de ferramenta, resultados).
	 * Só durante o passo — limpa a cada novo passo. Alimenta o painel "o que o agente está fazendo".
	 */
	liveActivity: LiveActivityItem[];
	/**
	 * Todas as chamadas de ferramenta do run atual (input+output), acumuladas por todo o run — não limpa
	 * por passo. Alimenta o painel de debug "Ferramentas". Só em memória; não persiste no backend.
	 */
	toolLog: ToolCallRecord[];
	/** Saída de terminal acumulada do passo atual (resultados de execução de ferramenta). */
	liveTerminal: string;
	/**
	 * `true` enquanto o coordenador está decidindo o próximo passo (entre um agente e outro). Preenche o
	 * "buraco" de percepção e move o foco no mapa do run pro nó do coordenador.
	 */
	coordinatorThinking: boolean;
	/** Início (ISO) do passo/agente atual — alimenta o cronômetro ao vivo por agente. `null` fora de um passo. */
	stepStartedAt: string | null;
};

/**
 * Item de atividade ao vivo de um agente durante um passo. O rótulo de exibição é derivado na UI a
 * partir de `kind`/`toolName`/`detail` (mantém genérico p/ qualquer tool). `status` pareia início e fim
 * de uma ferramenta pelo `id` (rodando → concluído/erro).
 */
export type LiveActivityItem = {
	id: string;
	kind: "thinking" | "tool" | "output";
	/** Só para `kind: "tool"` — nome cru da ferramenta (Bash, Write, mcp__playwright__browser_navigate...). */
	toolName?: string;
	/** Pensamento (thinking), input da ferramenta (tool) ou saída (output). */
	detail?: string;
	status?: "running" | "done" | "error";
};

/**
 * Registro de uma chamada de ferramenta acumulado por todo o run (painel de debug) — sobrevive à
 * troca de passo, ao contrário de `LiveActivityItem`. `id` pareia início (tool_use) e fim (tool_result).
 */
export type ToolCallRecord = {
	id: string;
	seatId?: string;
	agentId?: string;
	toolName: string;
	input?: string;
	output?: string;
	status: "running" | "done" | "error";
	startedAt: string;
	endedAt?: string;
	/** Só em tools `http` (provider API) — headers finais enviados no `fetch`, nunca visto pelo modelo. */
	sentHeaders?: Record<string, string>;
};

export type Squad = {
	id: string;
	name: string;
	description: string;
	icon: string;
	trigger: Trigger;
	/** Briefing salvo pelo usuário — pré-carrega o dialog de execução e alimenta o gatilho agendado. */
	savedBriefing: string | null;
	/** Biblioteca de agents deste squad — não é mais compartilhada entre squads. */
	agents: Agent[];
	seats: Seat[];
	orchestrator: OrchestratorConfig;
	runtime: Runtime;
	createdAt: string;
	updatedAt: string;
};

/** Saída de um passo — o que vira handoff pro próximo. */
export type Artifact = {
	stepId: string;
	kind: "text" | "stdout";
	content: string;
	createdAt: string;
};

/**
 * Snapshot do estado pendente (checkpoint/pergunta) de um run — persistido incrementalmente pra
 * permitir retomar a execução exatamente de onde parou, mesmo depois do app fechar no meio.
 */
export type RuntimeSnapshot = {
	currentStep: number;
	pendingSeatId: string | null;
	pendingCheckpointKind: "before" | "after" | null;
	pendingQuestion: PendingQuestion | null;
};

/** Arquivo gerado/alterado por um run, capturado no snapshot do workspace ao final da execução. */
export type RunFile = {
	/** Caminho relativo ao workspace, com "/" como separador. */
	path: string;
	/** Extensão em minúsculas, com ponto (ex.: ".md"). */
	ext: string;
	isImage: boolean;
	/** Tamanho em bytes. */
	size: number;
};

/** Histórico de uma execução — "o que rodou e o que não". */
export type RunRecord = {
	id: string;
	squadId: string;
	input: string;
	startedAt: string;
	endedAt: string | null;
	status: "running" | "done" | "failed" | "aborted";
	/** `agentId`/`seatId` atribuem o passo ao agent que o produziu (ausente em runs antigos). */
	steps: { stepId: string; agentId?: string; seatId?: string; artifact: Artifact | null }[];
	/** Perguntas que agents fizeram durante o run e as respostas dadas pelo usuário. */
	qaLog: { seatId: string; question: string; answer: string }[];
	/** Id do run do qual este foi retomado ("continuar de onde parou"), se houver. */
	resumedFromRunId?: string | null;
	/** Estado pendente (checkpoint/pergunta) no momento da última persistência — usado para retomar. */
	runtimeSnapshot?: RuntimeSnapshot | null;
	/** SeleÃ§Ã£o imutÃ¡vel de conexÃµes feita no inÃ­cio; nÃ£o carrega tokens. */
	authBindingsSnapshot?: (AgentAuthBinding & { agentId: string })[] | null;
	/** Arquivos gerados/alterados, copiados para `.runs/<id>` ao final do run. Ausente em runs antigos/sem arquivos. */
	files?: RunFile[] | null;
};
