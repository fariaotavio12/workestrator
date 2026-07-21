import { Download, FileQuestion, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import { CodeBlock } from "@/components/code-block/code-block";
import { Markdown } from "@/components/markdown/markdown";
import { notify } from "@/components/toast/notify";
import { Typography } from "@/components/typography";
import { savePreviewFile } from "@/features/security/orchestrator-shared/runtime/model-client";
import { HtmlPreview } from "./html-preview";
import { ImagePreview } from "./image-preview";

export type PreviewFile = {
	name: string;
	ext?: string;
	isImage?: boolean;
	/** URL servida pelo preview (arquivo em disco). */
	url?: string;
	/** Raiz registrada no runner para salvar via dialog nativo. */
	rootId?: string;
	/** Caminho relativo dentro da raiz registrada. */
	relativePath?: string;
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

/** Renderiza um arquivo pelo tipo: HTML (iframe), imagem, markdown, codigo ou fallback de download. */
export const FilePreview = ({ file, className }: { file: PreviewFile; className?: string }) => {
	const ext = extOf(file);
	const isHtml = Boolean(file.srcDoc) || ext === ".html" || ext === ".htm";
	const isImage = file.isImage || IMAGE_EXTS.has(ext);
	const isMarkdown = ext === ".md";
	const codeLang = CODE_LANG[ext];
	const needsText = isMarkdown || Boolean(codeLang) || ext === ".txt";
	const canNativeDownload = Boolean(file.rootId && file.relativePath);

	const [loaded, setLoaded] = useState<{ url: string; text: string } | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!needsText || !file.url) return;
		const url = file.url;
		let cancelled = false;
		fetch(url)
			.then((r) => r.text())
			.then((body) => !cancelled && setLoaded({ url, text: body }))
			.catch(() => !cancelled && setLoaded({ url, text: "Nao foi possivel carregar o arquivo." }));
		return () => {
			cancelled = true;
		};
	}, [file.url, needsText]);

	const text = loaded && loaded.url === file.url ? loaded.text : null;
	const loading = needsText && Boolean(file.url) && text === null;

	const downloadFile = async () => {
		if (!file.rootId || !file.relativePath) return;
		setSaving(true);
		try {
			const result = await savePreviewFile({
				rootId: file.rootId,
				relativePath: file.relativePath,
				suggestedName: file.name.split("/").pop() || file.name,
			});
			if (result.saved) notify.success("Arquivo salvo.");
		} catch (error) {
			notify.error(error instanceof Error ? error.message : "Nao foi possivel salvar o arquivo.");
		} finally {
			setSaving(false);
		}
	};

	const renderContent = () => {
		if (isHtml) return <HtmlPreview src={file.url} srcDoc={file.srcDoc} className="min-h-0 flex-1" />;
		if (isImage && file.url) return <ImagePreview src={file.url} alt={file.name} className="min-h-0 flex-1" />;

		if (needsText) {
			if (loading) {
				return (
					<div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
						<Loader2 className="size-4 animate-spin" />
						Carregando...
					</div>
				);
			}
			return (
				<div className="min-h-0 flex-1 overflow-auto">
					{isMarkdown ? <Markdown content={text ?? ""} /> : <CodeBlock content={text ?? ""} language={codeLang} />}
				</div>
			);
		}

		return (
			<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
				<FileQuestion className="text-muted-foreground size-8" />
				<Typography variant="body-sm" className="text-muted-foreground">
					Pre-visualizacao nao disponivel para <span className="font-mono">{file.name}</span>.
				</Typography>
				{file.url && !canNativeDownload && (
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

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}>
			{canNativeDownload && (
				<div className="flex shrink-0 justify-end">
					<Button type="button" variant="outline" size="sm" onClick={downloadFile} disabled={saving}>
						{saving ? <Loader2 className="animate-spin" /> : <Download />}
						Baixar arquivo
					</Button>
				</div>
			)}
			{renderContent()}
		</div>
	);
};
