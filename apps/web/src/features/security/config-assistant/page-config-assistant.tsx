import { Rotas } from "@/app/routing/variables";
import { cn } from "@/app/utils/cn";
import { ArtifactPanel, Badge, Button, PreviewModal, Typography, notify } from "@/components";
import {
	useAssistantSessionQuery,
	useCreateAssistantSession,
	useUpdateAssistantSession,
} from "@/features/security/assistant-sessions/api";
import { useProvidersQuery } from "@/features/security/models/api";
import { useConfigAssistantStore } from "@/features/security/orchestrator-shared/model";
import {
	cancelPendingAction,
	confirmPendingAction,
	sendAssistantMessage,
	stopAssistant,
} from "@/features/security/orchestrator-shared/runtime/config-assistant-runtime";
import { Eye, FolderOpen, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AssistantComposer } from "./components/assistant-composer";
import { AssistantEmptyState } from "./components/assistant-empty-state";
import { AssistantThread } from "./components/assistant-thread";
import { ExecutionModeWarning } from "./components/execution-mode-warning";
import { PendingConfirmationBanner } from "./components/pending-confirmation-banner";
import { ASSISTANT_ROUTINES } from "./routines";
import { useConfigAssistantPreview } from "./use-config-assistant-preview";
import { deriveTitle, orchApi } from "./utils";

export const PageConfigAssistant = () => {
	const navigate = useNavigate();
	const { sessionId } = useParams<{ sessionId: string }>();
	const { data: providers = [] } = useProvidersQuery();
	const { data: session } = useAssistantSessionQuery(sessionId);
	const createSession = useCreateAssistantSession();
	const updateSession = useUpdateAssistantSession();

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

	const [input, setInput] = useState("");
	const endRef = useRef<HTMLDivElement>(null);
	const wasRunning = useRef(false);
	const { previewOpen, previewItems, canShowDesign, setPreviewOpen, openDesignPreview, openHtmlPreview } =
		useConfigAssistantPreview({ workingDir, artifacts });

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
			onModelChange={setModel}
			onRoutineSelect={applyRoutine}
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

			<PreviewModal
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				title="Preview do design"
				items={previewItems}
				onApprove={() => sendIfPossible("Aprovado. Pode finalizar.")}
				onRequestChanges={(feedback) => sendIfPossible(`Ajuste: ${feedback}`)}
			/>
		</div>
	);
};
