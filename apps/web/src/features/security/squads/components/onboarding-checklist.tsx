import { cn } from "@/app/utils/cn";
import { Button, Typography } from "@/components";
import { Check } from "lucide-react";

type ChecklistStep = {
	label: string;
	done: boolean;
	actionLabel: string;
	onAction: () => void;
};

type Props = {
	steps: ChecklistStep[];
};

/** Guia os primeiros passos do produto (conectar modelo -> criar squad) — some assim que tudo estiver feito. */
export const OnboardingChecklist = ({ steps }: Props) => (
	<div className="bg-muted/30 flex flex-col gap-3 rounded-xl border p-4 sm:p-5">
		<Typography variant="title-sm">Primeiros passos</Typography>
		<ul className="flex flex-col gap-2">
			{steps.map((step, i) => (
				<li
					key={step.label}
					className="bg-background flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
				>
					<div className="flex min-w-0 items-center gap-3">
						<span
							className={cn(
								"flex size-6 shrink-0 items-center justify-center rounded-full",
								step.done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
							)}
							aria-hidden
						>
							{step.done ? (
								<Check className="size-3.5" />
							) : (
								<Typography variant="caption" as="span">
									{i + 1}
								</Typography>
							)}
						</span>
						<Typography variant="body-sm" className={step.done ? "text-muted-foreground line-through" : undefined}>
							{step.label}
						</Typography>
					</div>
					{!step.done && (
						<Button size="sm" variant="outline" onClick={step.onAction}>
							{step.actionLabel}
						</Button>
					)}
				</li>
			))}
		</ul>
	</div>
);
