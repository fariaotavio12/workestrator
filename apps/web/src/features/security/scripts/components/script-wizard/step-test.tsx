import { Button, Typography } from "@/components";
import type { TestToolResult } from "@/features/security/scripts/api/test-tool-client";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

type StepTestProps = {
	isTesting: boolean;
	result: TestToolResult | null;
	onTest: () => void;
};

/** Passo 4 do wizard — dispara a integração de verdade via runner antes de liberar o salvar. */
export const StepTest = ({ isTesting, result, onTest }: StepTestProps) => {
	return (
		<div className="flex flex-col gap-4">
			<Typography variant="body-sm" className="text-muted-foreground">
				Roda a integração de verdade (chamada, comando ou health-check do servidor) antes de salvar.
			</Typography>

			<Button type="button" variant="outline" className="self-start" disabled={isTesting} onClick={onTest}>
				{isTesting && <LoaderCircle className="animate-spin" />}
				{isTesting ? "Testando..." : "Rodar teste"}
			</Button>

			{result && (
				<div
					className={
						result.ok
							? "bg-success/10 text-success flex items-start gap-2 rounded-lg border border-success/20 p-3"
							: "bg-destructive/10 text-destructive border-destructive/20 flex items-start gap-2 rounded-lg border p-3"
					}
				>
					{result.ok ? (
						<CheckCircle2 className="mt-0.5 size-4 shrink-0" />
					) : (
						<XCircle className="mt-0.5 size-4 shrink-0" />
					)}
					<div className="flex min-w-0 flex-col gap-1">
						<Typography variant="body-sm" className="font-medium">
							{result.message}
						</Typography>
						{result.detail && (
							<pre className="bg-background/60 max-h-40 overflow-auto rounded-md p-2 font-mono text-xs whitespace-pre-wrap">
								{result.detail}
							</pre>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
