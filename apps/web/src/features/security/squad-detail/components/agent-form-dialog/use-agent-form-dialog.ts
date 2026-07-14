import { notify } from "@/components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { genderOf } from "@/features/security/orchestrator-shared/data/characters";
import { ACCENT_COLORS } from "@/features/security/orchestrator-shared/data/constants";
import { PROMPT_TEMPLATES } from "@/features/security/orchestrator-shared/data/prompt-templates";
import { AgentCallError, callAgentStep } from "@/features/security/orchestrator-shared/runtime/model-client";
import type { Agent, CharacterName, Script } from "@/features/security/orchestrator-shared/types";
import { useCollectionsQuery } from "@/features/security/knowledge/api";
import { useProvidersQuery } from "@/features/security/models/api";
import { useCreateScript, useScriptsQuery } from "@/features/security/scripts/api";
import { agentDraftToPayload, mapAgentDto, useAddAgent, useUpdateAgent } from "@/features/security/squad-detail/api";
import type { AgentResponseDto } from "@/features/security/squad-detail/api";
import {
	buildFinalSystemPrompt,
	buildFinalUserPrompt,
	buildQuestionsUserPrompt,
	parseClarifyingQuestions,
	QUESTIONS_SYSTEM_PROMPT,
	type ClarifyingQuestion,
	type PromptLanguage,
	type QuestionAnswer,
} from "./prompt-generation";
import { agentFormSchema, type AgentFormValues } from "./schema";

export type AiGenerationPhase = "idle" | "loadingQuestions" | "answering" | "generating";

type Params = {
	squadId: string;
	onOpenChange: (open: boolean) => void;
	onSaved?: (agent: Agent) => void;
	agent?: Agent;
};

export const useAgentFormDialog = ({ squadId, onOpenChange, onSaved, agent }: Params) => {
	const { data: providers = [] } = useProvidersQuery();
	const { data: scripts = [] } = useScriptsQuery();
	const { data: collections = [] } = useCollectionsQuery();
	const createAgent = useAddAgent(squadId);
	const updateAgent = useUpdateAgent(squadId);
	const createScript = useCreateScript();

	const firstProvider = providers[0];
	const form = useForm<AgentFormValues>({
		mode: "onTouched",
		resolver: zodResolver(agentFormSchema),
		defaultValues: agent
			? {
					name: agent.name,
					role: agent.role,
					providerId: agent.modelRef.providerId,
					model: agent.modelRef.model,
					systemPrompt: agent.systemPrompt,
					character: agent.character,
					accentColor: agent.accentColor,
				}
			: {
					name: "",
					role: "",
					providerId: firstProvider?.id ?? "",
					model: firstProvider?.models[0]?.value ?? "",
					systemPrompt: "",
					character: "Male1",
					accentColor: ACCENT_COLORS[0],
				},
	});

	const [scriptIds, setScriptIds] = useState<string[]>(agent?.scriptIds ?? []);
	const [knowledgeCollectionIds, setKnowledgeCollectionIds] = useState<string[]>(agent?.knowledgeCollectionIds ?? []);
	const [requiresCheckpoint, setRequiresCheckpoint] = useState(agent?.requiresCheckpoint ?? false);
	const [requiresCheckpointAfter, setRequiresCheckpointAfter] = useState(agent?.requiresCheckpointAfter ?? false);
	const [customName, setCustomName] = useState("");
	const [customCommand, setCustomCommand] = useState("");
	const [customArgs, setCustomArgs] = useState("");
	const [customDescription, setCustomDescription] = useState("");
	const [scriptEditorOpen, setScriptEditorOpen] = useState(false);
	const [aiPanelOpen, setAiPanelOpen] = useState(false);
	const [aiBrief, setAiBrief] = useState("");
	const [aiLanguage, setAiLanguage] = useState<PromptLanguage>("pt-BR");
	const [aiPhase, setAiPhase] = useState<AiGenerationPhase>("idle");
	const [aiQuestions, setAiQuestions] = useState<ClarifyingQuestion[]>([]);
	const [aiAnswers, setAiAnswers] = useState<Record<string, string>>({});
	const [streamPreview, setStreamPreview] = useState("");
	// Captured in a ref (not state) so each in-flight call can be aborted without a render round-trip.
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => () => abortRef.current?.abort(), []);

	const providerId = useWatch({ control: form.control, name: "providerId" });
	const model = useWatch({ control: form.control, name: "model" });
	const name = useWatch({ control: form.control, name: "name" });
	const role = useWatch({ control: form.control, name: "role" });
	const character = useWatch({ control: form.control, name: "character" }) as CharacterName;
	const accentColor = useWatch({ control: form.control, name: "accentColor" });
	const systemPrompt = useWatch({ control: form.control, name: "systemPrompt" });
	const selectedProvider = providers.find((provider) => provider.id === providerId);

	const addScript = (script: Script) => {
		if (scriptIds.includes(script.id)) return;
		setScriptIds((prev) => [...prev, script.id]);
	};

	const addCustomScript = async () => {
		if (!customName.trim() || !customCommand.trim()) {
			notify.error("Informe nome e comando da ferramenta.");
			return;
		}
		try {
			const script = await createScript.mutateAsync({
				name: customName.trim(),
				description: customDescription.trim() || undefined,
				kind: "command",
				command: customCommand.trim(),
				args: customArgs.trim() ? customArgs.trim().split(/\s+/) : [],
			});
			setScriptIds((prev) => [...prev, script.id]);
			setCustomName("");
			setCustomCommand("");
			setCustomArgs("");
			setCustomDescription("");
		} catch {
			// useCreateScript already shows the API error toast.
		}
	};

	const removeScript = (id: string) => setScriptIds((prev) => prev.filter((scriptId) => scriptId !== id));

	// Script criado/editado no wizard completo (aberto empilhado sobre este dialog, sem navegar pra fora e
	// perder o que já foi preenchido no agent) — anexa automaticamente, como o "criar comando" rápido faz.
	// O wizard já se fecha sozinho (`onOpenChange(false)`) depois de salvar.
	const handleScriptSaved = (script: Script) => addScript(script);

	// Scripts anexados já implicam execução real - não há estado "só anexado mas não executa".
	const canExecute = scriptIds.length > 0;

	const applyTemplate = (templateId: string) => {
		const template = PROMPT_TEMPLATES.find((item) => item.id === templateId);
		if (!template) return;
		form.setValue("systemPrompt", template.systemPrompt, {
			shouldDirty: true,
			shouldTouch: true,
			shouldValidate: true,
		});
		notify.success(`Template "${template.name}" aplicado - revise antes de salvar.`);
	};

	// Resets the 2-step AI flow back to its initial state. The brief is kept so "Voltar" (the only way
	// back while the brief input is hidden) and a re-generation after success never lose the user's text.
	const resetAiFlow = () => {
		setAiPhase("idle");
		setAiQuestions([]);
		setAiAnswers({});
		setStreamPreview("");
	};

	const toggleAiPanel = () => {
		if (aiPanelOpen) {
			abortRef.current?.abort();
			resetAiFlow();
		}
		setAiPanelOpen(!aiPanelOpen);
	};

	const setAnswer = (id: string, value: string) => {
		setAiAnswers((prev) => ({ ...prev, [id]: value }));
	};

	// Second LLM call - streams into `streamPreview` (local state) only. Never writes chunks into the
	// form: BlockEditor re-parses the whole Markdown document on every external `value` change, so
	// per-chunk `setValue` would cause flicker/races. The form is written once, on "done".
	const runFinalGeneration = async (controller: AbortController, answers: QuestionAnswer[]) => {
		if (!selectedProvider) return;
		setAiPhase("generating");
		setStreamPreview("");
		try {
			const result = await callAgentStep(
				{
					systemPrompt: buildFinalSystemPrompt(aiLanguage),
					prompt: buildFinalUserPrompt({ name, role, brief: aiBrief.trim() }, answers),
					model,
					providerKind: selectedProvider.kind,
					baseUrl: selectedProvider.baseUrl,
					apiKeyRef: selectedProvider.apiKeyRef,
				},
				controller.signal,
				(chunk) => setStreamPreview((prev) => prev + chunk),
			);
			if (controller.signal.aborted) return;
			form.setValue("systemPrompt", result.output, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
			notify.success("Prompt gerado - revise antes de salvar.");
			resetAiFlow();
			// Fecha o sheet sozinho - o resultado já está escrito no editor por trás, não há mais nada pra fazer aqui.
			setAiPanelOpen(false);
		} catch (err) {
			if (controller.signal.aborted) return;
			const message = err instanceof AgentCallError ? err.message : "Falha ao gerar o prompt.";
			notify.error(message);
			setAiPhase(aiQuestions.length > 0 ? "answering" : "idle");
		}
	};

	// First LLM call - asks for 3-6 clarifying questions. Falls back to direct generation (no Q&A)
	// whenever the model's response isn't parseable JSON, instead of blocking the user.
	const startGeneration = async () => {
		if (!selectedProvider) {
			notify.error("Selecione um modelo primeiro.");
			return;
		}
		if (!aiBrief.trim()) {
			notify.error("Descreva em uma frase o que o agent deve fazer.");
			return;
		}

		const controller = new AbortController();
		abortRef.current = controller;
		setAiPhase("loadingQuestions");
		setAiQuestions([]);
		setAiAnswers({});

		try {
			const result = await callAgentStep(
				{
					systemPrompt: QUESTIONS_SYSTEM_PROMPT,
					prompt: buildQuestionsUserPrompt({ name, role, brief: aiBrief.trim() }, aiLanguage),
					model,
					providerKind: selectedProvider.kind,
					baseUrl: selectedProvider.baseUrl,
					apiKeyRef: selectedProvider.apiKeyRef,
				},
				controller.signal,
			);
			if (controller.signal.aborted) return;

			const questions = parseClarifyingQuestions(result.output);
			if (questions && questions.length > 0) {
				setAiQuestions(questions);
				setAiPhase("answering");
			} else {
				await runFinalGeneration(controller, []);
			}
		} catch (err) {
			if (controller.signal.aborted) return;
			const message = err instanceof AgentCallError ? err.message : "Falha ao gerar o prompt.";
			notify.error(message);
			setAiPhase("idle");
		}
	};

	const generateFinal = (withAnswers: boolean) => {
		if (!selectedProvider) {
			notify.error("Selecione um modelo primeiro.");
			return;
		}
		const controller = new AbortController();
		abortRef.current = controller;
		const answers: QuestionAnswer[] = withAnswers
			? aiQuestions
					.map((question) => ({ question: question.question, answer: (aiAnswers[question.id] ?? "").trim() }))
					.filter((answer) => answer.answer !== "")
			: [];
		void runFinalGeneration(controller, answers);
	};

	const cancelGeneration = () => {
		abortRef.current?.abort();
		setStreamPreview("");
		setAiPhase((prev) => (prev === "generating" && aiQuestions.length > 0 ? "answering" : "idle"));
	};

	const submit = form.handleSubmit(async (values) => {
		const draft = {
			name: values.name,
			role: values.role,
			modelRef: { providerId: values.providerId, model: values.model },
			systemPrompt: values.systemPrompt,
			character: values.character as CharacterName,
			gender: genderOf(values.character as CharacterName),
			accentColor: values.accentColor,
			scriptIds,
			knowledgeCollectionIds,
			canExecute,
			requiresCheckpoint,
			requiresCheckpointAfter,
		};
		const payload = agentDraftToPayload(draft);

		try {
			if (agent) {
				await updateAgent.mutateAsync({ id: agent.id, payload });
				notify.success("Agent atualizado");
				onSaved?.({ ...agent, ...draft });
			} else {
				const { data } = await createAgent.mutateAsync(payload);
				notify.success("Agent criado");
				onSaved?.(mapAgentDto(data as AgentResponseDto));
			}
			onOpenChange(false);
		} catch {
			// Agent API hooks already show the API error toast.
		}
	});

	return {
		providers,
		scripts,
		collections,
		createAgent,
		updateAgent,
		createScript,
		form,
		submit,
		values: { providerId, model, character, accentColor, systemPrompt, selectedProvider },
		state: {
			scriptIds,
			knowledgeCollectionIds,
			canExecute,
			requiresCheckpoint,
			requiresCheckpointAfter,
			customName,
			customCommand,
			customArgs,
			customDescription,
			scriptEditorOpen,
			aiPanelOpen,
			aiBrief,
			aiLanguage,
			aiPhase,
			aiQuestions,
			aiAnswers,
			streamPreview,
		},
		actions: {
			setKnowledgeCollectionIds,
			setRequiresCheckpoint,
			setRequiresCheckpointAfter,
			setCustomName,
			setCustomCommand,
			setCustomArgs,
			setCustomDescription,
			setAiBrief,
			addScript,
			addCustomScript,
			removeScript,
			setScriptEditorOpen,
			handleScriptSaved,
			applyTemplate,
			toggleAiPanel,
			setAiLanguage,
			setAnswer,
			startGeneration,
			generateFinal,
			cancelGeneration,
			resetAiFlow,
		},
	};
};
