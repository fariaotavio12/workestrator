import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
 
import { IconFile } from "@/components/file/iconFile";
import { CalendarFoldIcon, DownloadCloud, Eye, Link as LinkIcon, Trash2 } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

type DocumentId = string | number;

type Props = {
	file?: File;
	url?: string;
	className?: string;
	id: DocumentId;
	/** chamada quando o usuário quiser remover o documento */
	onRemove?: (id: DocumentId) => void;

	/** opcional: abre preview em modal/página; se não passar, abre em nova aba quando possível */
	onPreview?: () => void;
	onViewPreview?: boolean;
	onViewDownload?: boolean;
	onViewCopyLink?: boolean;
	onViewRemove?: boolean;
};

function mimeFromUrlExtension(url: string | null | undefined) {
	if (!url || typeof url !== "string") return "";
	const path = url.split("?")[0].toLowerCase();
	if (path.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
	if (path.endsWith(".pdf")) return "application/pdf";
	if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
	if (path.endsWith(".png")) return "image/png";
	return "";
}

function formatBytes(bytes?: number) {
	if (bytes == null) return "";
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)} KB`;
	const mb = kb / 1024;
	if (mb < 1024) return `${mb.toFixed(1)} MB`;
	const gb = mb / 1024;
	return `${gb.toFixed(1)} GB`;
}

function formatDateFromFile(file?: File) {
	if (!file?.lastModified) return "Data desconhecida";
	return new Date(file.lastModified).toLocaleDateString();
}

const UUID_PREFIX_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;

function nameFromUrl(url: string | null | undefined) {
	if (!url || typeof url !== "string") return "arquivo";
	try {
		const u = new URL(url);
		const last = u.pathname.split("/").filter(Boolean).pop();
		const name = last ? decodeURIComponent(last) : "arquivo";
		return name.replace(UUID_PREFIX_RE, "");
	} catch {
		const last = url.split("?")[0].split("/").filter(Boolean).pop();
		const name = last ? decodeURIComponent(last) : "arquivo";
		return name.replace(UUID_PREFIX_RE, "");
	}
}

function isPreviewable(mime: string) {
	return mime.startsWith("image/") || mime === "application/pdf";
}

export const DocumentComponent: React.FC<Props> = ({
	file,
	url,
	className,
	onRemove,
	id,
	onPreview,
	onViewPreview,
	onViewDownload,
	onViewCopyLink,
	onViewRemove,
}) => {
	const [isBusy, setIsBusy] = useState(false);

	const displayName = useMemo(() => {
		if (file) return file.name || "arquivo";
		if (url) return nameFromUrl(url);
		return "Nenhum arquivo carregado";
	}, [file, url]);

	const formattedDate = useMemo(() => (file ? formatDateFromFile(file) : "Data desconhecida"), [file]);

	const mimeType = useMemo(() => {
		if (file) return file.type || "";
		return mimeFromUrlExtension(url ?? "");
	}, [file, url]);

	const formattedSize = useMemo(() => (file ? formatBytes(file.size) : ""), [file]);

	const metaLine = useMemo(() => {
		return formattedSize ? `${formattedDate} • ${formattedSize}` : formattedDate;
	}, [formattedDate, formattedSize]);

	const disabled = !file && !url;
	const canPreview = !disabled && isPreviewable(mimeType);

	const handleDownload = useCallback(async () => {
		if (disabled) return;

		try {
			setIsBusy(true);

			if (file) {
				const objectUrl = URL.createObjectURL(file);
				const a = document.createElement("a");
				a.href = objectUrl;
				a.download = file.name || "arquivo";
				a.rel = "noopener";
				document.body.appendChild(a);
				a.click();
				a.remove();
				URL.revokeObjectURL(objectUrl);
				return;
			}

			if (url) {
				const a = document.createElement("a");
				a.href = url;
				a.download = "";
				a.target = "_blank";
				a.rel = "noopener noreferrer";
				document.body.appendChild(a);
				a.click();
				a.remove();
			}
		} finally {
			setIsBusy(false);
		}
	}, [disabled, file, url]);

	const handlePreview = useCallback(() => {
		if (!canPreview) return;

		// Se o app quiser abrir modal, passa onPreview
		if (onPreview) {
			onPreview();
			return;
		}

		// fallback: abre em nova aba
		if (file) {
			const objectUrl = URL.createObjectURL(file);
			window.open(objectUrl, "_blank", "noopener,noreferrer");
			// não revoga imediatamente para não quebrar a aba
			setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
			return;
		}

		if (url) window.open(url, "_blank", "noopener,noreferrer");
	}, [canPreview, file, url, onPreview]);

	const handleCopyLink = useCallback(async () => {
		if (!url) return;
		await navigator.clipboard.writeText(url);
	}, [url]);

	const handleRemove = useCallback(() => {
		if (!onRemove) return;
		onRemove(id);
	}, [onRemove, id]);

	return (
		<div className={cn("flex items-center gap-3", className)}>
			{(file || url) && <IconFile type={mimeType} />}

			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-medium">{displayName}</div>

				<div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
					<CalendarFoldIcon size={12} />
					<span className="truncate">{metaLine}</span>
				</div>
			</div>

			<div className="flex items-center gap-2">
				{canPreview && onViewPreview ? (
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={handlePreview}
						disabled={disabled || isBusy}
						aria-label="Visualizar"
						title="Visualizar"
					>
						<Eye />
					</Button>
				) : null}

				{url && onViewCopyLink ? (
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={handleCopyLink}
						disabled={disabled || isBusy}
						aria-label="Copiar link"
						title="Copiar link"
					>
						<LinkIcon />
					</Button>
				) : null}

				{onViewDownload && (
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={handleDownload}
						disabled={disabled || isBusy}
						aria-label="Baixar arquivo"
						title={disabled ? "Nenhum arquivo para baixar" : "Baixar arquivo"}
					>
						<DownloadCloud />
					</Button>
				)}

				{onRemove && onViewRemove ? (
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={handleRemove}
						disabled={disabled || isBusy}
						aria-label="Remover arquivo"
						title="Remover arquivo"
					>
						<Trash2 />
					</Button>
				) : null}
			</div>
		</div>
	);
};
