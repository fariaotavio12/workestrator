import type { ReactNode } from "react";
import { cn } from "@/app/utils/cn";
import { ClipBoard } from "@/components/clip-board/clip-board";
import { Markdown } from "@/components/markdown/markdown";
import { Typography } from "@/components/typography";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessageProps = {
	role: ChatRole;
	content: string;
	/** Cursor pulsando no fim (turno em streaming). */
	streaming?: boolean;
	/** Conteúdo extra abaixo do texto (ex.: bloco de pensamento, artefatos). */
	footer?: ReactNode;
	className?: string;
};

/** Mensagem de chat reaproveitável: usuário (bolha), assistente (markdown + copiar) ou sistema (pílula). */
export const ChatMessage = ({ role, content, streaming, footer, className }: ChatMessageProps) => {
	if (role === "system") {
		return (
			<div className={cn("flex justify-center", className)}>
				<Typography variant="caption" className="text-muted-foreground bg-muted/60 rounded-full px-3 py-1 italic">
					{content}
				</Typography>
			</div>
		);
	}

	if (role === "user") {
		return (
			<div className={cn("flex justify-end", className)}>
				<Typography
					variant="body-sm"
					as="div"
					className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 whitespace-pre-wrap"
				>
					{content}
				</Typography>
			</div>
		);
	}

	return (
		<div className={cn("group min-w-0", className)}>
			<div className="min-w-0">
				<Markdown content={content} />
				{streaming && <span className="bg-foreground ml-0.5 inline-block h-4 w-1.5 animate-pulse align-middle" />}
				{footer}
				{!streaming && content.trim().length > 0 && (
					<div className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
						<ClipBoard texto={content} variant="ghost" size="icon" className="size-6" />
					</div>
				)}
			</div>
		</div>
	);
};
