import Anser from "anser";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/app/utils/cn";

export type TerminalProps = {
	/** Saída bruta (pode conter códigos ANSI). */
	content: string;
	className?: string;
	/** Rola pro fim automaticamente quando o conteúdo muda (execução ao vivo). */
	autoScroll?: boolean;
};

/** Visualizador de saída de terminal/stdout, com suporte básico a cores ANSI e autoscroll. */
export const Terminal = ({ content, className, autoScroll = true }: TerminalProps) => {
	const endRef = useRef<HTMLDivElement>(null);
	const html = useMemo(() => Anser.ansiToHtml(Anser.escapeForHtml(content), { use_classes: false }), [content]);

	useEffect(() => {
		if (autoScroll) endRef.current?.scrollIntoView({ block: "end" });
	}, [content, autoScroll]);

	return (
		<div
			className={cn(
				"overflow-auto rounded-lg bg-[#0d1117] p-3 font-mono text-[12px] leading-5 text-zinc-200",
				className,
			)}
		>
			<pre className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: html }} />
			<div ref={endRef} />
		</div>
	);
};
