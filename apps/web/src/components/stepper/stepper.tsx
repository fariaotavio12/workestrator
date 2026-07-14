import { cn } from "@/app/utils/cn";
import { Check, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export type StepperStep = {
	id: string;
	label: string;
};

type StepperProps = {
	steps: StepperStep[];
	activeStepId: string;
	/** Steps com id anterior ao ativo (ou explicitamente passados aqui) ficam com o ícone de check. */
	completedStepIds?: string[];
	className?: string;
};

/**
 * Cabeçalho de passos de um wizard ("1 Catálogo → 2 Configurar → …"). Puramente visual — a
 * navegação/validação de cada passo fica com quem usa. Reutilizável em qualquer fluxo multi-etapa.
 */
export const Stepper = ({ steps, activeStepId, completedStepIds, className }: StepperProps): ReactNode => {
	const activeIndex = steps.findIndex((step) => step.id === activeStepId);

	return (
		<div className={cn("flex items-center gap-2 text-sm", className)}>
			{steps.map((step, index) => {
				const isActive = step.id === activeStepId;
				const isCompleted = completedStepIds ? completedStepIds.includes(step.id) : index < activeIndex;

				return (
					<div key={step.id} className="flex items-center gap-2">
						{index > 0 && <ChevronRight className="text-muted-foreground/40 size-4 shrink-0" aria-hidden />}
						<span
							className={cn(
								"flex items-center gap-1.5 font-medium",
								isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground",
							)}
						>
							<span
								className={cn(
									"flex size-5 shrink-0 items-center justify-center rounded-full text-xs",
									isActive
										? "bg-primary text-primary-foreground"
										: isCompleted
											? "bg-foreground text-background"
											: "border-border border",
								)}
							>
								{isCompleted && !isActive ? <Check className="size-3" /> : index + 1}
							</span>
							{step.label}
						</span>
					</div>
				);
			})}
		</div>
	);
};
