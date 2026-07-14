import { ChevronRight, Brain } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/app/utils/cn";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/collapsible";

export type ThinkingBlockProps = {
	title?: string;
	defaultOpen?: boolean;
	/** Mostra um indicador pulsando enquanto o pensamento ainda está chegando. */
	active?: boolean;
	children: ReactNode;
	className?: string;
};

/** Bloco colapsável para exibir o "pensamento"/passos da IA (raciocínio, tool-calls, observações). */
export const ThinkingBlock = ({ title = "Pensamento", defaultOpen = false, active, children, className }: ThinkingBlockProps) => (
	<Collapsible defaultOpen={defaultOpen} className={cn("border-border bg-muted/30 rounded-lg border", className)}>
		<CollapsibleTrigger className="group text-muted-foreground hover:text-foreground flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors">
			<Brain className={cn("size-3.5", active && "text-primary animate-pulse")} />
			<span>{title}</span>
			<ChevronRight className="ml-auto size-3.5 transition-transform group-data-[state=open]:rotate-90" />
		</CollapsibleTrigger>
		<CollapsibleContent className="text-muted-foreground overflow-hidden px-3 pb-3 text-xs">
			{children}
		</CollapsibleContent>
	</Collapsible>
);
