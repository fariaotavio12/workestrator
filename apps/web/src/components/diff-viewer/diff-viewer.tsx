import { parsePatch } from "diff";
import { useMemo } from "react";
import { cn } from "@/app/utils/cn";

export type DiffViewerProps = {
	/** Unified diff (saída de `git diff`). */
	patch: string;
	className?: string;
};

const lineClass = (marker: string): string => {
	if (marker === "+") return "bg-success/10 text-success";
	if (marker === "-") return "bg-destructive/10 text-destructive";
	return "text-muted-foreground";
};

/** Renderiza um unified diff (add/remove com cores semânticas), agrupado por arquivo e hunk. */
export const DiffViewer = ({ patch, className }: DiffViewerProps) => {
	const files = useMemo(() => {
		try {
			return parsePatch(patch);
		} catch {
			return [];
		}
	}, [patch]);

	if (files.length === 0) {
		return (
			<pre className={cn("border-border overflow-x-auto rounded-lg border p-3 font-mono text-xs", className)}>
				{patch || "Sem alterações."}
			</pre>
		);
	}

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{files.map((file, fileIndex) => {
				const name = file.newFileName?.replace(/^b\//, "") ?? file.oldFileName?.replace(/^a\//, "") ?? "arquivo";
				return (
					<div key={`${name}-${fileIndex}`} className="border-border overflow-hidden rounded-lg border">
						<div className="bg-muted border-border border-b px-3 py-1.5 font-mono text-xs font-medium">{name}</div>
						<div className="overflow-x-auto font-mono text-xs leading-5">
							{file.hunks.map((hunk, hunkIndex) => (
								<div key={hunkIndex}>
									<div className="text-muted-foreground bg-muted/40 px-3 py-0.5">
										@@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
									</div>
									{hunk.lines.map((line, lineIndex) => (
										<div key={lineIndex} className={cn("px-3 whitespace-pre", lineClass(line[0]))}>
											{line || " "}
										</div>
									))}
								</div>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
};
