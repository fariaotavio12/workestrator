import { cn } from "@/app/utils/cn";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Typography,
} from "@/components";
import type { ModelProvider } from "@/features/security/orchestrator-shared/types";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

type Props = {
	providers: ModelProvider[];
	providerId: string | null;
	model: string | null;
	onChange: (providerId: string, model: string) => void;
};

export const ModelPicker = ({ providers, providerId, model, onChange }: Props) => {
	const [open, setOpen] = useState(false);
	const selectedProvider = providers.find((provider) => provider.id === providerId);
	const selectedLabel = selectedProvider?.models.find((item) => item.value === model)?.label ?? model;

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-6 max-w-52 items-center gap-1 rounded-md px-1.5 text-xs font-medium transition-colors"
				>
					<Typography variant="caption" as="span" className="truncate">
						{selectedLabel ?? "Selecione o modelo"}
					</Typography>
					<ChevronDown className="size-3 shrink-0" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-64 p-0">
				<Command>
					<CommandInput placeholder="Procurar modelo..." className="h-9" />
					<CommandList>
						<CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
						{providers.map((provider) => (
							<CommandGroup key={provider.id} heading={provider.label}>
								{provider.models.map((providerModel) => {
									const isSelected = provider.id === providerId && providerModel.value === model;
									return (
										<CommandItem
											key={`${provider.id}::${providerModel.value}`}
											value={`${provider.label} ${providerModel.label}`}
											onSelect={() => {
												onChange(provider.id, providerModel.value);
												setOpen(false);
											}}
											className={cn("flex items-center justify-between", isSelected && "bg-accent")}
										>
											{providerModel.label}
											{isSelected && <Check className="text-primary ml-2 size-4" />}
										</CommandItem>
									);
								})}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};
