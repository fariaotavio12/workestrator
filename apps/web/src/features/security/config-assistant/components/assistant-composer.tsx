import { cn } from "@/app/utils/cn";
import { Button, ChatComposer, SlashCommandMenu } from "@/components";
import type { ModelProvider } from "@/features/security/orchestrator-shared/types";
import { Library } from "lucide-react";
import type { AssistantRoutine } from "../routines";
import { DirectoryControl } from "./directory-control";
import { ModelPicker } from "./model-picker";

type Props = {
	className?: string;
	input: string;
	isRunning: boolean;
	canSend: boolean;
	disabled: boolean;
	executionMode: boolean;
	workingDir: string | null;
	canPickDir: boolean;
	providers: ModelProvider[];
	providerId: string | null;
	model: string | null;
	routines: AssistantRoutine[];
	onInputChange: (value: string) => void;
	onSubmit: () => void;
	onStop: () => void;
	onPickDirectory: () => void;
	onClearDirectory: () => void;
	onOpenResources: () => void;
	onModelChange: (providerId: string, model: string) => void;
	onRoutineSelect: (id: string) => void;
	attachedResourcesCount: number;
};

export const AssistantComposer = ({
	className,
	input,
	isRunning,
	canSend,
	disabled,
	executionMode,
	workingDir,
	canPickDir,
	providers,
	providerId,
	model,
	routines,
	onInputChange,
	onSubmit,
	onStop,
	onPickDirectory,
	onClearDirectory,
	onOpenResources,
	onModelChange,
	onRoutineSelect,
	attachedResourcesCount,
}: Props) => {
	const slashOpen = input.startsWith("/") && !input.includes(" ") && !input.includes("\n");

	return (
		<div className={cn("relative", className)}>
			<SlashCommandMenu open={slashOpen} query={input} items={routines} onSelect={onRoutineSelect} />
			<ChatComposer
				value={input}
				onChange={onInputChange}
				onSubmit={onSubmit}
				onStop={onStop}
				isRunning={isRunning}
				canSend={canSend}
				disabled={disabled}
				placeholder={
					executionMode
						? "Descreva a tarefa no diretório... (/ para rotinas)"
						: "Digite sua mensagem... (/ para rotinas)"
				}
				leftSlot={
					<div className="flex items-center gap-1">
						<DirectoryControl
							workingDir={workingDir}
							canPickDir={canPickDir}
							onPick={onPickDirectory}
							onClear={onClearDirectory}
						/>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-muted-foreground hover:text-foreground h-6 gap-1 rounded-md px-1.5 text-xs"
							onClick={onOpenResources}
						>
							<Library className="size-3.5" />
							Recursos
							{attachedResourcesCount > 0 && (
								<span className="bg-primary text-primary-foreground ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none">
									{attachedResourcesCount}
								</span>
							)}
						</Button>
					</div>
				}
				rightSlot={<ModelPicker providers={providers} providerId={providerId} model={model} onChange={onModelChange} />}
			/>
		</div>
	);
};
