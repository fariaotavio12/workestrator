import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { FieldWrapper, type FieldWrapperProps } from "@/components/field-wrapper";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { CalendarIcon } from "@radix-ui/react-icons";
import { add, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

type DatePickerProps = Omit<FieldWrapperProps, "className" | "children"> & {
	dataId?: string;
	selectedDate?: Date | undefined;
	onDateChange?: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	minDate?: Date;
	maxDate?: Date;
	className?: string;
	containerClassName?: string;
	size?: "default" | "sm" | "lg" | "icon";
	requiresConfirmation?: boolean;
	maxYear?: number;
	minYear?: number;
	isDataText?: boolean;
};

export const DatePicker = ({
	label,
	description,
	error,
	dataId,
	selectedDate,
	onDateChange,
	placeholder = "Selecione uma data",
	disabled,
	minDate,
	maxDate,
	className,
	containerClassName,
	size,
	requiresConfirmation,
	maxYear = 50,
	minYear = -50,
	isDataText = true,
}: DatePickerProps) => {
	const [open, setOpen] = useState(false);
	const [pendingDate, setPendingDate] = useState<Date | undefined>(selectedDate);
	const [navMonth, setNavMonth] = useState<Date | undefined>(selectedDate);

	const needsConfirm = requiresConfirmation ?? false;

	const startMonth = minDate || add(new Date(), { years: minYear });
	const endMonth = maxDate || add(new Date(), { years: maxYear });

	const formattedDate = selectedDate ? format(selectedDate, "dd MMM yyyy", { locale: ptBR }) : placeholder;

	const isOutsideRange = (date: Date) => {
		if (minDate && date < minDate) return true;
		if (maxDate && date > maxDate) return true;
		return false;
	};

	const handleSelect = (date?: Date) => {
		if (needsConfirm) {
			setPendingDate(date);
		} else {
			onDateChange?.(date);
			setOpen(false);
		}
	};

	const handleConfirm = () => {
		onDateChange?.(pendingDate);
		setOpen(false);
	};

	return (
		<Popover data-id={dataId} data-hasportal="true" open={open && !disabled} onOpenChange={setOpen} modal>
			<FieldWrapper className={containerClassName} label={label} description={description} error={error}>
				<PopoverTrigger data-id={dataId} data-hasportal="true" asChild disabled={disabled}>
					<Button
						role="datepicker"
						aria-expanded={open}
						aria-haspopup="dialog"
						size={size}
						type="button"
						variant={error ? "error" : "input"}
						className={cn(className)}
						disabled={disabled}
						onClick={() => setOpen((prev) => !prev)}
					>
						<CalendarIcon className="text-muted-foreground h-4 w-4" />

						{isDataText && (
							<span
								className={cn(
									"w-full truncate text-left text-sm",
									selectedDate ? "text-foreground" : "text-muted-foreground",
								)}
							>
								{formattedDate}
							</span>
						)}
					</Button>
				</PopoverTrigger>
			</FieldWrapper>
			<PopoverContent
				data-id={dataId}
				data-hasportal="true"
				align="center"
				className="border-border bg-popover w-fit overflow-hidden p-0"
			>
				<Calendar
					mode="single"
					captionLayout="dropdown"
					locale={ptBR}
					fixedWeeks
					autoFocus
					defaultMonth={selectedDate || new Date()}
					selected={selectedDate}
					month={navMonth}
					onMonthChange={setNavMonth}
					onSelect={handleSelect}
					disabled={isOutsideRange}
					startMonth={startMonth}
					endMonth={endMonth}
				/>
				{needsConfirm && (
					<div className="flex justify-end gap-2 px-3 pb-3">
						<Button size="sm" onClick={handleConfirm}>
							Confirmar
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
};
