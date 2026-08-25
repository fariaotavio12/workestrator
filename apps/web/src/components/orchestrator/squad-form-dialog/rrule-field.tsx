import { Input, Typography } from "@/components";
import { RRULE_EXAMPLES, formatOccurrence, validateRrule } from "@/features/security/orchestrator-shared/runtime/rrule";
import { CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
	value: string;
	onChange: (value: string) => void;
	/** Mostra o erro de validação apenas depois da primeira tentativa de salvar. */
	showError?: boolean;
};

/**
 * Campo da regra RRULE (RFC 5545) do gatilho agendado. O preview das próximas execuções usa as mesmas
 * funções que o scheduler consome, então o que aparece aqui é literalmente o que vai disparar.
 */
export const RruleField = ({ value, onChange, showError }: Props) => {
	// Instante fixo na montagem: o preview precisa de um "agora" estável, senão cada re-render do
	// formulário deslocaria as datas mostradas.
	const [now] = useState(() => Date.now());
	const validation = useMemo(() => validateRrule(value, now), [value, now]);
	const isEmpty = !value.trim();

	return (
		<div className="flex flex-col gap-3">
			<Input
				label="Regra RRULE (RFC 5545)"
				placeholder="FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=9;BYMINUTE=0"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				spellCheck={false}
				autoCapitalize="characters"
				className="font-mono text-xs"
				description="Interpretada em hora local. Aceita bloco iCalendar com DTSTART em linha separada para ancorar o início."
				error={showError && !validation.valid ? validation.error : undefined}
			/>

			<div className="flex flex-wrap gap-1.5">
				{RRULE_EXAMPLES.map((example) => (
					<button
						key={example.value}
						type="button"
						onClick={() => onChange(example.value)}
						className="border-border text-muted-foreground hover:border-ring hover:text-foreground rounded-full border px-2.5 py-1 text-xs transition-colors"
					>
						{example.label}
					</button>
				))}
			</div>

			{!isEmpty && validation.valid && (
				<div className="bg-muted/40 border-border flex flex-col gap-2 rounded-lg border p-3">
					<div className="text-muted-foreground flex items-center gap-2">
						<CalendarClock className="size-3.5" />
						<Typography variant="caption">{validation.description || "Próximas execuções"}</Typography>
					</div>
					<ul className="flex flex-col gap-1">
						{validation.nextOccurrences.map((occurrence) => (
							<li key={occurrence} className="text-muted-foreground font-mono text-xs">
								{formatOccurrence(occurrence)}
							</li>
						))}
					</ul>
				</div>
			)}

			{!isEmpty && !validation.valid && !showError && (
				<Typography variant="caption" className="text-destructive">
					{validation.error}
				</Typography>
			)}
		</div>
	);
};
