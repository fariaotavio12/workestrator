import { useIsMobile } from "@/app/hooks/useIsMobile";
import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import { Calendar } from "@/components/calendar";
import { FieldWrapper } from "@/components/field-wrapper";
import { SmartOverlay } from "@/components/smart-dialog";
import { CalendarIcon } from "@radix-ui/react-icons";
import { addDays, addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as React from "react";
import type { DateRange } from "react-day-picker";

type DateRangePickerProps = React.HTMLAttributes<HTMLDivElement> & {
	label?: string;
	selectedRange?: DateRange;
	onRangeChange?: (range: DateRange | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	minDate?: Date;
	maxDate?: Date;
	notification?: any;
	className?: string;
	showQuickSelection?: boolean;
	wrapperClassName?: string;
	showCharCounter?: boolean;
	maxLength?: number;
	error?: string;
	description?: string;
	charCount?: number;
};

const quickSelections = [
	{
		label: "Hoje",
		getRange: () => {
			const today = new Date();
			return { from: today, to: today };
		},
	},
	{
		label: "Esta semana",
		getRange: () => {
			const today = new Date();
			return {
				from: startOfWeek(today, { locale: ptBR }),
				to: endOfWeek(today, { locale: ptBR }),
			};
		},
	},
	{
		label: "Este mês",
		getRange: () => {
			const today = new Date();
			return {
				from: startOfMonth(today),
				to: endOfMonth(today),
			};
		},
	},
	{
		label: "Próxima semana",
		getRange: () => {
			const today = new Date();
			const nextWeek = addDays(today, 7);
			return {
				from: startOfWeek(nextWeek, { locale: ptBR }),
				to: endOfWeek(nextWeek, { locale: ptBR }),
			};
		},
	},
	{
		label: "Próximo mês",
		getRange: () => {
			const today = new Date();
			const nextMonth = addMonths(today, 1);
			return {
				from: startOfMonth(nextMonth),
				to: endOfMonth(nextMonth),
			};
		},
	},
	{
		label: "Últimos 7 dias",
		getRange: () => {
			const today = new Date();
			return {
				from: subDays(today, 6),
				to: today,
			};
		},
	},
	{
		label: "Últimos 30 dias",
		getRange: () => {
			const today = new Date();
			return {
				from: subDays(today, 29),
				to: today,
			};
		},
	},
];

export const DateRangePicker = ({
	label,
	id,
	error,
	description,
	maxLength,
	charCount,
	showCharCounter,
	wrapperClassName,
	selectedRange,
	onRangeChange,
	placeholder,
	disabled,
	minDate,
	maxDate,
	notification,
	className,
	showQuickSelection = true,
}: DateRangePickerProps) => {
	const isMobile = useIsMobile();
	const [open, setIsOpen] = React.useState(false);

	const handleQuickSelection = (range: DateRange) => {
		if (onRangeChange) {
			onRangeChange(range);
		}
		setIsOpen(false);
	};

	const Trigger = (
		<FieldWrapper
			htmlFor={id}
			label={label}
			error={error}
			description={description}
			className={wrapperClassName}
			maxLength={maxLength}
			length={charCount}
			showCharCounter={showCharCounter}
		>
			<Button
				variant={error || notification?.isError ? "error" : "input"}
				role="daterangepicker"
				onClick={() => setIsOpen(true)}
				id={id}
				aria-expanded={open}
				className={cn(
					"w-full justify-start text-left font-medium",
					!selectedRange?.to && !selectedRange?.from && "text-muted-foreground",
					className,
				)}
				disabled={disabled}
				type="button"
			>
				<CalendarIcon className="mr-2 h-4 w-4" />
				{selectedRange?.from ? (
					selectedRange.to ? (
						<>
							{format(selectedRange.from, "dd 'de' MMM 'de' yyyy", {
								locale: ptBR,
							})}{" "}
							-{" "}
							{format(selectedRange.to, "dd 'de' MMM 'de' yyyy", {
								locale: ptBR,
							})}
						</>
					) : (
						format(selectedRange.from, "dd 'de' MMMM 'de' yyyy", {
							locale: ptBR,
						})
					)
				) : (
					<span>{placeholder || "Selecione um intervalo de datas"}</span>
				)}
			</Button>
		</FieldWrapper>
	);

	return (
		<SmartOverlay
			// headerIcon={
			// 	<Button variant="outline" size="icon" className="cursor-default p-0">
			// 		<CalendarIcon />
			// 	</Button>
			// }
			// title="Selecionar intervalo de datas"
			// description="Escolha um intervalo de datas para filtrar os resultados."
			open={open}
			onOpenChange={setIsOpen}
			trigger={Trigger}
			forcePlacement="center"
			size={"lg"}
			className={cn("border-border overflow-hidden p-0", isMobile ? "w-[80vw] max-w-85" : "")}
		>
			<div className={cn("w-full", isMobile ? "justify-center" : "flex")}>
				{showQuickSelection && (
					<div className="border-border hidden w-40 flex-col border-r pt-4 md:flex">
						{quickSelections.map((selection) => (
							<Button
								key={selection.label}
								variant="ghost"
								size="sm"
								className="w-full justify-start text-left text-xs"
								onClick={() => handleQuickSelection(selection.getRange())}
							>
								{selection.label}
							</Button>
						))}
					</div>
				)}
				<div className="border-border flex w-full flex-col items-center border-t pt-3">
					<Calendar
						className={isMobile ? "w-full border-0" : ""}
						autoFocus
						fixedWeeks
						mode="range"
						defaultMonth={selectedRange?.from}
						selected={selectedRange}
						onSelect={onRangeChange}
						numberOfMonths={isMobile ? 1 : 2}
						disabled={(date) => {
							if (minDate && maxDate) {
								return date < minDate || date > maxDate;
							}
							if (minDate) {
								return date < minDate;
							}
							if (maxDate) {
								return date > maxDate;
							}
							return false;
						}}
						locale={ptBR}
					/>
					<div className="border-border flex w-full items-center justify-end gap-2 border-t px-3 py-3">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								if (onRangeChange) onRangeChange(undefined);
								setIsOpen(false);
							}}
						>
							Limpar
						</Button>
						<Button size="sm" onClick={() => setIsOpen(false)}>
							Confirmar
						</Button>
					</div>
				</div>
			</div>
		</SmartOverlay>
	);
};
