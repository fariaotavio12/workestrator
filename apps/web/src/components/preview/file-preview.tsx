import { Download, FileQuestion, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/app/utils/cn";
import { CodeBlock } from "@/components/code-block/code-block";
import { Markdown } from "@/components/markdown/markdown";
import { Typography } from "@/components/typography";
import { HtmlPreview } from "./html-preview";
import { ImagePreview } from "./image-preview";

export type PreviewFile = {
	name: string;
	ext?: string;
	isImage?: boolean;
	/** URL servida pelo preview (arquivo em disco). */
	url?: string;
	/** HTML inline autocontido (alternativa ao `url`). */
	srcDoc?: string;
};

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico"]);
const CODE_LANG: Record<string, string> = {
	".js": "javascript",
	".mjs": "javascript",
	".jsx": "javascript",
	".ts": "typescript",
	".tsx": "typescript",
	".css": "css",
	".json": "json",
	".py": "python",
	".sh": "bash",
	".yml": "yaml",
	".yaml": "yaml",
};

const extOf = (file: PreviewFile) => (file.ext ?? file.name.slice(file.name.lastIndexOf("."))).toLowerCase();

/** Renderiza um arquivo pelo tipo: HTML (iframe), imagem, markdown, código (com highlight) ou download. */
export const FilePreview = ({ file, className }: { file: PreviewFile; className?: string }) => {
	const ext = extOf(file);
	const isHtml = Boolean(file.srcDoc) || ext === ".html" || ext === ".htm";
	const isImage = file.isImage || IMAGE_EXTS.has(ext);
	const isMarkdown = ext === ".md";
	const codeLang = CODE_LANG[ext];
	const needsText = isMarkdown || Boolean(codeLang) || ext === ".txt";

	// Guarda o texto junto da URL de origem — `loading` é derivado (evita setState síncrono no effect).
	const [loaded, setLoaded] = useState<{ url: string; text: string } | null>(null);

	useEffect(() => {
		if (!needsText || !file.url) return;
		const url = file.url;
		let cancelled = false;
		fetch(url)
			.then((r) => r.text())
			.then((body) => !cancelled && setLoaded({ url, text: body }))
			.catch(() => !cancelled && setLoaded({ url, text: "Não foi possível carregar o arquivo." }));
		return () => {
			cancelled = true;
		};
	}, [file.url, needsText]);

	const text = loaded && loaded.url === file.url ? loaded.text : null;
	const loading = needsText && Boolean(file.url) && text === null;

	if (isHtml) return <HtmlPreview src={file.url} srcDoc={file.srcDoc} className={className} />;
	if (isImage && file.url) return <ImagePreview src={file.url} alt={file.name} className={className} />;

	if (needsText) {
		if (loading) {
			return (
				<div className={cn("text-muted-foreground flex items-center gap-2 p-4 text-sm", className)}>
					<Loader2 className="size-4 animate-spin" />
					Carregando…
				</div>
			);
		}
		return (
			<div className={cn("min-h-0 flex-1 overflow-auto", className)}>
				{isMarkdown ? <Markdown content={text ?? ""} /> : <CodeBlock content={text ?? ""} language={codeLang} />}
			</div>
		);
	}

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center", className)}>
			<FileQuestion className="text-muted-foreground size-8" />
			<Typography variant="body-sm" className="text-muted-foreground">
				Pré-visualização não disponível para <span className="font-mono">{file.name}</span>.
			</Typography>
			{file.url && (
				<a
					href={file.url}
					download={file.name}
					className="border-border hover:bg-accent flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm"
				>
					<Download className="size-4" />
					Baixar
				</a>
			)}
		</div>
	);
};
