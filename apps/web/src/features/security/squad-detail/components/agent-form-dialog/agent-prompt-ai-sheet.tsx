import {
	AppSheet,
	Button,
	FieldWrapper,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Textarea,
	Typography,
} from "@/components";
import { providerExecutes } from "@/features/security/orchestrator-shared/data/providers";
import type { ModelProvider } from "@/features/security/orchestrator-shared/types";
import { LoaderCircle, Wand2 } from "lucide-react";
import { PROMPT_LANGUAGES, type ClarifyingQuestion, type PromptLanguage } from "./prompt-generation";
import type { AiGenerationPhase } from "./use-agent-form-dialog";

type Props = {
	open: boolean;
	selectedProvider: ModelProvider | undefined;
	aiBrief: string;
	aiLanguage: PromptLanguage;
	aiPhase: AiGenerationPhase;
	aiQuestions: ClarifyingQuestion[];
	aiAnswers: Record<string, string>;
	streamPreview: string;
	toggleAiPanel: () => void;
	setAiBrief: (value: string) => void;
	setAiLanguage: (value: PromptLanguage) => void;
	setAnswer: (id: string, value: string) => void;
	startGeneration: () => void;
	generateFinal: (withAnswers: boolean) => void;
	cancelGeneration: () => void;
	resetAiFlow: () => void;
};

const PHASE_DESCRIPTION: Record<AiGenerationPhase, string> = {
	idle: "Descreva o agent em uma frase e deixe a IA escrever o system prompt.",
	loadingQuestions: "Analisando o brief para levantar as perguntas certas...",
	answering: "Responda o que souber - toda pergunta é opcional e melhora o prompt final.",
	generating: "Gerando o prompt com base nas respostas...",
};

/**
 * Sheet dedicado (empilhado sobre o `AgentFormDialog`, mesmo padrão do `ScriptFormDialog`) para o fluxo
 * de geração de prompt por IA — antes vivia como um card inline dentro da aba Prompt, disputando espaço
 * com o editor do system prompt logo abaixo. Fecha sozinho quando a geração termina com sucesso.
 */
export const AgentPromptAiSheet = ({
	open,
	selectedProvider,
	aiBrief,
	aiLanguage,
	aiPhase,
	aiQuestions,
	aiAnswers,
	streamPreview,
	toggleAiPanel,
	setAiBrief,
	setAiLanguage,
	setAnswer,
	startGeneration,
	generateFinal,
	cancelGeneration,
	resetAiFlow,
}: Props) => (
	<AppSheet
		open={open}
		onOpenChange={toggleAiPanel}
		title="Gerar prompt com IA"
		description={PHASE_DESCRIPTION[aiPhase]}
		contentClassName="sm:max-w-lg"
		headerLeading={
			<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
				<Wand2 className="size-5" />
			</div>
		}
		footer={
			aiPhase === "idle" ? (
				<>
					<Button variant="outline" size="sm" onClick={toggleAiPanel}>
						Cancelar
					</Button>
					<Button size="sm" disabled={!aiBrief.trim()} onClick={startGeneration}>
						<Wand2 />
						Gerar
					</Button>
				</>
			) : aiPhase === "answering" ? (
				<>
					<Button variant="ghost" size="sm" onClick={resetAiFlow}>
						Voltar
					</Button>
					<Button variant="outline" size="sm" onClick={() => generateFinal(false)}>
						Pular e gerar direto
					</Button>
					<Button size="sm" onClick={() => generateFinal(true)}>
						Gerar prompt
					</Button>
				</>
			) : (
				<Button variant="outline" size="sm" onClick={cancelGeneration}>
					Cancelar
				</Button>
			)
		}
	>
		{(aiPhase === "idle" || aiPhase === "loadingQuestions") && (
			<div className="flex flex-col gap-4">
				<Input
					label="Descreva o agent em uma frase"
					placeholder="Ex.: revisa textos de marketing e aponta erros de tom"
					value={aiBrief}
					disabled={aiPhase !== "idle"}
					onChange={(event) => setAiBrief(event.target.value)}
					autoFocus
				/>
				<FieldWrapper label="Idioma do prompt">
					<Select
						value={aiLanguage}
						disabled={aiPhase !== "idle"}
						onValueChange={(value) => setAiLanguage(value as PromptLanguage)}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PROMPT_LANGUAGES.map((language) => (
								<SelectItem key={language.value} value={language.value}>
									{language.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FieldWrapper>
				{aiPhase === "loadingQuestions" && (
					<div className="text-muted-foreground flex items-center gap-2">
						<LoaderCircle className="size-4 animate-spin" />
						<Typography variant="body-sm" as="span">
							Analisando...
						</Typography>
					</div>
				)}
				{selectedProvider && !providerExecutes(selectedProvider.kind) && (
					<Typography variant="caption" className="text-muted-foreground">
						O provider "{selectedProvider.label}" ainda não executa de verdade nesta versão. Use um CLI local
						(Claude/Codex/GPT) ou um endpoint OpenAI-compat (ex.: Ollama em http://localhost:11434/v1).
					</Typography>
				)}
			</div>
		)}

		{aiPhase === "answering" && (
			<div className="flex flex-col gap-4">
				{aiQuestions.map((question) => (
					<Textarea
						key={question.id}
						id={`ai-question-${question.id}`}
						label={question.question}
						description={question.hint}
						rows={3}
						value={aiAnswers[question.id] ?? ""}
						onChange={(event) => setAnswer(question.id, event.target.value)}
					/>
				))}
			</div>
		)}

		{aiPhase === "generating" && (
			<div className="flex flex-col gap-3">
				<div className="text-muted-foreground flex items-center gap-2">
					<LoaderCircle className="size-4 animate-spin" />
					<Typography variant="body-sm" as="span">
						Gerando prompt...
					</Typography>
				</div>
				{streamPreview && (
					<pre className="bg-muted/40 text-muted-foreground max-h-96 overflow-y-auto rounded-md border p-3 font-mono text-xs whitespace-pre-wrap">
						{streamPreview}
					</pre>
				)}
			</div>
		)}
	</AppSheet>
);
