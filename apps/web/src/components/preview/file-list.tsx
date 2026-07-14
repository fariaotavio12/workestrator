import { Code2, FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";
import { cn } from "@/app/utils/cn";

export type FileListItem = {
	id: string;
	name: string;
	ext?: string;
	isImage?: boolean;
	/** Marca arquivos criados/alterados na rodada. */
	changed?: boolean;
};

const iconFor = (item: FileListItem) => {
	const ext = (item.ext ?? "").toLowerCase();
	if (item.isImage || [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext)) return ImageIcon;
	if ([".html", ".htm", ".js", ".ts", ".tsx", ".css", ".json"].includes(ext)) return Code2;
	if (ext === ".md" || ext === ".txt") return FileText;
	return FileIcon;
};

/** Lista de arquivos selecionável (ícone por tipo + marcador de alterado). */
export const FileList = ({
	items,
	selectedId,
	onSelect,
	className,
}: {
	items: FileListItem[];
	selectedId?: string;
	onSelect: (id: string) => void;
	className?: string;
}) => (
	<div className={cn("flex flex-col gap-0.5 overflow-auto", className)}>
		{items.map((item) => {
			const Icon = iconFor(item);
			return (
				<button
					key={item.id}
					type="button"
					onClick={() => onSelect(item.id)}
					className={cn(
						"flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
						selectedId === item.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted",
					)}
				>
					<Icon className="size-4 shrink-0" />
					<span className="truncate">{item.name}</span>
					{item.changed && <span className="bg-primary ml-auto size-1.5 shrink-0 rounded-full" aria-label="alterado" />}
				</button>
			);
		})}
	</div>
);
