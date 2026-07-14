import { cn } from "@/app/utils/cn";
import { ChatComposer, SlashCommandMenu } from "@/components";
import type { ModelProvider } from "@/features/security/orchestrator-shared/types";
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
	onModelChange: (providerId: string, model: string) => void;
	onRoutineSelect: (id: string) => void;
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
	onModelChange,
	onRoutineSelect,
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
					<DirectoryControl
						workingDir={workingDir}
						canPickDir={canPickDir}
						onPick={onPickDirectory}
						onClear={onClearDirectory}
					/>
				}
				rightSlot={<ModelPicker providers={providers} providerId={providerId} model={model} onChange={onModelChange} />}
			/>
		</div>
	);
};
