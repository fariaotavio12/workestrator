import { Check, Send, Wrench, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Markdown } from "@/components/markdown/markdown";
import { Typography } from "@/components/typography";
import type { ActorBubble } from "./use-office-choreography";

type Props = {
	bubble: ActorBubble;
	onAnswer?: (answer: string) => void;
	onApproveCheckpoint?: () => void;
	onRejectCheckpoint?: () => void;
	/** `true` na lista compacta mobile: cartão estático no fluxo em vez de balão flutuante com seta. */
	inline?: boolean;
	className?: string;
};

const TONE_CLASS: Record<ActorBubble["tone"], string> = {
	neutral: "bg-popover border-border",
	warning: "bg-warning/10 border-warning/45",
	success: "bg-success/10 border-success/45",
};

/** Balão de fala/checkpoint/pergunta ancorado acima de um ator do escritório (ou cartão inline no mobile). */
export const SpeechBubble = (props: Props) => {
	const { bubble, onAnswer, onApproveCheckpoint, onRejectCheckpoint, inline, className } = props;
	const [freeText, setFreeText] = useState("");
	const hasOptions = bubble.kind === "question" && (bubble.options?.length ?? 0) > 0;
	const isFreeQuestion = bubble.kind === "question" && !hasOptions;

	const submitFreeText = () => {
		if (!freeText.trim()) return;
		onAnswer?.(freeText.trim());
		setFreeText("");
	};

	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				"rounded-xl border text-left",
				inline ? "w-full p-3" : "absolute bottom-full left-1/2 mb-2.5 w-64 -translate-x-1/2 p-3 shadow-lg",
				TONE_CLASS[bubble.tone],
				className,
			)}
		>
			{bubble.toolLabel && (
				<span className="text-muted-foreground border-border/60 mb-1.5 flex items-center gap-1.5 border-b pb-1.5">
					<Wrench className="size-3 shrink-0" />
					<Typography variant="caption" as="span" className="truncate font-medium">
						{bubble.toolLabel}
					</Typography>
				</span>
			)}

			<div className="max-h-28 overflow-hidden [&_.text-sm]:text-[13px] [&_.text-sm]:leading-relaxed">
				<Markdown content={bubble.text} className="text-foreground [&_p]:my-0" />
				{bubble.streaming && (
					<span className="bg-primary ml-0.5 inline-block h-3.5 w-1 animate-pulse align-middle" />
				)}
			</div>

			{hasOptions && (
				<div className="mt-2 flex flex-wrap gap-1.5">
					{bubble.options?.map((option) => (
						<Button
							key={option}
							size="sm"
							variant="outline"
							className="h-7 px-2 text-xs"
							onClick={() => onAnswer?.(option)}
						>
							{option}
						</Button>
					))}
				</div>
			)}

			{isFreeQuestion && (
				<div className="mt-2 flex gap-1.5">
					<Input
						wrapperClassName="flex-1"
						className="h-7 text-xs"
						placeholder="Sua resposta"
						value={freeText}
						onChange={(e) => setFreeText(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submitFreeText()}
					/>
					<Button
						size="sm"
						variant="outline"
						className="h-7 px-2"
						aria-label="Enviar resposta"
						onClick={submitFreeText}
					>
						<Send className="size-3" />
					</Button>
				</div>
			)}

			{bubble.kind === "checkpoint" && (
				<div className="mt-2 flex gap-1.5">
					<Button size="sm" variant="error" className="h-7 flex-1 px-2 text-xs" onClick={onRejectCheckpoint}>
						<X className="size-3" />
						Rejeitar
					</Button>
					<Button size="sm" className="h-7 flex-1 px-2 text-xs" onClick={onApproveCheckpoint}>
						<Check className="size-3" />
						Aprovar
					</Button>
				</div>
			)}

			{!inline && (
				<span
					aria-hidden
					className={cn(
						"absolute top-full left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b",
						TONE_CLASS[bubble.tone],
					)}
				/>
			)}
		</div>
	);
};
