import { Badge, Button, EmptyState, Typography } from "@/components";
import { usePromptVersionsQuery, useRevertPromptVersion } from "@/features/security/squad-detail/api";
import { History, Undo2 } from "lucide-react";
import { useState } from "react";

type Props = {
	squadId: string;
	agentId: string;
};

/**
 * Histórico de versões do `systemPrompt` (RF13). O backend cria uma versão a cada alteração, então
 * edição manual aparece aqui do mesmo jeito que alteração vinda do treinamento — é isso que impede o
 * prompt de voltar a ser a pilha de regras sem origem conhecida.
 */
export const AgentPromptHistory = ({ squadId, agentId }: Props) => {
	const { data: versions, isLoading } = usePromptVersionsQuery(squadId, agentId);
	const revert = useRevertPromptVersion(squadId, agentId);
	const [expanded, setExpanded] = useState<string | null>(null);

	if (isLoading) return null;

	if (!versions || versions.length === 0) {
		return (
			<EmptyState
				icon={History}
				title="Sem histórico"
				message="Nenhuma alteração do prompt foi registrada para este agent ainda."
			/>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{versions.map((version) => (
				<div key={version.id} className="border-border flex flex-col gap-2 rounded-lg border p-3">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">v{version.version}</Badge>
						<Typography variant="caption" className="text-muted-foreground">
							{new Date(version.createdAt).toLocaleString()}
						</Typography>
						{version.sourceRunId && (
							<Typography variant="caption" className="text-muted-foreground">
								run {version.sourceRunId.slice(0, 8)}
							</Typography>
						)}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="ml-auto"
							disabled={revert.isPending}
							onClick={() => revert.mutate(version.id)}
						>
							<Undo2 />
							Reverter
						</Button>
					</div>

					{version.reason && <Typography variant="body-sm">{version.reason}</Typography>}

					<button
						type="button"
						className="text-muted-foreground hover:text-foreground self-start text-xs underline"
						onClick={() => setExpanded(expanded === version.id ? null : version.id)}
					>
						{expanded === version.id ? "Ocultar o texto" : "Ver o texto desta versão"}
					</button>
					{expanded === version.id && (
						<pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
							{version.systemPrompt}
						</pre>
					)}
				</div>
			))}
		</div>
	);
};
