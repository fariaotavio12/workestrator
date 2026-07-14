import { cn } from "@/app/utils/cn";
import {
	BlockEditor,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
	FieldWrapper,
	Typography,
} from "@/components";
import { PROMPT_TEMPLATES } from "@/features/security/orchestrator-shared/data/prompt-templates";
import { Download, Wand2 } from "lucide-react";
import type { FieldErrors, UseFormSetValue } from "react-hook-form";
import type { AgentFormValues } from "./schema";

type Props = {
	systemPrompt: string;
	errors: FieldErrors<AgentFormValues>;
	setValue: UseFormSetValue<AgentFormValues>;
	applyTemplate: (templateId: string) => void;
	toggleAiPanel: () => void;
};

export const AgentPromptTab = ({ systemPrompt, errors, setValue, applyTemplate, toggleAiPanel }: Props) => (
	<div className="flex flex-col gap-4">
		<div className="flex flex-wrap items-center justify-between gap-3">
			<div className="min-w-0">
				<Typography variant="title-sm">Prompt</Typography>
				<Typography variant="body-sm" className="text-muted-foreground">
					Escreva a mao, gere com IA ou importe um template por papel.
				</Typography>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button type="button" variant="outline" size="sm">
							<Download />
							Importar
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-64">
						<DropdownMenuLabel>Templates por papel</DropdownMenuLabel>
						{PROMPT_TEMPLATES.map((template) => (
							<DropdownMenuItem key={template.id} onClick={() => applyTemplate(template.id)}>
								<div className="flex min-w-0 flex-col">
									<span className="truncate">{template.name}</span>
									<span className="text-muted-foreground truncate text-xs">{template.description}</span>
								</div>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
				<Button type="button" variant="outline" size="sm" onClick={toggleAiPanel}>
					<Wand2 />
					Gerar com IA
				</Button>
			</div>
		</div>

		<FieldWrapper
			label="O que o agent faz (system prompt)"
			description="Use blocos, listas, titulos e tabelas. O conteudo salvo continua em Markdown."
			error={errors.systemPrompt?.message}
		>
			<div
				className={cn(
					"border-input-border bg-background overflow-hidden rounded-lg border",
					errors.systemPrompt &&
						"border-destructive/45 focus-within:border-destructive focus-within:ring-destructive/10",
				)}
			>
				<BlockEditor
					value={systemPrompt}
					onChange={(value) =>
						setValue("systemPrompt", value, {
							shouldDirty: true,
							shouldTouch: true,
							shouldValidate: true,
						})
					}
				/>
			</div>
		</FieldWrapper>
	</div>
);
