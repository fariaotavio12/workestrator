import { AppSheet, Button, EmptyState, Tabs, TabsContent, TabsContents, TabsList, TabsTrigger } from "@/components";
import { ScriptFormDialog } from "@/components/orchestrator";
import { Bot, Cpu, Library, Plus, Sparkles, UserRound, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Rotas } from "@/app/routing/variables";
import type { Agent } from "@/features/security/orchestrator-shared/types";
import { AgentKnowledgeTab } from "./agent-form-dialog/agent-knowledge-tab";
import { AgentProfileTab } from "./agent-form-dialog/agent-profile-tab";
import { AgentPromptAiSheet } from "./agent-form-dialog/agent-prompt-ai-sheet";
import { AgentPromptTab } from "./agent-form-dialog/agent-prompt-tab";
import { AgentToolsTab } from "./agent-form-dialog/agent-tools-tab";
import { useAgentFormDialog } from "./agent-form-dialog/use-agent-form-dialog";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	squadId: string;
	onSaved?: (agent: Agent) => void;
	agent?: Agent;
};

export const AgentFormDialog = ({ open, onOpenChange, squadId, onSaved, agent }: Props) => {
	if (!open) return null;
	return (
		<AgentFormDialogContent open={open} onOpenChange={onOpenChange} squadId={squadId} onSaved={onSaved} agent={agent} />
	);
};

const AgentFormDialogContent = ({ open, onOpenChange, squadId, onSaved, agent }: Props) => {
	const navigate = useNavigate();
	const {
		providers,
		scripts,
		collections,
		createAgent,
		updateAgent,
		createScript,
		form,
		submit,
		values,
		state,
		actions,
	} = useAgentFormDialog({
		squadId,
		onOpenChange,
		onSaved,
		agent,
	});
	const {
		register,
		setValue,
		formState: { errors },
	} = form;
	const { providerId, model, character, usedCharacters, accentColor, systemPrompt, selectedProvider } = values;
	const {
		scriptIds,
		knowledgeCollectionIds,
		authBindings,
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
	} = state;
	const {
		setKnowledgeCollectionIds,
		setScriptAuthConnection,
		setCanExecute,
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
	} = actions;
	const isEdit = Boolean(agent);
	const hasProviders = providers.length > 0;

	if (!hasProviders) {
		return (
			<AppSheet
				open={open}
				onOpenChange={onOpenChange}
				title={isEdit ? "Editar agent" : "Novo agent"}
				description="Conecte um modelo antes de configurar agents."
				contentClassName="sm:max-w-lg"
				headerLeading={
					<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
						<Bot className="size-5" />
					</div>
				}
			>
				<EmptyState
					icon={Cpu}
					title="Nenhum provider cadastrado"
					message="Conecte um modelo primeiro - sem ele não dá para escolher o provider/modelo do agent."
					onAction={() => {
						onOpenChange(false);
						navigate(Rotas.protegidas.orchestrator.models);
					}}
					actionLabel="Conectar modelo"
					actionIcon={<Plus />}
				/>
			</AppSheet>
		);
	}

	return (
		<>
			<AppSheet
				open={open}
				onOpenChange={onOpenChange}
				title={isEdit ? "Editar agent" : "Novo agent"}
				description="Defina a identidade, o modelo, o prompt e os scripts do agent."
				contentClassName="sm:max-w-3xl"
				bodyClassName="p-0"
				headerLeading={
					<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
						<Bot className="size-5" />
					</div>
				}
				footer={
					<>
						<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button type="submit" form="agent-form" size="sm" disabled={createAgent.isPending || updateAgent.isPending}>
							{isEdit ? "Salvar" : "Criar agent"}
						</Button>
					</>
				}
			>
				<form id="agent-form" onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
					<Tabs defaultValue="profile" className="min-h-0 flex-1 gap-0">
						<div className="border-border bg-background sticky top-0 z-10 border-b px-6 py-4">
							<TabsList className="grid h-auto w-full grid-cols-4" activeClassName="rounded-md">
								<TabsTrigger value="profile" className="w-full gap-2 text-center">
									<UserRound className="size-4" />
									Perfil
								</TabsTrigger>
								<TabsTrigger value="prompt" className="w-full gap-2 text-center">
									<Sparkles className="size-4" />
									Prompt
								</TabsTrigger>
								<TabsTrigger value="tools" className="w-full gap-2 text-center">
									<Wrench className="size-4" />
									Scripts
								</TabsTrigger>
								<TabsTrigger value="knowledge" className="w-full gap-2 text-center">
									<Library className="size-4" />
									Conhecimento
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContents className="min-h-0 flex-1 overflow-y-auto">
							<TabsContent value="profile" className="px-6 py-6">
								<AgentProfileTab
									providers={providers}
									providerId={providerId}
									model={model}
									character={character}
									usedCharacters={usedCharacters}
									accentColor={accentColor}
									requiresCheckpoint={requiresCheckpoint}
									requiresCheckpointAfter={requiresCheckpointAfter}
									canExecute={state.canExecute}
									errors={errors}
									register={register}
									setValue={setValue}
									setRequiresCheckpoint={setRequiresCheckpoint}
									setRequiresCheckpointAfter={setRequiresCheckpointAfter}
									setCanExecute={setCanExecute}
								/>
							</TabsContent>

							<TabsContent value="prompt" className="px-6 py-6">
								<AgentPromptTab
									systemPrompt={systemPrompt}
									errors={errors}
									setValue={setValue}
									applyTemplate={applyTemplate}
									toggleAiPanel={toggleAiPanel}
								/>
							</TabsContent>

							<TabsContent value="tools" className="overflow-y-auto px-6 py-6">
								<AgentToolsTab
									scripts={scripts}
									scriptIds={scriptIds}
									authBindings={authBindings}
									onAuthConnectionChange={setScriptAuthConnection}
									customName={customName}
									customCommand={customCommand}
									customArgs={customArgs}
									customDescription={customDescription}
									isCreatingScript={createScript.isPending}
									setCustomName={setCustomName}
									setCustomCommand={setCustomCommand}
									setCustomArgs={setCustomArgs}
									setCustomDescription={setCustomDescription}
									addScript={addScript}
									addCustomScript={addCustomScript}
									removeScript={removeScript}
									onCreateScript={() => setScriptEditorOpen(true)}
								/>
							</TabsContent>

							<TabsContent value="knowledge" className="px-6 py-6">
								<AgentKnowledgeTab
									collections={collections}
									knowledgeCollectionIds={knowledgeCollectionIds}
									setKnowledgeCollectionIds={setKnowledgeCollectionIds}
								/>
							</TabsContent>
						</TabsContents>
					</Tabs>
				</form>
			</AppSheet>

			<ScriptFormDialog open={scriptEditorOpen} onOpenChange={setScriptEditorOpen} onSaved={handleScriptSaved} />
			<AgentPromptAiSheet
				open={aiPanelOpen}
				selectedProvider={selectedProvider}
				aiBrief={aiBrief}
				aiLanguage={aiLanguage}
				aiPhase={aiPhase}
				aiQuestions={aiQuestions}
				aiAnswers={aiAnswers}
				streamPreview={streamPreview}
				toggleAiPanel={toggleAiPanel}
				setAiBrief={setAiBrief}
				setAiLanguage={setAiLanguage}
				setAnswer={setAnswer}
				startGeneration={startGeneration}
				generateFinal={generateFinal}
				cancelGeneration={cancelGeneration}
				resetAiFlow={resetAiFlow}
			/>
		</>
	);
};
