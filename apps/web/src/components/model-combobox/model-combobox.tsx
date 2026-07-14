import { cn } from "@/app/utils/cn";
import { normalizeForSearch } from "@/app/utils/stringUtils";
import { Button } from "@/components/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/command";
import { FieldWrapper, type FieldWrapperProps } from "@/components/field-wrapper";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { ScrollArea } from "@/components/scroll-area";
import type { ModelProvider, ModelRef } from "@/features/security/orchestrator-shared/types";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { forwardRef, useMemo, useState, type Ref } from "react";

export type ModelComboboxProps = Omit<FieldWrapperProps, "className" | "children"> & {
	providers: ModelProvider[];
	value?: ModelRef;
	onChange: (value: ModelRef) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	containerClassName?: string;
};

type IndexedModel = {
	providerId: string;
	providerLabel: string;
	value: string;
	label: string;
	norm: string;
};

/**
 * Seletor único de "provider + model" — agrupado por provider, com busca. Centraliza um padrão que
 * existia reimplementado (Select cru + SelectGroup/SelectLabel + codificação manual de
 * "providerId::model") em agent-form-dialog, orchestrator-config-dialog e page-config-assistant.
 */
const InnerModelCombobox = (
	{
		label,
		description,
		error,
		providers,
		value,
		onChange,
		placeholder = "Selecione um modelo",
		disabled,
		className,
		containerClassName,
	}: ModelComboboxProps,
	ref: Ref<HTMLButtonElement>,
) => {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");

	const indexed = useMemo<IndexedModel[]>(
		() =>
			providers.flatMap((provider) =>
				provider.models.map((model) => ({
					providerId: provider.id,
					providerLabel: provider.label,
					value: model.value,
					label: model.label,
					norm: normalizeForSearch(`${provider.label} ${model.label}`),
				})),
			),
		[providers],
	);

	const filtered = useMemo(() => {
		const normalizedQuery = normalizeForSearch(query);
		if (!normalizedQuery) return indexed;
		return indexed.filter((item) => item.norm.includes(normalizedQuery));
	}, [indexed, query]);

	const grouped = useMemo(
		() =>
			providers.map((provider) => ({
				provider,
				items: filtered.filter((item) => item.providerId === provider.id),
			})),
		[providers, filtered],
	);

	const selected = useMemo(
		() =>
			value ? indexed.find((item) => item.providerId === value.providerId && item.value === value.model) : undefined,
		[indexed, value],
	);

	const selectedDisplay = selected ? `${selected.providerLabel} - ${selected.label}` : placeholder;

	const clearSearch = () => setQuery("");

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) clearSearch();
	};

	const handleSelect = (item: IndexedModel) => {
		onChange({ providerId: item.providerId, model: item.value });
		setIsOpen(false);
		clearSearch();
	};

	return (
		<Popover open={isOpen && !disabled} onOpenChange={handleOpenChange} modal>
			<FieldWrapper className={containerClassName ?? className} label={label} description={description} error={error}>
				<PopoverTrigger asChild>
					<Button
						ref={ref}
						role="combobox"
						variant={error ? "error" : "input"}
						aria-expanded={isOpen}
						type="button"
						className="rounded-lg pr-2 font-normal"
						disabled={disabled}
						onClick={() => setIsOpen((prev) => !prev)}
					>
						<div
							className={cn("w-full truncate text-left text-sm", selected ? "text-foreground" : "text-muted-foreground")}
						>
							{selectedDisplay}
						</div>
						<div className="hover:bg-foreground/10 flex h-6 w-6 items-center justify-center rounded-full p-2 hover:cursor-pointer">
							{isOpen ? (
								<ChevronUp strokeWidth="1.5" className="text-muted-foreground h-4 w-4 shrink-0" />
							) : (
								<ChevronDown strokeWidth="1.5" className="text-muted-foreground h-4 w-4 shrink-0" />
							)}
						</div>
					</Button>
				</PopoverTrigger>
			</FieldWrapper>

			<PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
				<Command shouldFilter={false}>
					<CommandInput
						value={query}
						placeholder="Procurar modelo..."
						className="h-9"
						autoFocus
						onValueChange={setQuery}
					/>
					<CommandList>
						{filtered.length === 0 ? (
							<CommandEmpty>Nenhum modelo encontrado.</CommandEmpty>
						) : (
							<ScrollArea className="max-h-64 overflow-y-auto">
								{grouped.map(({ provider, items }) => {
									const hasAnyModels = provider.models.length > 0;
									if (hasAnyModels && items.length === 0) return null;
									return (
										<CommandGroup key={provider.id} heading={provider.label}>
											{!hasAnyModels ? (
												<div className="text-muted-foreground px-2 py-1.5 text-xs">Nenhum modelo cadastrado</div>
											) : (
												items.map((item) => {
													const isSelected = selected?.providerId === item.providerId && selected.value === item.value;
													return (
														<CommandItem
															key={`${item.providerId}::${item.value}`}
															value={`${item.providerId}::${item.value}`}
															onSelect={() => handleSelect(item)}
															className={cn("flex items-center justify-between", isSelected && "bg-accent")}
														>
															{item.label}
															{isSelected && <Check className="text-primary ml-2 h-4 w-4" />}
														</CommandItem>
													);
												})
											)}
										</CommandGroup>
									);
								})}
							</ScrollArea>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

export const ModelCombobox = forwardRef(InnerModelCombobox);
