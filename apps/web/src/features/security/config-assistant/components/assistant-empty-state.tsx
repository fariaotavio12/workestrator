import { Button, EmptyState, Typography } from "@/components";
import { Bot, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { AssistantRoutine } from "../routines";

type Props = {
	hasProviders: boolean;
	routines: AssistantRoutine[];
	composer: ReactNode;
	onRoutineClick: (template: string) => void;
};

export const AssistantEmptyState = ({ hasProviders, routines, composer, onRoutineClick }: Props) => {
	if (!hasProviders) {
		return (
			<EmptyState
				icon={Bot}
				title="Nenhum provider"
				message="Cadastre um provider em Modelos (menu do usuário) antes de usar o assistente."
			/>
		);
	}

	return (
		<div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-14 text-center">
			<div className="flex flex-col items-center gap-4">
				<span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
					<Sparkles className="size-6" />
				</span>
				<div className="flex flex-col items-center gap-2.5">
					<Typography variant="title-md" as="h2">
						Como posso ajudar no Workestrator?
					</Typography>
					<Typography variant="body-sm" className="text-muted-foreground max-w-lg">
						Descreva a ideia, peça uma melhoria ou escolha uma rotina. Eu organizo o caminho e sigo com você.
					</Typography>
				</div>
			</div>
			{composer}
			<div className="grid w-full gap-3 sm:grid-cols-2">
				{routines.map((routine) => (
					<Button
						key={routine.id}
						type="button"
						variant="outline"
						onClick={() => onRoutineClick(routine.template)}
						className="hover:bg-accent group flex min-h-20 flex-col items-start justify-center gap-1 px-4 py-3 text-left"
					>
						<Typography variant="body-sm" className="font-medium">
							{routine.title}
						</Typography>
						<Typography variant="caption" className="text-primary font-mono">
							{routine.label}
						</Typography>
						<Typography variant="caption" className="text-muted-foreground group-hover:text-foreground">
							{routine.hint}
						</Typography>
					</Button>
				))}
			</div>
		</div>
	);
};
