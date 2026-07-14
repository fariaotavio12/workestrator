import { cn } from "@/app/utils/cn";
import { normalizeForSearch } from "@/app/utils/stringUtils";
import { Button } from "@/components/button";
import { Checkbox } from "@/components/checkbox";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/command";
import { FieldWrapper, type FieldWrapperProps } from "@/components/field-wrapper";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { ScrollArea } from "@/components/scroll-area";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { forwardRef, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from "react";

type MultiComboboxProps<T> = Omit<FieldWrapperProps, "className" | "children"> & {
	options: T[];
	getOptionKey: (option: T) => string;
	getOptionLabel: (option: T) => string;
	values?: T[];
	onChange?: (values: T[]) => void;
	onInputChange?: (input: string) => void;
	onClear?: () => void;
	renderOption?: (option: T, index: number) => ReactNode;
	renderValue?: (value: T) => ReactNode;
	placeholder?: string;
	disabled?: boolean;

	loading?: boolean;
	maxVisibleValues?: number;
	className?: string;
	containerClassName?: string;
	dataId?: string;
	widthFull?: boolean;
	separator?: string;
	showSelectAllOption?: boolean; // <--
	showClearAllOption?: boolean; // <--
	showCheckBoxes?: boolean; // <--
};

const InnerMultiCombobox = <T,>(
	{
		label,
		description,
		error,
		options,
		getOptionKey,
		getOptionLabel,
		values = [],
		onChange,
		onInputChange,
		onClear,
		renderOption,
		renderValue,
		placeholder = "Selecione uma ou mais opções",
		disabled,
		loading,
		maxVisibleValues,
		className,
		containerClassName,
		widthFull = true,
		separator = ", ",
		showClearAllOption,
		showSelectAllOption,
		showCheckBoxes,
	}: MultiComboboxProps<T>,
	ref: Ref<HTMLButtonElement>,
) => {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");

	const selectedKeys = useMemo(() => {
		const selected = new Set<string>();
		for (const v of values) selected.add(getOptionKey(v));
		return selected;
	}, [values, getOptionKey]);

	const indexed = useMemo(() => {
		return options.map((option) => {
			const key = getOptionKey(option);
			const label = getOptionLabel(option);
			const base = `${label} ${key.replace(/_/g, " ")}`;
			return {
				option,
				key,
				label,
				norm: normalizeForSearch(base),
			};
		});
	}, [options, getOptionKey, getOptionLabel]);

	const filtered = useMemo(() => {
		const normalizedQuery = normalizeForSearch(query);
		if (!normalizedQuery) return indexed;
		return indexed.filter((it) => it.norm.includes(normalizedQuery));
	}, [indexed, query]);

	const selectedDisplay = useMemo(() => {
		if (!values.length) return placeholder;

		const reversed = [...values].reverse();
		const visible = reversed.slice(0, maxVisibleValues);
		const hiddenCount = values.length - visible.length;

		const nodes = visible.flatMap((val, index) => {
			const label = getOptionLabel(val);

			const valueNode = renderValue ? (
				<span key={`rv-${index}`}>{renderValue(val)}</span>
			) : (
				<span
					key={`badge-${index}`}
					className="bg-muted text-foreground inline-flex max-w-40 items-center rounded px-2 py-0.5 text-xs"
					title={label}
				>
					<span className="truncate">{label}</span>
				</span>
			);

			const sepNode =
				separator && index < visible.length - 1 ? (
					<span key={`sep-${index}`} className="text-muted-foreground text-xs">
						{separator}
					</span>
				) : null;

			return sepNode ? [valueNode, sepNode] : [valueNode];
		});

		if (hiddenCount > 0) {
			nodes.push(
				<span key="more" className="text-muted-foreground ml-1 text-xs">
					+{hiddenCount}
				</span>,
			);
		}

		return <div className="flex w-full flex-wrap items-center gap-1">{nodes}</div>;
	}, [values, placeholder, maxVisibleValues, renderValue, getOptionLabel, separator]);

	const toggleSelect = (option: T) => {
		const key = getOptionKey(option);
		const isSelected = selectedKeys.has(key);

		const next = isSelected ? values.filter((val) => getOptionKey(val) !== key) : [...values, option];

		onChange?.(next);
	};

	const clearSearch = () => {
		setQuery("");
		onInputChange?.("");
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) clearSearch();
	};

	const handleClear = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation();
		onChange?.([]);
		onClear?.();
		setIsOpen(false);
		clearSearch();
	};

	const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (disabled) return;

		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			setIsOpen(true);
			return;
		}

		if (e.key === "Escape") {
			setIsOpen(false);
			return;
		}

		if (!isOpen && values.length > 0 && (e.key === "Backspace" || e.key === "Delete")) {
			e.preventDefault();
			onChange?.([]);
			onClear?.();
			clearSearch();
		}
	};

	const allSelected = values.length === options.length && options.length > 0;
	// const isIndeterminate = values.length > 0 && values.length < options.length;

	// Só mostra o item se a ação fizer sentido nesse estado
	const showToggleAllItem =
		(showSelectAllOption && !allSelected && options.length > 0) || (showClearAllOption && allSelected);
	return (
		<Popover open={isOpen && !disabled} onOpenChange={handleOpenChange} modal>
			<FieldWrapper
				className={cn("flex w-full min-w-32 items-start", containerClassName, widthFull ? "" : "md:max-w-72")}
				label={label}
				description={description}
				error={error}
			>
				<PopoverTrigger asChild>
					<Button
						ref={ref}
						role="combobox"
						variant={error ? "error" : "input"}
						aria-expanded={isOpen}
						aria-haspopup="listbox"
						type="button"
						className={cn(
							"flex w-full items-center justify-between rounded-lg px-3 font-medium hover:cursor-default",
							className,
						)}
						disabled={disabled}
						onKeyDown={handleTriggerKeyDown}
					>
						<div
							className={cn(
								"flex w-full flex-nowrap truncate overflow-hidden text-left text-sm",
								values.length ? "text-foreground" : "text-muted-foreground",
							)}
						>
							{selectedDisplay}
						</div>

						<div className="ml-1 flex gap-0.5">
							{onClear && values.length > 0 && (
								<div
									className="hover:bg-foreground/10 flex h-6 w-6 items-center justify-center rounded-full p-2 hover:cursor-pointer"
									onClick={handleClear}
									title="Limpar seleção"
								>
									<X strokeWidth="1.5" className="text-muted-foreground h-4 w-4 shrink-0" />
								</div>
							)}

							<div className="hover:bg-foreground/10 flex h-6 w-6 items-center justify-center rounded-full p-2 hover:cursor-pointer">
								{isOpen ? (
									<ChevronUp strokeWidth="1.5" className="text-muted-foreground h-4 w-4 shrink-0" />
								) : (
									<ChevronDown strokeWidth="1.5" className="text-muted-foreground h-4 w-4 shrink-0" />
								)}
							</div>
						</div>
					</Button>
				</PopoverTrigger>
			</FieldWrapper>

			<PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
				<Command shouldFilter={false}>
					<CommandInput
						value={query}
						placeholder="Procurar..."
						className="h-9"
						autoFocus
						onValueChange={(input) => {
							setQuery(input);
							onInputChange?.(input);
						}}
					/>

					<CommandList>
						{loading ? (
							<CommandEmpty>Carregando...</CommandEmpty>
						) : filtered.length ? (
							<ScrollArea className="max-h-64 overflow-y-auto">
								<CommandGroup>
									{showToggleAllItem && (
										<CommandItem
											onSelect={() => {
												if (allSelected) {
													// só permite remover se a prop deixar
													if (showClearAllOption) onChange?.([]);
												} else {
													// só permite selecionar se a prop deixar
													if (showSelectAllOption) onChange?.(options);
												}
											}}
											className={cn(
												"mb-1 flex items-center gap-2 rounded-md px-3 py-2",
												"hover:bg-muted cursor-pointer",
												allSelected && "bg-muted/50 text-foreground font-medium",
											)}
										>
											{showCheckBoxes && <Checkbox checked={allSelected} className="pointer-events-none" />}
											{allSelected ? "Remover selecionados" : "Selecionar todos"}
										</CommandItem>
									)}

									{showToggleAllItem && <CommandSeparator />}

									{filtered.map(({ option, key, label }, index) => {
										const isSelected = selectedKeys.has(key);

										return (
											<CommandItem
												key={key}
												value={key}
												onSelect={() => toggleSelect(option)}
												className={cn("flex items-center justify-between", isSelected && "bg-accent")}
											>
												<div className="flex items-center">{renderOption?.(option, index) ?? label}</div>
												{isSelected && <Check className="text-primary ml-2 h-4 w-4" />}
											</CommandItem>

											// <CommandItem
											// 	key={key}
											// 	value={key}
											// 	onSelect={() => toggleSelect(option)}
											// 	className={cn(
											// 		"flex items-center gap-2 rounded-md px-3 py-2",
											// 		isSelected && "bg-muted/50 text-foreground font-medium",
											// 	)}
											// >
											// 	{showCheckBoxes && <Checkbox checked={isSelected} />}
											// 	{renderOption?.(option, index) ?? label}
											// </CommandItem>
										);
									})}
								</CommandGroup>
							</ScrollArea>
						) : (
							<div className="py-6 text-center text-sm">Nenhuma opção encontrada.</div>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

export const MultiCombobox = forwardRef(InnerMultiCombobox) as <T>(
	props: MultiComboboxProps<T> & { ref?: Ref<HTMLButtonElement> },
) => ReactNode;
