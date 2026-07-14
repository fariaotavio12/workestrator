import { Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/app/utils/cn";

export type ImagePreviewProps = {
	src: string;
	alt?: string;
	className?: string;
};

const CHECKER =
	"repeating-conic-gradient(var(--muted) 0% 25%, transparent 0% 50%) 50% / 20px 20px";

/** Visualizador de imagem com fundo xadrez (transparência) e alternância ajustar/tamanho real. */
export const ImagePreview = ({ src, alt = "Imagem", className }: ImagePreviewProps) => {
	const [actualSize, setActualSize] = useState(false);

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col gap-2", className)}>
			<div className="flex items-center">
				<button
					type="button"
					onClick={() => setActualSize((v) => !v)}
					className="text-muted-foreground hover:text-foreground hover:bg-muted ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
				>
					{actualSize ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
					{actualSize ? "Ajustar" : "Tamanho real"}
				</button>
			</div>
			<div
				className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-lg border p-3"
				style={{ background: CHECKER }}
			>
				<img
					src={src}
					alt={alt}
					className={cn("rounded shadow-sm", actualSize ? "max-w-none" : "max-h-full max-w-full object-contain")}
				/>
			</div>
		</div>
	);
};
