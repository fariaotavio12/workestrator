import { Button, ChatMessage, Typography } from "@/components";
import type { ConfigAssistantMessage } from "@/features/security/orchestrator-shared/model";
import { Eye, Loader2 } from "lucide-react";
import type { RefObject } from "react";
import { extractHtml } from "../utils";

type Props = {
	messages: ConfigAssistantMessage[];
	isRunning: boolean;
	streamingText: string;
	endRef: RefObject<HTMLDivElement | null>;
	onOpenHtmlPreview: (html: string) => void;
};

export const AssistantThread = ({ messages, isRunning, streamingText, endRef, onOpenHtmlPreview }: Props) => (
	<div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-4 pt-5 pb-8">
		{messages.map((message) => {
			const html = message.role === "assistant" ? extractHtml(message.content) : null;
			return (
				<ChatMessage
					key={message.id}
					role={message.role}
					content={message.content}
					footer={
						html ? (
							<Button variant="outline" size="sm" className="mt-2" onClick={() => onOpenHtmlPreview(html)}>
								<Eye className="size-4" />
								Visualizar HTML
							</Button>
						) : undefined
					}
				/>
			);
		})}
		{isRunning &&
			(streamingText ? (
				<ChatMessage role="assistant" content={streamingText} streaming />
			) : (
				<div className="text-muted-foreground flex items-center gap-2 rounded-lg px-2 py-1">
					<Loader2 className="size-4 animate-spin" />
					<Typography variant="body-sm" as="span">
						Preparando a primeira resposta...
					</Typography>
				</div>
			))}
		<div ref={endRef} />
	</div>
);
