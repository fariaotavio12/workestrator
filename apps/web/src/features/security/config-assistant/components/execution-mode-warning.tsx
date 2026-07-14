import { Typography } from "@/components";
import { AlertTriangle } from "lucide-react";

type Props = {
	executionMode: boolean;
	workingDir: string | null;
};

export const ExecutionModeWarning = ({ executionMode, workingDir }: Props) => {
	if (!executionMode) return null;

	return (
		<div className="border-warning/40 bg-warning/10 text-warning mb-2 flex items-start gap-2 rounded-lg border px-3 py-1.5">
			<AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
			<Typography variant="caption" as="p">
				Modo execução: rodo ferramentas reais (Bash, edição de arquivos) em{" "}
				<span className="font-semibold">{workingDir}</span>, sem sandbox.
			</Typography>
		</div>
	);
};
