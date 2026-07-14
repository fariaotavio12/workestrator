import { ArrowUp, Square } from "lucide-react";
import type { KeyboardEvent, ReactNode, Ref } from "react";
import { cn } from "@/app/utils/cn";
import { Textarea } from "@/components/textarea";

export type ChatComposerProps = {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	onStop?: () => void;
	isRunning?: boolean;
	canSend?: boolean;
	disabled?: boolean;
	placeholder?: string;
	/** Controles à esquerda da toolbar inferior (ex.: diretório). */
	leftSlot?: ReactNode;
	/** Controles à direita da toolbar inferior (ex.: seletor de modelo). */
	rightSlot?: ReactNode;
	/** Ref do textarea — usado para ancorar o menu de slash-commands. */
	textareaRef?: Ref<HTMLTextAreaElement>;
	onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
	className?: string;
};

/** Composer de chat reaproveitável: textarea + botão enviar/parar + toolbar (slots). */
export const ChatComposer = ({
	value,
	onChange,
	onSubmit,
	onStop,
	isRunning,
	canSend,
	disabled,
	placeholder = "Digite sua mensagem…",
	leftSlot,
	rightSlot,
	textareaRef,
	onKeyDown,
	className,
}: ChatComposerProps) => {
	const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		onKeyDown?.(event);
		if (event.defaultPrevented) return;
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			onSubmit();
		}
	};

	return (
		<div
			className={cn(
				"border-border bg-card focus-within:border-primary/50 rounded-2xl border shadow-sm transition-colors",
				className,
			)}
		>
			<div className="flex items-end gap-2 px-3 pt-4">
				<Textarea
					ref={textareaRef}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					rows={1}
					containerClassName="min-w-0 flex-1"
					className="max-h-44 min-h-12 flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
				/>
				{isRunning ? (
					<button
						type="button"
						onClick={onStop}
						aria-label="Parar"
						className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80"
					>
						<Square className="size-3.5 fill-current" />
					</button>
				) : (
					<button
						type="button"
						onClick={onSubmit}
						disabled={!canSend}
						aria-label="Enviar"
						className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40"
					>
						<ArrowUp className="size-4" />
					</button>
				)}
			</div>

			<div className="flex items-center justify-between gap-2 px-2.5 pt-1.5 pb-2.5">
				<div className="flex items-center gap-1">{leftSlot}</div>
				<div className="flex items-center gap-1">{rightSlot}</div>
			</div>
		</div>
	);
};
