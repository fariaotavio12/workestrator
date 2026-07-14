import { cn } from "@/app/utils/cn";
import { normalizeForSearch } from "@/app/utils/stringUtils";
import { Button } from "@/components/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/command";
import { FieldWrapper, type FieldWrapperProps } from "@/components/field-wrapper";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { ScrollArea } from "@/components/scroll-area";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { forwardRef, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref } from "react";

type ComboboxProps<T> = Omit<FieldWrapperProps, "className" | "children"> & {
	options: T[];
	getOptionKey: (option: T) => string;
	getOptionLabel: (option: T) => string;
	value?: T;
	onChange?: (value: T) => void;
	onInputChange?: (input: string) => void;
	onClear?: () => void;
	renderOption?: (option: T) => ReactNode;
	renderValue?: (value: T) => ReactNode;
	placeholder?: string;
	disabled?: boolean;
	loading?: boolean;
	className?: string;
	containerClassName?: string;
	dataId?: string;
	Moldura?: boolean;
};

const InnerCombobox = <T,>(
	{
		label,
		description,
		error,
		options,
		getOptionKey,
		getOptionLabel,
		value,
		onChange,
		onInputChange,
		onClear,
		renderOption,
		renderValue,
		placeholder = "Selecione uma opção",
		disabled,
		loading,
		Moldura = true,
		className,
		containerClassName,
	}: ComboboxProps<T>,
	ref: Ref<HTMLButtonElement>,
) => {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");

	const indexed = useMemo(() => {
		return options.map((option) => {
			const key = getOptionKey(option);
			const label = getOptionLabel ? getOptionLabel(option) : key;

			// Garantir que key seja string
			const keyString = String(key || "");
			const base = `${label} ${keyString.replace(/_/g, " ")}`;

			return {
				option,
				key,
				label,
				norm: normalizeForSearch(base),
				isSelected: value ? getOptionKey(value) === key : false,
			};
		});
	}, [options, getOptionKey, getOptionLabel, value]);

	const filtered = useMemo(() => {
		const normalizedQuery = normalizeForSearch(query);
		if (!normalizedQuery) return indexed;
		return indexed.filter((it) => it.norm.includes(normalizedQuery));
	}, [indexed, query]);

	const sortedOptions = useMemo(() => {
		const selectedItem = filtered.find((item) => item.isSelected);
		const otherItems = filtered.filter((item) => !item.isSelected);

		return selectedItem ? [selectedItem, ...otherItems] : filtered;
	}, [filtered]);

	const selectedDisplay = useMemo(() => {
		if (!value && Moldura) return placeholder;
		// if (!value && !Moldura) return null;
		// if (!value) return placeholder;
		if (renderValue) return renderValue(value as any);
		return getOptionLabel(value as any);
	}, [value, Moldura, placeholder, renderValue, getOptionLabel]);

	const clearSearch = () => {
		setQuery("");
		onInputChange?.("");
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) clearSearch();
	};

	const handleSelect = (option: T) => {
		onChange?.(option);
		setIsOpen(false);
		clearSearch();
	};

	const handleClear = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation();
		onClear?.();
		setIsOpen(false);
		clearSearch();
	};

	const handleTriggerKeyDown = (e: KeyboardEvent<HTMLElement>) => {
		if (disabled) return;

		if ((e.key === "Enter" || e.key === " ") && e.currentTarget.tagName !== "BUTTON") {
			e.preventDefault();
			setIsOpen((prev) => !prev);
			return;
		}

		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			setIsOpen(true);
			return;
		}

		if (e.key === "Escape") {
			setIsOpen(false);
			return;
		}

		if (!isOpen && onClear && value && (e.key === "Backspace" || e.key === "Delete")) {
			e.preventDefault();
			onClear();
			clearSearch();
		}
	};

	return (
		<Popover open={isOpen && !disabled} onOpenChange={handleOpenChange} modal>
			<FieldWrapper className={containerClassName ?? className} label={label} description={description} error={error}>
				<PopoverTrigger asChild>
					{Moldura ? (
						<Button
							ref={ref}
							role="combobox"
							variant={error ? "error" : "input"}
							aria-expanded={isOpen}
							type="button"
							className="rounded-lg pr-2 font-normal"
							disabled={disabled}
							onClick={() => setIsOpen((prev) => !prev)}
							onKeyDown={handleTriggerKeyDown}
						>
							<div
								className={cn("w-full truncate text-left text-sm", value ? "text-foreground" : "text-muted-foreground")}
							>
								{selectedDisplay}
							</div>
							<div className="flex flex-row">
								{onClear && value && (
									<div
										className="hover:bg-foreground/10 flex h-6 w-6 items-center justify-center rounded-full p-2 hover:cursor-pointer"
										onClick={handleClear}
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
					) : (
						<div
							role="combobox"
							aria-expanded={isOpen}
							aria-disabled={disabled}
							tabIndex={disabled ? -1 : 0}
							className={cn(
								"border-input-border bg-input hover:bg-accent hover:text-accent-foreground flex items-center gap-2",
								"cursor-pointer rounded-lg transition-colors",
								disabled && "cursor-not-allowed opacity-80",
								className,
							)}
							onKeyDown={handleTriggerKeyDown}
						>
							{selectedDisplay}
						</div>
					)}
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
						) : sortedOptions.length ? (
							<ScrollArea className="max-h-64 overflow-y-auto">
								<CommandGroup>
									{sortedOptions.map(({ option, key, label, isSelected }) => (
										<CommandItem
											key={key}
											value={key}
											onSelect={() => handleSelect(option)}
											className={cn("flex items-center justify-between", isSelected && "bg-accent")}
										>
											<div className="flex items-center">{renderOption?.(option) ?? label}</div>
											{isSelected && <Check className="text-primary ml-2 h-4 w-4" />}
										</CommandItem>
									))}
								</CommandGroup>
							</ScrollArea>
						) : (
							<CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

export const Combobox = forwardRef(InnerCombobox) as <T>(
	props: ComboboxProps<T> & { ref?: Ref<HTMLButtonElement> },
) => ReactNode;
