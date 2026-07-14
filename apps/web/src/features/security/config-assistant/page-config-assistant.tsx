import { Rotas } from "@/app/routing/variables";
import { cn } from "@/app/utils/cn";
import { ArtifactPanel, Badge, Button, PreviewModal, Typography, notify } from "@/components";
import {
	useAssistantSessionQuery,
	useCreateAssistantSession,
	useUpdateAssistantSession,
} from "@/features/security/assistant-sessions/api";
import { commandTemplates } from "@/features/security/commands/data/command-templates";
import { useCollectionsQuery } from "@/features/security/knowledge/api";
import { useMyExploreAssetsQuery, usePublishExploreAsset, type ExploreAsset } from "@/features/public/explore/api";
import { useProvidersQuery } from "@/features/security/models/api";
import { useConfigAssistantStore } from "@/features/security/orchestrator-shared/model";
import type { ConfigAssistantMessageAction } from "@/features/security/orchestrator-shared/model";
import {
	cancelPendingAction,
	confirmPendingAction,
	sendAssistantMessage,
	stopAssistant,
} from "@/features/security/orchestrator-shared/runtime/config-assistant-runtime";
import { useScriptsQuery } from "@/features/security/scripts/api";
import { skillTemplates } from "@/features/security/skills/data/skill-templates";
import { useSquadsQuery } from "@/features/security/squads/api";
import { Eye, FolderOpen, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AssistantComposer } from "./components/assistant-composer";
import { AssistantEmptyState } from "./components/assistant-empty-state";
import { AssistantThread } from "./components/assistant-thread";
import {
	AssistantActiveContextPanel,
	AssistantResourceSheet,
	type AssistantWorkspaceResource,
} from "./components/assistant-workspace-panels";
import { ExecutionModeWarning } from "./components/execution-mode-warning";
import { PendingConfirmationBanner } from "./components/pending-confirmation-banner";
import { ASSISTANT_ROUTINES } from "./routines";
import { useConfigAssistantPreview } from "./use-config-assistant-preview";
import { deriveTitle, orchApi } from "./utils";

const staticWorkspaceResources: AssistantWorkspaceResource[] = [
	{
		id: "skill:create-skill",
		kind: "skill",
		title: "Criar skill",
		description: "Estruture uma skill reutilizavel com objetivo, gatilhos e passos claros.",
		actionLabel: "Usar",
		prompt:
			"Me ajude a criar uma skill nova. Quero que ela tenha objetivo, gatilhos, entradas, passos e checklist de qualidade.",
	},
	{
		id: "skill:review-plan",
		kind: "skill",
		title: "Revisar plano",
		description: "Transforme uma ideia solta em tarefas executaveis.",
		actionLabel: "Planejar",
		prompt: "Transforme esta ideia em um plano com fases, tarefas, riscos e definicao de pronto: ",
	},
];

const getAssetPrompt = (asset: ExploreAsset): string => {
	const payload = asset.payload;
	const content =
		payload && typeof payload === "object" && "content" in payload && typeof payload.content === "string"
			? payload.content
			: null;

	if (asset.kind === "SKILL" && content) {
		return `Use esta skill salva no Workestrator como contexto:\n\n${content}\n\nMinha tarefa: `;
	}

	return `Use o recurso "${asset.title}" (${asset.kind}) como contexto para esta tarefa: ${asset.description}\n\n`;
};

const getAssetResourceKind = (asset: ExploreAsset): AssistantWorkspaceResource["kind"] => {
	if (asset.kind === "SQUAD") return "squad";
	if (asset.kind === "KNOWLEDGE") return "knowledge";
	if (asset.kind === "SCRIPT") return "script";
	if (asset.kind === "SKILL") return "skill";
	if (asset.kind === "MCP") return "mcp";
	return "command";
};

export const PageConfigAssistant = () => {
	const navigate = useNavigate();
	const { sessionId } = useParams<{ sessionId: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const { data: providers = [] } = useProvidersQuery();
	const { data: squads = [] } = useSquadsQuery();
	const { data: collections = [] } = useCollectionsQuery();
	const { data: scripts = [] } = useScriptsQuery();
	const { data: myAssetsPage, refetch: refetchMyAssets } = useMyExploreAssetsQuery({ page: 0, size: 100 });
	const { data: session } = useAssistantSessionQuery(sessionId);
	const createSession = useCreateAssistantSession();
	const updateSession = useUpdateAssistantSession();
	const publishAsset = usePublishExploreAsset();

	const messages = useConfigAssistantStore((state) => state.messages);
	const isRunning = useConfigAssistantStore((state) => state.isRunning);
	const streamingText = useConfigAssistantStore((state) => state.streamingText);
	const pendingConfirmation = useConfigAssistantStore((state) => state.pendingConfirmation);
	const providerId = useConfigAssistantStore((state) => state.providerId);
	const model = useConfigAssistantStore((state) => state.model);
	const workingDir = useConfigAssistantStore((state) => state.workingDir);
	const activeSessionId = useConfigAssistantStore((state) => state.activeSessionId);
	const activity = useConfigAssistantStore((state) => state.activity);
	const artifacts = useConfigAssistantStore((state) => state.artifacts);
	const { hydrate, reset, setModel, setWorkingDir, setActiveSessionId, clearActivity } =
		useConfigAssistantStore.getState();

	const [input, setInput] = useState(() => searchParams.get("prompt") ?? "");
	const [resourceQuery, setResourceQuery] = useState("");
	const [resourceSheetOpen, setResourceSheetOpen] = useState(false);
	const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
	const endRef = useRef<HTMLDivElement>(null);
	const wasRunning = useRef(false);
	const { previewOpen, previewItems, canShowDesign, setPreviewOpen, openDesignPreview, openHtmlPreview } =
		useConfigAssistantPreview({ workingDir, artifacts });

	useEffect(() => {
		const prompt = searchParams.get("prompt");
		if (!prompt) return;

		const nextSearchParams = new URLSearchParams(searchParams);
		nextSearchParams.delete("prompt");
		setSearchParams(nextSearchParams, { replace: true });
	}, [searchParams, setSearchParams]);

	useEffect(() => {
		if (!sessionId) {
			if (activeSessionId !== null) reset();
			return;
		}
		if (sessionId !== activeSessionId && session) {
			hydrate({
				id: session.id,
				providerId: session.providerId,
				model: session.model,
				workingDir: session.workingDir,
				messages: session.messages,
			});
		}
	}, [sessionId, session, activeSessionId, hydrate, reset]);

	useEffect(() => {
		endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
	}, [messages.length, streamingText, isRunning]);

	useEffect(() => {
		const finished = wasRunning.current && !isRunning;
		wasRunning.current = isRunning;
		if (!finished) return;

		const state = useConfigAssistantStore.getState();
		if (state.messages.length === 0 || state.pendingConfirmation) return;

		const payload = {
			title: deriveTitle(state.messages),
			providerId: state.providerId ?? undefined,
			model: state.model ?? undefined,
			workingDir: state.workingDir,
			messages: state.messages,
		};

		const persist = async () => {
			try {
				if (!state.activeSessionId) {
					const created = await createSession.mutateAsync(payload);
					setActiveSessionId(created.id);
					navigate(`${Rotas.protegidas.orchestrator.assistant}/${created.id}`, { replace: true });
				} else {
					await updateSession.mutateAsync({ id: state.activeSessionId, payload });
				}
			} catch {
				notify.error("Não foi possível salvar a conversa no servidor. Ela segue disponível nesta sessão.");
			}
		};
		void persist();
	}, [isRunning, createSession, updateSession, navigate, setActiveSessionId]);

	const selectedProvider = providers.find((provider) => provider.id === providerId);
	const executionMode = Boolean(workingDir?.trim()) && selectedProvider?.kind === "claude-cli";
	const canPickDir = Boolean(orchApi()?.selectPath);
	const hasProviders = providers.length > 0;
	const hasConversation = messages.length > 0 || isRunning || streamingText.length > 0;
	const hasPanel = isRunning || activity.length > 0 || Boolean(artifacts.diff) || Boolean(artifacts.terminal);
	const canSend = Boolean(selectedProvider && model) && !isRunning && !pendingConfirmation && input.trim().length > 0;
	const panelActivity =
		isRunning && activity.length === 0
			? [{ id: "starting", kind: "step" as const, label: "Iniciando", detail: "Preparando a execução." }]
			: activity;
	const currentTitle = activeSessionId ? deriveTitle(messages) : "Assistente";
	const currentModelLabel = selectedProvider && model ? `${selectedProvider.label} / ${model}` : "Modelo não definido";

	const workspaceResources = useMemo<AssistantWorkspaceResource[]>(() => {
		const commandResources = commandTemplates.map((command) => ({
			id: `command-template:${command.id}`,
			kind: "command" as const,
			title: command.title,
			description: command.description,
			actionLabel: "Usar",
			prompt: command.prompt,
		}));
		const routineResources = ASSISTANT_ROUTINES.map((routine) => ({
			id: `command:${routine.id}`,
			kind: "command" as const,
			title: routine.title,
			description: routine.hint ?? "Comando rapido do assistente.",
			actionLabel: "Inserir",
			prompt: routine.template,
		}));
		const squadResources = squads.map((squad) => ({
			id: `squad:${squad.id}`,
			kind: "squad" as const,
			title: squad.name,
			description: squad.description || "Executar ou consultar este squad.",
			actionLabel: "Usar",
			prompt: `Use o squad "${squad.name}" como contexto para esta tarefa: `,
		}));
		const knowledgeResources = collections.map((collection) => ({
			id: `knowledge:${collection.id}`,
			kind: "knowledge" as const,
			title: collection.name,
			description: collection.description || `${collection.documentCount} documentos disponiveis para contexto.`,
			actionLabel: "Anexar",
			prompt: `Considere a base de conhecimento "${collection.name}" para responder: `,
		}));
		const scriptResources = scripts.map((script) => ({
			id: `script:${script.id}`,
			kind: "script" as const,
			title: script.name,
			description: script.description || `Ferramenta do tipo ${script.kind}.`,
			actionLabel: "Usar",
			prompt: `Use a ferramenta "${script.name}" quando fizer sentido para esta tarefa: `,
		}));
		const skillResources = skillTemplates.map((skill) => ({
			id: `skill:${skill.id}`,
			kind: "skill" as const,
			title: skill.name,
			description: skill.description,
			actionLabel: "Usar",
			prompt: `Use esta skill como contexto:\n\n${skill.content}\n\nMinha tarefa: `,
		}));
		const savedAssetResources = (myAssetsPage?.data ?? []).map((asset) => ({
			id: `asset:${asset.id}`,
			kind: getAssetResourceKind(asset),
			title: asset.title,
			description: `${asset.visibility === "PUBLIC" ? "Público" : "Privado"} · ${asset.description}`,
			actionLabel: "Usar",
			prompt: getAssetPrompt(asset),
		}));

		return [
			...savedAssetResources,
			...commandResources,
			...routineResources,
			...squadResources,
			...knowledgeResources,
			...scriptResources,
			...skillResources,
			...staticWorkspaceResources,
		];
	}, [collections, myAssetsPage?.data, scripts, squads]);
	const filteredWorkspaceResources = useMemo(() => {
		const normalizedQuery = resourceQuery.trim().toLowerCase();
		if (!normalizedQuery) return workspaceResources;

		return workspaceResources.filter((resource) =>
			`${resource.title} ${resource.description} ${resource.kind}`.toLowerCase().includes(normalizedQuery),
		);
	}, [resourceQuery, workspaceResources]);
	const selectedResources = useMemo(
		() => workspaceResources.filter((resource) => selectedResourceIds.includes(resource.id)),
		[selectedResourceIds, workspaceResources],
	);

	const pickDirectory = async () => {
		const path = await orchApi()?.selectPath?.();
		if (path) setWorkingDir(path);
	};

	const submit = () => {
		if (!canSend || !selectedProvider || !model) return;
		sendAssistantMessage(input, selectedProvider, model);
		setInput("");
	};

	const applyRoutine = (id: string) => {
		const routine = ASSISTANT_ROUTINES.find((item) => item.id === id);
		if (routine) setInput(routine.template);
	};

	const toggleResource = (id: string) => {
		setSelectedResourceIds((current) =>
			current.includes(id) ? current.filter((resourceId) => resourceId !== id) : [...current, id],
		);
	};

	const applyWorkspaceResource = (resource: AssistantWorkspaceResource) => {
		setInput((current) => {
			if (!current.trim()) return resource.prompt;
			return `${current.trim()}\n\n${resource.prompt}`;
		});
		setSelectedResourceIds((current) => (current.includes(resource.id) ? current : [...current, resource.id]));
	};

	const handleMessageAction = (action: ConfigAssistantMessageAction) => {
		if (action.type === "open_resources") {
			void refetchMyAssets();
			setResourceSheetOpen(true);
			return;
		}
		if (action.type === "publish_asset") {
			publishAsset.mutate(action.assetId);
		}
	};

	const sendIfPossible = (text: string) => {
		if (selectedProvider && model) sendAssistantMessage(text, selectedProvider, model);
	};

	const composer = (className?: string) => (
		<AssistantComposer
			className={className}
			input={input}
			isRunning={isRunning}
			canSend={canSend}
			disabled={Boolean(pendingConfirmation)}
			executionMode={executionMode}
			workingDir={workingDir}
			canPickDir={canPickDir}
			providers={providers}
			providerId={providerId}
			model={model}
			routines={ASSISTANT_ROUTINES}
			onInputChange={setInput}
			onSubmit={submit}
			onStop={stopAssistant}
			onPickDirectory={pickDirectory}
			onClearDirectory={() => setWorkingDir(null)}
			onOpenResources={() => setResourceSheetOpen(true)}
			onModelChange={setModel}
			onRoutineSelect={applyRoutine}
			attachedResourcesCount={selectedResources.length}
		/>
	);

	return (
		<div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-6 py-4">
			<div
				className={cn(
					"mx-auto flex h-full min-h-0 flex-1 flex-col overflow-hidden",
					hasPanel ? "max-w-4xl" : "max-w-5xl",
				)}
			>
				{hasConversation && (
					<div className="mx-auto flex w-full max-w-3xl shrink-0 items-center gap-3 px-1 pb-3">
						<div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
							<Sparkles className="size-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex min-w-0 items-center gap-2">
								<Typography variant="title-sm" as="h1" className="min-w-0 truncate">
									{currentTitle}
								</Typography>
								{isRunning && <Badge variant="secondary">Executando</Badge>}
							</div>
							<div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
								<Typography variant="caption" className="text-muted-foreground truncate">
									{currentModelLabel}
								</Typography>
								{workingDir && (
									<div className="text-muted-foreground flex min-w-0 items-center gap-1 truncate" title={workingDir}>
										<FolderOpen className="size-3 shrink-0" />
										<Typography variant="caption" as="span" className="truncate">
											{workingDir.split(/[/\\]/).pop() || workingDir}
										</Typography>
									</div>
								)}
							</div>
						</div>
						{canShowDesign && (
							<Button variant="outline" size="sm" onClick={openDesignPreview} disabled={isRunning}>
								<Eye className="size-4" />
								Ver design
							</Button>
						)}
					</div>
				)}

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					{hasConversation ? (
						<AssistantThread
							messages={messages}
							isRunning={isRunning}
							streamingText={streamingText}
							endRef={endRef}
							onOpenHtmlPreview={openHtmlPreview}
							onMessageAction={handleMessageAction}
						/>
					) : (
						<AssistantEmptyState
							hasProviders={hasProviders}
							routines={ASSISTANT_ROUTINES}
							composer={composer("w-full")}
							onRoutineClick={setInput}
						/>
					)}
				</div>

				{(pendingConfirmation || executionMode) && (
					<div className="mx-auto w-full max-w-3xl shrink-0 px-1 pt-3">
						<PendingConfirmationBanner
							pendingConfirmation={pendingConfirmation}
							onCancel={cancelPendingAction}
							onConfirm={confirmPendingAction}
						/>
						<ExecutionModeWarning executionMode={executionMode} workingDir={workingDir} />
					</div>
				)}

				{hasProviders && hasConversation && (
					<div className="mx-auto w-full max-w-3xl shrink-0 px-1 pt-3 pb-1">{composer()}</div>
				)}
			</div>

			{hasPanel && (
				<div className="hidden w-[440px] shrink-0 lg:block">
					<ArtifactPanel
						activity={panelActivity}
						diff={artifacts.diff}
						terminal={artifacts.terminal}
						enablePreview={false}
						onClose={clearActivity}
					/>
				</div>
			)}

			{!hasPanel && (
				<AssistantActiveContextPanel
					selectedResources={selectedResources}
					selectedProviderLabel={currentModelLabel}
					workingDir={workingDir}
					onClearResource={(id) =>
						setSelectedResourceIds((current) => current.filter((resourceId) => resourceId !== id))
					}
				/>
			)}

			<PreviewModal
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				title="Preview do design"
				items={previewItems}
				onApprove={() => sendIfPossible("Aprovado. Pode finalizar.")}
				onRequestChanges={(feedback) => sendIfPossible(`Ajuste: ${feedback}`)}
			/>
			<AssistantResourceSheet
				open={resourceSheetOpen}
				onOpenChange={setResourceSheetOpen}
				resources={filteredWorkspaceResources}
				query={resourceQuery}
				selectedResourceIds={selectedResourceIds}
				onQueryChange={setResourceQuery}
				onToggleResource={toggleResource}
				onUseResource={(resource) => {
					applyWorkspaceResource(resource);
					setResourceSheetOpen(false);
				}}
			/>
		</div>
	);
};
