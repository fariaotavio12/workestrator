import { Faq } from "@/components/faq/faq";
import { Button } from "@/components/button";
import { MdxImage } from "@/components/image/mdxImage";
import { CustomLink } from "@/components/link";
import { MDXProvider } from "@mdx-js/react";
import type React from "react";
import type { ReactNode } from "react";

type Props = { children: ReactNode };

const cx = (...c: Array<string | undefined | false>) => c.filter(Boolean).join(" ");

type H<T> = T & { className?: string };

export const components = {
	// Layout base (o "article" ainda pode ter prose, mas aqui já fica bom sem)
	h1: ({ className, ...p }: H<React.HTMLAttributes<HTMLHeadingElement>>) => (
		<h1
			{...p}
			className={cx("scroll-m-20 text-[40px] leading-tight font-semibold tracking-[-0.02em]", "mt-2 mb-4", className)}
		/>
	),
	h2: ({ className, ...p }: H<React.HTMLAttributes<HTMLHeadingElement>>) => (
		<h2
			{...p}
			className={cx("scroll-m-20 text-2xl leading-snug font-semibold tracking-[-0.015em]", "mt-10 mb-3", className)}
		/>
	),
	h3: ({ className, ...p }: H<React.HTMLAttributes<HTMLHeadingElement>>) => (
		<h3 {...p} className={cx("scroll-m-20 text-xl leading-snug font-semibold", "mt-8 mb-2", className)} />
	),

	p: ({ className, ...p }: H<React.HTMLAttributes<HTMLParagraphElement>>) => (
		<p {...p} className={cx("text-[15px] leading-7", "my-3", className)} />
	),

	a: ({ className, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a
			{...p}
			className={cx("underline-offset-4", className)}
			target={p.href?.startsWith("http") ? "_blank" : p.target}
			rel={p.href?.startsWith("http") ? "noreferrer" : p.rel}
		/>
	),

	strong: ({ className, ...p }: H<React.HTMLAttributes<HTMLElement>>) => (
		<strong {...p} className={cx("font-semibold", className)} />
	),

	em: ({ className, ...p }: H<React.HTMLAttributes<HTMLElement>>) => <em {...p} className={cx("italic", className)} />,

	hr: ({ className, ...p }: H<React.HTMLAttributes<HTMLHRElement>>) => <hr {...p} className={cx("my-8", className)} />,

	blockquote: ({ className, ...p }: H<React.BlockquoteHTMLAttributes<HTMLQuoteElement>>) => (
		<blockquote {...p} className={cx("text-muted-foreground my-4 border-l-2 pl-4", className)} />
	),

	ul: ({ className, ...p }: H<React.HTMLAttributes<HTMLUListElement>>) => (
		<ul {...p} className={cx("my-3 ml-6 list-disc space-y-1 text-[15px] leading-7", className)} />
	),
	ol: ({ className, ...p }: H<React.HTMLAttributes<HTMLOListElement>>) => (
		<ol {...p} className={cx("my-3 ml-6 list-decimal space-y-1 text-[15px] leading-7", className)} />
	),
	li: ({ className, ...p }: H<React.LiHTMLAttributes<HTMLLIElement>>) => (
		<li {...p} className={cx("marker:text-muted-foreground", className)} />
	),

	code: ({ className, ...p }: any) => (
		<code {...p} className={cx("rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px]", className)} />
	),

	pre: ({ className, ...p }: any) => (
		<pre {...p} className={cx("-50 my-4 overflow-x-auto rounded-lg border p-4", "text-[13px] leading-6", className)} />
	),

	table: ({ className, ...p }: H<React.TableHTMLAttributes<HTMLTableElement>>) => (
		<div className="my-4 w-full overflow-x-auto">
			<table {...p} className={cx("w-full border-collapse text-[14px]", className)} />
		</div>
	),
	th: ({ className, ...p }: H<React.ThHTMLAttributes<HTMLTableCellElement>>) => (
		<th {...p} className={cx("border-b px-3 py-2 text-left font-medium", className)} />
	),
	td: ({ className, ...p }: H<React.TdHTMLAttributes<HTMLTableCellElement>>) => (
		<td {...p} className={cx("border-bpx-3 py-2", className)} />
	),

	// Opcional: permitir usar Button no MDX
	Button,
	CustomLink,
	Image: MdxImage,
	Faq,
};

export const MdxProvider = ({ children }: Props) => {
	return <MDXProvider components={components}>{children}</MDXProvider>;
}
