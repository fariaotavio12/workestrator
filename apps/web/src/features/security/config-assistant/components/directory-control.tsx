import { Typography } from "@/components";
import { FolderOpen, X } from "lucide-react";

type Props = {
	workingDir: string | null;
	canPickDir: boolean;
	onPick: () => void;
	onClear: () => void;
};

export const DirectoryControl = ({ workingDir, canPickDir, onPick, onClear }: Props) => {
	if (workingDir) {
		return (
			<span className="text-muted-foreground bg-muted flex h-6 items-center gap-1 rounded-md px-1.5 text-xs">
				<FolderOpen className="size-3" />
				<Typography variant="caption" as="span" className="max-w-32 truncate" title={workingDir}>
					{workingDir.split(/[/\\]/).pop() || workingDir}
				</Typography>
				<button type="button" aria-label="Remover diretório" className="hover:text-foreground" onClick={onClear}>
					<X className="size-3" />
				</button>
			</span>
		);
	}

	return (
		<button
			type="button"
			onClick={onPick}
			disabled={!canPickDir}
			title={canPickDir ? "Escolher pasta de trabalho" : "Disponível apenas no app desktop"}
			className="text-muted-foreground hover:text-foreground hover:bg-muted flex h-6 items-center gap-1 rounded-md px-1.5 text-xs transition-colors disabled:opacity-40"
		>
			<FolderOpen className="size-3.5" />
			Diretório
		</button>
	);
};
