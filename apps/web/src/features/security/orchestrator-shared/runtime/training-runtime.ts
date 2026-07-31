// Motor do treinamento pós-reprovação (spec 002) — módulo-level, mesmo motivo do
// `config-assistant-runtime.ts`: a revisão da proposta dura minutos e sobrevive ao componente que
// disparou a análise. Nada aqui roda dentro de um run: é uma chamada de modelo à parte, explícita.
import { tanStackQueryClient } from "@/app/api/clients";
import { providersKeys } from "@/features/security/models/api";
import {
	createCollectionApi,
	uploadKnowledgeDocumentApi,
	type KnowledgeDocument,
} from "@/features/security/knowledge/api";
import { squadDetailKeys, updateAgentApi, updateSquadApi } from "@/features/security/squad-detail/api";
import type { SquadDetail } from "@/features/security/squad-detail/api";
import { REJECTION_CATEGORY_LABEL, REJECTION_SEVERITY_LABEL } from "../data/constants";
import type {
	Agent,
	ModelProvider,
	RunRecord,
	RunRejection,
	TrainingBlameVerdict,
	TrainingLesson,
	TrainingProposal,
} from "../types";
import { useTrainingStore } from "../model/use-training-store";
import { AgentCallError, callAgentStep } from "./model-client";
import { extractBalancedJsonBlocks } from "./orchestrator-decision";
import { cancelAdvance, runAbortable } from "./runner-controllers";

// --- Orçamento do dossiê -------------------------------------------------------------------------
// A saída reprovada tem prioridade: é o artefato que o treinador precisa ler inteiro para diagnosticar.
// Os passos que a alimentaram entram truncados, e o `toolLog` nunca entra (ruído de execução, não de
// processo, e é onde segredo apareceria).

const BUDGET_BRIEFING = 1500;
const BUDGET_BLAMED_OUTPUT = 6000;
const BUDGET_UPSTREAM_TOTAL = 3000;
const BUDGET_UPSTREAM_PER_STEP = 800;
const BUDGET_SYSTEM_PROMPT = 5000;
/** Passos anteriores ao culpado considerados como "o que o alimentou". */
const MAX_UPSTREAM_STEPS = 3;

const truncate = (text: string, budget: number): string =>
	text.length <= budget ? text : `${text.slice(0, budget)}\n… (truncado)`;

type RunStep = RunRecord["steps"][number];

/**
 * Índice do passo apontado como responsável. Sem `blamedStepId` (reprovação antiga ou sem seletor),
 * cai no último passo do run — que é o do checkpoint.
 */
const findBlamedStepIndex = (run: RunRecord, rejection: RunRejection): number => {
	if (rejection.blamedStepId) {
		const index = run.steps.findIndex((step) => step.stepId === rejection.blamedStepId);
		if (index >= 0) return index;
	}
	return run.steps.length - 1;
};

/**
 * O agente que o treinamento analisa é o do **passo culpado**, não o do checkpoint — é a diferença
 * que torna a correção precisa (RF2).
 */
export const resolveBlamedAgent = (
	squad: SquadDetail,
	run: RunRecord,
	rejection: RunRejection,
): Agent | undefined => {
	const step = run.steps[findBlamedStepIndex(run, rejection)];
	const agentId = step?.agentId ?? rejection.agentId;
	if (agentId) {
		const byId = squad.agents.find((agent) => agent.id === agentId);
		if (byId) return byId;
	}
	const seatId = step?.seatId ?? rejection.seatId;
	const seat = squad.seats.find((item) => item.id === seatId);
	return seat?.agentId ? squad.agents.find((agent) => agent.id === seat.agentId) : undefined;
};

const stepLabel = (squad: SquadDetail, step: RunStep, position: number): string => {
	const agent = step.agentId ? squad.agents.find((item) => item.id === step.agentId) : undefined;
	return `Passo ${position}${agent ? ` — ${agent.name} (${agent.role})` : ""}`;
};

/**
 * Monta o texto de entrada do treinador com orçamento rígido por seção. Nunca inclui `toolLog`:
 * ele é estado de execução (e potencial superfície de vazamento de segredo), não evidência de
 * processo.
 */
export const buildTrainingDossier = (squad: SquadDetail, run: RunRecord, rejection: RunRejection): string => {
	const blamedIndex = findBlamedStepIndex(run, rejection);
	const blamedStep = run.steps[blamedIndex];
	const agent = resolveBlamedAgent(squad, run, rejection);

	const upstream = run.steps
		.slice(Math.max(0, blamedIndex - MAX_UPSTREAM_STEPS), blamedIndex)
		.map((step, offset) => ({ step, position: Math.max(0, blamedIndex - MAX_UPSTREAM_STEPS) + offset + 1 }));

	const parts: string[] = [];

	parts.push(`## Briefing do run\n${truncate(run.input, BUDGET_BRIEFING)}`);

	if (upstream.length > 0) {
		let used = 0;
		const rendered: string[] = [];
		for (const { step, position } of upstream) {
			const content = step.artifact?.content?.trim();
			if (!content) continue;
			const entry = `### ${stepLabel(squad, step, position)}\n${truncate(content, BUDGET_UPSTREAM_PER_STEP)}`;
			if (used + entry.length > BUDGET_UPSTREAM_TOTAL) break;
			rendered.push(entry);
			used += entry.length;
		}
		if (rendered.length > 0) parts.push(`## Passos que alimentaram o passo culpado\n${rendered.join("\n\n")}`);
	}

	parts.push(
		`## Passo culpado — saída reprovada\n${stepLabel(squad, blamedStep ?? { stepId: "", artifact: null }, blamedIndex + 1)}\n` +
			truncate(blamedStep?.artifact?.content?.trim() || "(o passo não produziu saída)", BUDGET_BLAMED_OUTPUT),
	);

	const classification = [
		rejection.category ? `categoria: ${REJECTION_CATEGORY_LABEL[rejection.category].toLowerCase()}` : null,
		rejection.severity ? `gravidade: ${REJECTION_SEVERITY_LABEL[rejection.severity].toLowerCase()}` : null,
		rejection.decidedByRole === "approver"
			? "reprovado por um aprovador externo ao squad"
			: rejection.decidedByRole === "owner"
				? "reprovado pelo dono do squad"
				: null,
	].filter(Boolean);

	parts.push(
		`## Justificativa da reprovação\n${rejection.reason.trim()}` +
			(classification.length > 0 ? `\n\nClassificação: ${classification.join(" · ")}.` : ""),
	);

	parts.push(
		`## Agente responsável\nNome: ${agent?.name ?? "(desconhecido)"}\nPapel: ${agent?.role ?? "(desconhecido)"}\n\n` +
			`### systemPrompt atual\n${truncate(agent?.systemPrompt ?? "(vazio)", BUDGET_SYSTEM_PROMPT)}`,
	);

	return parts.join("\n\n");
};

// --- Prompt do treinador -------------------------------------------------------------------------

const TRAINER_OUTPUT_SHAPE = `{
  "diagnosis": "string curta, o que aconteceu",
  "blameVerdict": "agent | briefing | upstream_step | tooling | unclear",
  "lesson": {
    "title": "string",
    "scenario": "quando isso se aplica",
    "mistake": "o que foi feito de errado",
    "rule": "o que fazer no lugar",
    "example": "exemplo curto do certo (opcional)"
  },
  "promptPatch": {
    "proposedSystemPrompt": "texto completo do prompt reescrito",
    "rationale": "por que essa mudança resolve",
    "changedSections": ["Regras aprendidas"]
  },
  "confidence": 0.0
}`;

export const buildTrainerSystemPrompt = (): string =>
	[
		"Você analisa uma reprovação de checkpoint num sistema de agentes e propõe uma correção durável.",
		"Responda SOMENTE com um objeto JSON no formato abaixo, sem texto em volta.",
		"",
		TRAINER_OUTPUT_SHAPE,
		"",
		"Regras:",
		"- `blameVerdict` é `agent` apenas quando o erro foi do agente responsável. Use `briefing` quando o pedido",
		"  era ambíguo, `upstream_step` quando o passo anterior entregou insumo errado, `tooling` quando houve",
		"  falha de rede/ferramenta/orçamento, e `unclear` quando as evidências não bastam. Para culpar briefing ou",
		"  passo anterior você precisa citar a evidência concreta no `diagnosis`.",
		"- Se `blameVerdict` for diferente de `agent`, OMITA `promptPatch` por completo. Erro que não é do agente",
		"  não se corrige mudando o prompt de quem foi reprovado.",
		"- `proposedSystemPrompt` é o texto COMPLETO do prompt reescrito, não um trecho nem um diff.",
		"- A reescrita consolida a seção `## Regras aprendidas` (crie-a se não existir). Regra que já existe em",
		"  outras palavras deve ser reescrita, não somada. Não contradiga o resto do prompt e não empilhe bullets.",
		"- `lesson` é escrita com o vocabulário do problema, para ser encontrada por busca por similaridade quando o",
		"  cenário se repetir. Não escreva como ata: nada de datas, nomes de run ou 'o agente X errou em tal dia'.",
		"- Nunca inclua valor de segredo, token, header de autenticação ou caminho absoluto de máquina.",
		"- `confidence` é um número entre 0 e 1.",
	].join("\n");

// --- Parse ---------------------------------------------------------------------------------------

export type TrainingParseResult =
	| { ok: true; proposal: TrainingProposal }
	| { ok: false; error: string; raw: string };

const BLAME_VERDICTS: TrainingBlameVerdict[] = ["agent", "briefing", "upstream_step", "tooling", "unclear"];

const asText = (value: unknown): string | undefined => {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
};

const parseLesson = (value: unknown): TrainingLesson | undefined => {
	if (!value || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;
	const title = asText(record.title);
	const scenario = asText(record.scenario);
	const mistake = asText(record.mistake);
	const rule = asText(record.rule);
	if (!title || !scenario || !mistake || !rule) return undefined;
	return { title, scenario, mistake, rule, example: asText(record.example) };
};

const parsePromptPatch = (value: unknown): TrainingProposal["promptPatch"] => {
	if (!value || typeof value !== "object") return undefined;
	const record = value as Record<string, unknown>;
	const proposedSystemPrompt = asText(record.proposedSystemPrompt);
	if (!proposedSystemPrompt) return undefined;
	const changedSections = Array.isArray(record.changedSections)
		? record.changedSections.filter((item): item is string => typeof item === "string")
		: [];
	return { proposedSystemPrompt, rationale: asText(record.rationale) ?? "", changedSections };
};

/**
 * Parse tolerante: aceita cerca de código e texto em volta (o modelo costuma explicar antes do JSON) e
 * varre do último bloco para o primeiro, como `parseCoordinatorDecision`. Saída inválida devolve erro
 * com o texto cru — nada é aplicado às cegas.
 */
export const parseTrainingProposal = (raw: string): TrainingParseResult => {
	const blocks = extractBalancedJsonBlocks(raw);
	for (let i = blocks.length - 1; i >= 0; i--) {
		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(blocks[i]) as Record<string, unknown>;
		} catch {
			continue;
		}
		const diagnosis = asText(parsed.diagnosis);
		const verdict = asText(parsed.blameVerdict) as TrainingBlameVerdict | undefined;
		if (!diagnosis || !verdict || !BLAME_VERDICTS.includes(verdict)) continue;

		const confidence = typeof parsed.confidence === "number" ? parsed.confidence : undefined;
		return {
			ok: true,
			proposal: {
				diagnosis,
				blameVerdict: verdict,
				lesson: parseLesson(parsed.lesson),
				// A regra do contrato vale mesmo se o modelo desobedecer: veredito que não é `agent`
				// nunca chega à UI com proposta de prompt (RF8).
				promptPatch: verdict === "agent" ? parsePromptPatch(parsed.promptPatch) : undefined,
				confidence,
			},
		};
	}
	return {
		ok: false,
		error: "O treinador não devolveu um JSON válido — nada foi aplicado.",
		raw,
	};
};

// --- Chamada -------------------------------------------------------------------------------------

const getProvider = (providerId: string): ModelProvider | undefined =>
	tanStackQueryClient.getQueryData<ModelProvider[]>(providersKeys.list())?.find((p) => p.id === providerId);

export type RunTrainingResult = TrainingParseResult | { ok: false; error: string; raw?: undefined };

/**
 * Roda o treinador no modelo do **coordenador** do squad (D7) — o modelo do agente culpado pode ser um
 * CLI local barato, inadequado para diagnóstico. Nunca executa nada (D8).
 */
export const runTraining = async (
	squad: SquadDetail,
	run: RunRecord,
	rejection: RunRejection,
	signal: AbortSignal,
): Promise<RunTrainingResult> => {
	const { providerId, model } = squad.orchestrator.modelRef;
	const provider = getProvider(providerId);
	if (!provider || !model) {
		return { ok: false, error: "O coordenador do squad não tem provider/modelo configurado." };
	}

	try {
		const result = await callAgentStep(
			{
				systemPrompt: buildTrainerSystemPrompt(),
				prompt: buildTrainingDossier(squad, run, rejection),
				model,
				providerKind: provider.kind,
				baseUrl: provider.baseUrl,
				apiKeyRef: provider.apiKeyRef,
				canExecute: false,
				scripts: [],
			},
			signal,
		);
		return parseTrainingProposal(result.output);
	} catch (err) {
		if (signal.aborted) return { ok: false, error: "Treinamento cancelado." };
		const message = err instanceof AgentCallError ? err.message : "Erro desconhecido ao chamar o modelo.";
		return { ok: false, error: message };
	}
};

const RUNTIME_KEY = "training";

/**
 * Dispara o treinamento (RF5) — ação explícita do usuário, nunca automática (D9). O resultado vai para
 * a store de revisão; nada é aplicado aqui.
 */
export const startTraining = (squad: SquadDetail, run: RunRecord, rejection: RunRejection): void => {
	const store = useTrainingStore.getState();
	store.start({ squadId: squad.id, runId: run.id, rejectionId: rejection.id });
	runAbortable(RUNTIME_KEY, async (signal) => {
		const result = await runTraining(squad, run, rejection, signal);
		if (signal.aborted) return;
		if (result.ok) useTrainingStore.getState().setProposal(result.proposal);
		else useTrainingStore.getState().setError(result.error, result.raw);
	});
};

export const stopTraining = (): void => cancelAdvance(RUNTIME_KEY);

// --- Aplicação da lição --------------------------------------------------------------------------

/** A procedência fica no fim: em cima roubaria peso semântico do chunk e pioraria a recuperação. */
export const buildLessonMarkdown = (
	lesson: TrainingLesson,
	origin: { runId: string; date: string; decidedBy?: string; agentName?: string },
): string => {
	const sections = [
		`# ${lesson.title}`,
		`## Quando se aplica\n${lesson.scenario}`,
		`## O que deu errado\n${lesson.mistake}`,
		`## Regra\n${lesson.rule}`,
	];
	if (lesson.example) sections.push(`## Exemplo\n${lesson.example}`);
	const provenance = [
		`Origem: run ${origin.runId}`,
		origin.date,
		origin.decidedBy ? `reprovado por ${origin.decidedBy}` : null,
		origin.agentName ? `agente ${origin.agentName}` : null,
	]
		.filter(Boolean)
		.join(" · ");
	return `${sections.join("\n\n")}\n\n---\n${provenance}\n`;
};

/** `licao-<data>-<run curto>-<n>.md` — `n` separa duas lições do mesmo run. */
export const buildLessonFilename = (runId: string, date: Date, sequence: number): string => {
	const day = date.toISOString().slice(0, 10);
	return `licao-${day}-${runId.slice(0, 8)}-${sequence}.md`;
};

export const lessonsCollectionName = (squadName: string): string => `Lições aprendidas — ${squadName}`;

/** Garante a coleção de lições do squad, criando-a na primeira vez e gravando o id no squad (D5). */
const ensureLessonsCollection = async (squad: SquadDetail): Promise<string> => {
	if (squad.lessonsCollectionId) return squad.lessonsCollectionId;
	const collection = await createCollectionApi({
		name: lessonsCollectionName(squad.name),
		description: "Lições extraídas de checkpoints reprovados deste squad.",
	});
	await updateSquadApi(squad.id, { lessonsCollectionId: collection.id });
	return collection.id;
};

export type ApplyLessonResult = { ok: true; document: KnowledgeDocument } | { ok: false; error: string };

/**
 * Grava a lição na base: cria a coleção do squad se ausente, sobe o `.md` sintetizado pelo endpoint
 * multipart existente (D3) e **vincula a coleção ao agente** quando ele ainda não a consultava — sem
 * isso a lição nunca seria recuperada, e uma lição que não é recuperada não serve para nada (RF11).
 */
export const applyLesson = async (
	squad: SquadDetail,
	run: RunRecord,
	rejection: RunRejection,
	lesson: TrainingLesson,
): Promise<ApplyLessonResult> => {
	try {
		const collectionId = await ensureLessonsCollection(squad);
		const agent = resolveBlamedAgent(squad, run, rejection);
		const sequence = (run.rejections ?? []).findIndex((item) => item.id === rejection.id) + 1;
		const markdown = buildLessonMarkdown(lesson, {
			runId: run.id,
			date: new Date(rejection.createdAt).toLocaleDateString("pt-BR"),
			decidedBy: rejection.decidedBy,
			agentName: agent?.name,
		});
		const filename = buildLessonFilename(run.id, new Date(rejection.createdAt), Math.max(sequence, 1));
		const file = new File([markdown], filename, { type: "text/markdown" });
		const document = await uploadKnowledgeDocumentApi(collectionId, file);

		if (agent && !(agent.knowledgeCollectionIds ?? []).includes(collectionId)) {
			await updateAgentApi(squad.id, agent.id, {
				knowledgeCollectionIds: [...(agent.knowledgeCollectionIds ?? []), collectionId],
			});
		}

		await tanStackQueryClient.invalidateQueries({ queryKey: squadDetailKeys.detail(squad.id) });
		return { ok: true, document };
	} catch {
		return { ok: false, error: "Não foi possível salvar a lição na base de conhecimento." };
	}
};

// --- Aplicação do prompt -------------------------------------------------------------------------
// Guarda anti-inchaço: um prompt que só cresce fica caro, contraditório e inauditável. O teto é largo
// de propósito — o número certo depende do provider e só o uso real diz qual é.

export const MAX_SYSTEM_PROMPT_CHARS = 12000;
/** Crescimento máximo por aplicação, relativo ao prompt atual. */
export const MAX_PROMPT_GROWTH_RATIO = 1.5;

export type PromptGuardResult = { ok: true } | { ok: false; error: string };

/**
 * Estourar bloqueia **só** o prompt — a lição continua aplicável, porque mover conhecimento para a
 * base é exatamente a saída que a mensagem sugere.
 */
export const checkPromptGuard = (current: string, proposed: string): PromptGuardResult => {
	if (proposed.length > MAX_SYSTEM_PROMPT_CHARS) {
		return {
			ok: false,
			error:
				`O prompt proposto tem ${proposed.length} caracteres e o limite é ${MAX_SYSTEM_PROMPT_CHARS}. ` +
				"É hora de consolidar as regras ou mover conhecimento para a base — salvar a lição continua disponível.",
		};
	}
	const ceiling = Math.round(current.length * MAX_PROMPT_GROWTH_RATIO);
	if (current.length > 0 && proposed.length > ceiling) {
		return {
			ok: false,
			error:
				`O prompt proposto cresce ${Math.round((proposed.length / current.length - 1) * 100)}% sobre o atual, ` +
				`acima do limite de ${Math.round((MAX_PROMPT_GROWTH_RATIO - 1) * 100)}%. A proposta deveria consolidar ` +
				"as regras, não empilhar — salvar a lição continua disponível.",
		};
	}
	return { ok: true };
};

export type ApplyPromptResult = { ok: true } | { ok: false; error: string };

/**
 * Aplica o prompt reescrito com a procedência junto. O versionamento é do backend (D6): ele guarda o
 * texto **anterior** sempre que `systemPrompt` muda, então edição manual também fica registrada.
 */
export const applyPromptPatch = async (
	squad: SquadDetail,
	agent: Agent,
	proposedSystemPrompt: string,
	origin: { reason: string; runId: string; rejectionId: string },
): Promise<ApplyPromptResult> => {
	const guard = checkPromptGuard(agent.systemPrompt, proposedSystemPrompt);
	if (!guard.ok) return guard;

	try {
		await updateAgentApi(squad.id, agent.id, {
			systemPrompt: proposedSystemPrompt,
			promptChangeReason: origin.reason,
			sourceRunId: origin.runId,
			sourceRejectionId: origin.rejectionId,
		});
		await tanStackQueryClient.invalidateQueries({ queryKey: squadDetailKeys.detail(squad.id) });
		return { ok: true };
	} catch {
		return { ok: false, error: "Não foi possível aplicar a alteração do prompt." };
	}
};
