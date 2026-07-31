import { Check, ChevronRight, Loader2, X } from "lucide-react";
import { createElement } from "react";
import { cn } from "@/app/utils/cn";
import { CodeBlock, Collapsible, CollapsibleContent, CollapsibleTrigger, EmptyState, Terminal, Typography } from "@/components";
import type { Squad, ToolCallRecord } from "@/features/security/orchestrator-shared/types";
import { activityIcon, activityLabel } from "../run-transcript";

type Props = { squad: Squad; className?: string };

/** Painel de debug: todas as chamadas de ferramenta do run atual, com input (JSON) e output completos. */
export const RunToolLog = ({ squad, className }: Props) => {
	const { toolLog } = squad.runtime;

	if (toolLog.length === 0) {
		return (
			<EmptyState
				className={cn("min-h-40", className)}
				title="Nenhuma ferramenta chamada ainda"
				message="As chamadas de ferramenta deste run aparecem aqui com o input e o resultado de cada uma."
			/>
		);
	}

	return (
		<div className={cn("flex flex-col gap-2", className)}>
			{toolLog.map((call) => (
				<ToolCallItem key={call.id} call={call} agentName={squad.agents.find((a) => a.id === call.agentId)?.name} />
			))}
		</div>
	);
};

const ToolCallItem = ({ call, agentName }: { call: ToolCallRecord; agentName?: string }) => {
	const label = activityLabel({ id: call.id, kind: "tool", toolName: call.toolName, detail: call.input });
	const icon = activityIcon({ id: call.id, kind: "tool", toolName: call.toolName });

	return (
		<Collapsible className="border-border bg-muted/30 rounded-lg border">
			<CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left">
				{createElement(icon, { className: "text-muted-foreground size-3.5 shrink-0" })}
				<Typography variant="caption" as="span" className="min-w-0 flex-1 truncate">
					{label}
				</Typography>
				{agentName && (
					<Typography variant="caption" as="span" className="text-muted-foreground hidden shrink-0 truncate sm:inline">
						{agentName}
					</Typography>
				)}
				{call.status === "running" && <Loader2 className="text-primary size-3.5 shrink-0 animate-spin" />}
				{call.status === "done" && <Check className="text-success size-3.5 shrink-0" />}
				{call.status === "error" && <X className="text-destructive size-3.5 shrink-0" />}
				<ChevronRight className="text-muted-foreground size-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
			</CollapsibleTrigger>
			<CollapsibleContent className="overflow-hidden px-3 pb-3">
				<Typography variant="caption" as="p" className="text-muted-foreground mb-1">
					{call.toolName}
				</Typography>
				{call.input ? (
					<CodeBlock content={formatInput(call.input)} language="json" className="my-0" />
				) : (
					<Typography variant="caption" className="text-muted-foreground">
						Sem input.
					</Typography>
				)}
				{call.sentHeaders && Object.keys(call.sentHeaders).length > 0 && (
					<>
						<Typography variant="caption" as="p" className="text-muted-foreground mt-3 mb-1">
							Headers enviados
						</Typography>
						<CodeBlock content={JSON.stringify(call.sentHeaders, null, 2)} language="json" className="my-0" />
					</>
				)}
				<Typography variant="caption" as="p" className="text-muted-foreground mt-3 mb-1">
					Resultado
				</Typography>
				{call.output ? (
					<Terminal content={call.output} autoScroll={false} className="max-h-72" />
				) : (
					<Typography variant="caption" className="text-muted-foreground">
						{call.status === "running" ? "Executando…" : "Sem resultado."}
					</Typography>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
};

/** Reindenta o input pra leitura quando ele é JSON válido; senão devolve como veio. */
const formatInput = (input: string): string => {
	try {
		return JSON.stringify(JSON.parse(input), null, 2);
	} catch {
		return input;
	}
};
