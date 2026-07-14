import { cn } from "@/app/utils/cn";

// `import.meta.env.BASE_URL` (não uma string crua começando com "/"): no build do Electron o app
// é servido via `file://`, onde um caminho começando com "/" vira raiz do sistema de arquivos em
// vez da raiz do app, e o ícone quebra. `BASE_URL` já resolve certo pra cada modo do Vite.
export const FILE_ICON_BASE = `${import.meta.env.BASE_URL}assets/fileIcon`;

type IconFileSize = "xs" | "sm" | "md" | "lg";

const SIZE_TO_CLASSES: Record<IconFileSize, { box: string; img: string; padding: string }> = {
	xs: { box: "h-7 w-7", img: "h-5 w-5", padding: "p-0.5" },
	sm: { box: "h-9 w-9", img: "h-7 w-7", padding: "p-1" },
	md: { box: "h-10 w-10", img: "h-9 w-9", padding: "p-1" },
	lg: { box: "h-12 w-12", img: "h-12 w-12", padding: "p-2" },
};

function iconNameFromMime(mimeType?: string) {
	const mime = (mimeType ?? "").trim().toLowerCase();
	if (!mime) return "FILE";

	// docs
	if (mime === "application/pdf") return "PDF";
	if (mime === "text/plain") return "TXT";
	if (mime === "text/csv") return "CSV";
	if (mime === "application/json") return "JSON";
	if (mime === "application/xml" || mime === "text/xml") return "XML";

	// images
	if (mime.startsWith("image/")) {
		const sub = mime.split("/")[1] ?? "";

		if (sub === "jpeg" || sub === "jpg" || sub === "pjpeg") return "JPG";
		if (sub === "png") return "PNG";
		if (sub === "gif") return "GIF";
		if (sub === "webp") return "WEBP";
		if (sub === "svg+xml" || sub === "svg") return "SVG";

		return "PNG";
	}

	// audio/video
	if (mime.startsWith("audio/")) {
		const sub = mime.split("/")[1] ?? "";
		if (sub === "mpeg" || sub === "mp3") return "MP3";
		return "MP3";
	}

	if (mime.startsWith("video/")) {
		const sub = mime.split("/")[1] ?? "";
		if (sub === "mp4") return "MP4";
		if (sub === "quicktime" || sub === "mov") return "MOV";
		if (sub === "x-matroska" || sub === "mkv") return "MKV";
		if (sub === "mpeg") return "MPEG";
		return "MP4";
	}

	// office
	if (mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "XLSX";
	if (mime === "application/vnd.ms-excel") return "XLS";
	if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
	if (mime === "application/msword") return "DOC";
	if (mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return "PPTX";
	if (mime === "application/vnd.ms-powerpoint") return "PPT";

	// archives
	if (mime === "application/zip") return "ZIP";
	if (mime === "application/x-rar-compressed" || mime === "application/vnd.rar") return "RAR";
	if (mime === "application/x-7z-compressed") return "ZIP"; // fallback

	return "FILE";
}

function getFileIconSrcFromMime(mimeType?: string) {
	const iconName = iconNameFromMime(mimeType);
	return `${FILE_ICON_BASE}/${iconName}.svg`;
}

export type IconFileProps = {
	/** MIME type, ex: "image/jpeg", "application/pdf" */
	type?: string;
	size?: IconFileSize;
	withContainer?: boolean;
	className?: string;
	imgClassName?: string;
	/** opcional: troca o alt */
	alt?: string;
};

export const IconFile = ({
	type,
	size = "md",
	withContainer = true,
	className,
	imgClassName,
	alt = "file icon",
}: IconFileProps) => {
	const src = getFileIconSrcFromMime(type);
	const s = SIZE_TO_CLASSES[size];

	const imgEl = (
		<img
			src={src}
			alt={alt}
			className={cn("select-none", s.img, imgClassName)}
			draggable={false}
			loading="lazy"
			onError={(e) => {
				(e.currentTarget as HTMLImageElement).src = `${FILE_ICON_BASE}/FILE.svg`;
			}}
		/>
	);

	if (!withContainer) return imgEl;

	return (
		<div className={cn("inline-flex items-center justify-center", "rounded-md", s.box, s.padding, className)}>
			{imgEl}
		</div>
	);
};
