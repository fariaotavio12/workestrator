import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/app/utils/cn";
import { CodeBlock } from "@/components/code-block/code-block";

export type MarkdownProps = {
	content: string;
	className?: string;
};

/**
 * Renderizador de markdown em runtime (respostas do assistente, planos, artefatos `.md`).
 * Reaproveita as classes tipográficas do `mdxProvider` e delega code blocks ao `<CodeBlock>`.
 */
const components: Components = {
	h1: ({ className, ...p }) => (
		<h1 {...p} className={cn("mt-2 mb-4 text-2xl font-semibold tracking-tight", className)} />
	),
	h2: ({ className, ...p }) => (
		<h2 {...p} className={cn("mt-6 mb-3 text-xl font-semibold tracking-tight", className)} />
	),
	h3: ({ className, ...p }) => <h3 {...p} className={cn("mt-5 mb-2 text-lg font-semibold", className)} />,
	p: ({ className, ...p }) => <p {...p} className={cn("my-3 leading-7", className)} />,
	a: ({ className, href, ...p }) => (
		<a
			{...p}
			href={href}
			className={cn("text-primary underline underline-offset-4", className)}
			target={href?.startsWith("http") ? "_blank" : undefined}
			rel={href?.startsWith("http") ? "noreferrer" : undefined}
		/>
	),
	strong: ({ className, ...p }) => <strong {...p} className={cn("font-semibold", className)} />,
	em: ({ className, ...p }) => <em {...p} className={cn("italic", className)} />,
	hr: ({ className, ...p }) => <hr {...p} className={cn("border-border my-6", className)} />,
	blockquote: ({ className, ...p }) => (
		<blockquote {...p} className={cn("border-border text-muted-foreground my-4 border-l-2 pl-4", className)} />
	),
	ul: ({ className, ...p }) => <ul {...p} className={cn("my-3 ml-6 list-disc space-y-1 leading-7", className)} />,
	ol: ({ className, ...p }) => <ol {...p} className={cn("my-3 ml-6 list-decimal space-y-1 leading-7", className)} />,
	li: ({ className, ...p }) => <li {...p} className={cn("marker:text-muted-foreground", className)} />,
	table: ({ className, ...p }) => (
		<div className="my-4 w-full overflow-x-auto">
			<table {...p} className={cn("w-full border-collapse text-sm", className)} />
		</div>
	),
	th: ({ className, ...p }) => (
		<th {...p} className={cn("border-border border-b px-3 py-2 text-left font-medium", className)} />
	),
	td: ({ className, ...p }) => <td {...p} className={cn("border-border/60 border-b px-3 py-2", className)} />,
	// `pre` vira passthrough — o bloco de código é renderizado pelo `code` via `<CodeBlock>`.
	pre: ({ children }) => <>{children}</>,
	code: ({ className, children, ...props }: ComponentPropsWithoutRef<"code"> & { className?: string }) => {
		const match = /language-(\w+)/.exec(className ?? "");
		const text = String(children ?? "").replace(/\n$/, "");
		if (match) {
			return <CodeBlock language={match[1]} content={text} />;
		}
		return (
			<code {...props} className={cn("bg-muted rounded px-1.5 py-0.5 font-mono text-[0.85em]", className)}>
				{children}
			</code>
		);
	},
};

export const Markdown = ({ content, className }: MarkdownProps) => (
	<div className={cn("text-sm break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}>
		<ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
			{content}
		</ReactMarkdown>
	</div>
);
