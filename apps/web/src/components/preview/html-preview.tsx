import { ExternalLink, Monitor, RotateCw, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";
import { cn } from "@/app/utils/cn";

export type HtmlPreviewProps = {
	/** URL servida (arquivo). Use `src` OU `srcDoc`. */
	src?: string;
	/** HTML inline autocontido. */
	srcDoc?: string;
	className?: string;
};

type Device = { id: string; label: string; width: number | null; icon: typeof Monitor };
const DEVICES: Device[] = [
	{ id: "full", label: "Cheio", width: null, icon: Monitor },
	{ id: "tablet", label: "Tablet", width: 768, icon: Tablet },
	{ id: "mobile", label: "Mobile", width: 375, icon: Smartphone },
];

/** Renderiza HTML num iframe sandbox, com presets de largura (responsivo), recarregar e abrir externo. */
export const HtmlPreview = ({ src, srcDoc, className }: HtmlPreviewProps) => {
	const [device, setDevice] = useState("full");
	const [reloadKey, setReloadKey] = useState(0);
	const width = DEVICES.find((d) => d.id === device)?.width ?? null;

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col gap-2", className)}>
			<div className="flex items-center gap-1">
				{DEVICES.map((d) => {
					const Icon = d.icon;
					return (
						<button
							key={d.id}
							type="button"
							onClick={() => setDevice(d.id)}
							className={cn(
								"flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
								device === d.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
							)}
						>
							<Icon className="size-3.5" />
							{d.label}
						</button>
					);
				})}
				<div className="ml-auto flex items-center gap-1">
					<button
						type="button"
						aria-label="Recarregar"
						onClick={() => setReloadKey((k) => k + 1)}
						className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
					>
						<RotateCw className="size-3.5" />
					</button>
					{src && (
						<button
							type="button"
							aria-label="Abrir em nova aba"
							onClick={() => window.open(src, "_blank", "noopener")}
							className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1.5 transition-colors"
						>
							<ExternalLink className="size-3.5" />
						</button>
					)}
				</div>
			</div>

			<div className="bg-muted/40 flex min-h-0 flex-1 justify-center overflow-auto rounded-lg border p-2">
				<iframe
					key={reloadKey}
					title="Preview HTML"
					src={src}
					srcDoc={srcDoc}
					sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
					className="h-full min-h-[400px] rounded-md bg-white shadow-sm"
					style={{ width: width ? `${width}px` : "100%", maxWidth: "100%" }}
				/>
			</div>
		</div>
	);
};
