import "highlight.js/styles/github-dark.css";
import hljs from "highlight.js/lib/common";
import { useMemo } from "react";
import { cn } from "@/app/utils/cn";
import { ClipBoard } from "@/components/clip-board/clip-board";

export type CodeBlockProps = {
	content: string;
	language?: string;
	className?: string;
	/** Esconde o cabeçalho (linguagem + copiar). */
	hideHeader?: boolean;
};

/** Bloco de código com syntax highlight (highlight.js) e botão de copiar — sempre em tema escuro. */
export const CodeBlock = ({ content, language, className, hideHeader }: CodeBlockProps) => {
	const highlighted = useMemo(() => {
		try {
			if (language && hljs.getLanguage(language)) {
				return hljs.highlight(content, { language }).value;
			}
			return hljs.highlightAuto(content).value;
		} catch {
			return null;
		}
	}, [content, language]);

	return (
		<div className={cn("border-border my-3 overflow-hidden rounded-lg border bg-[#0d1117]", className)}>
			{!hideHeader && (
				<div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
					<span className="font-mono text-xs text-white/50">{language || "code"}</span>
					<ClipBoard texto={content} variant="ghost" size="icon" className="size-6 text-white/60 hover:text-white" />
				</div>
			)}
			<pre className="overflow-x-auto p-3 text-[13px] leading-6">
				{highlighted ? (
					<code className="hljs bg-transparent! p-0!" dangerouslySetInnerHTML={{ __html: highlighted }} />
				) : (
					<code className="hljs bg-transparent! p-0!">{content}</code>
				)}
			</pre>
		</div>
	);
};
