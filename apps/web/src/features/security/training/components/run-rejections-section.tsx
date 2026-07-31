import { Badge, Button, Typography } from "@/components";
import {
	REJECTION_CATEGORY_LABEL,
	REJECTION_SEVERITY_LABEL,
} from "@/features/security/orchestrator-shared/data/constants";
import { resolveBlamedAgent, startTraining } from "@/features/security/orchestrator-shared/runtime/training-runtime";
import type { RunRecord } from "@/features/security/orchestrator-shared/types";
import type { SquadDetail } from "@/features/security/squad-detail/api";
import { GraduationCap, ThumbsDown } from "lucide-react";

type Props = {
	squad: SquadDetail;
	run: RunRecord;
};

/**
 * Reprovações do run e o que foi feito com cada uma. Treinar depois é possível porque a proposta é
 * regenerável a partir do histórico (D2) — não há janela para perder.
 */
export const RunRejectionsSection = ({ squad, run }: Props) => {
	const rejections = run.rejections ?? [];
	if (rejections.length === 0) return null;

	return (
		<section className="border-destructive/30 flex flex-col gap-3 rounded-lg border p-4">
			<div className="flex items-center gap-2">
				<ThumbsDown className="text-destructive size-4" />
				<Typography variant="ui-header">Reprovações</Typography>
				<Badge variant="secondary">{rejections.length}</Badge>
			</div>

			{rejections.map((rejection) => {
				const agent = resolveBlamedAgent(squad, run, rejection);
				const trained = Boolean(rejection.training?.lessonDocumentId || rejection.training?.promptVersionId);
				return (
					<div key={rejection.id} className="flex flex-col gap-2 border-t pt-3 first:border-t-0 first:pt-0">
						<div className="flex flex-wrap items-center gap-2">
							<Typography variant="title-sm">{agent?.name ?? "Agente desconhecido"}</Typography>
							{rejection.category && <Badge variant="secondary">{REJECTION_CATEGORY_LABEL[rejection.category]}</Badge>}
							{rejection.severity && (
								<Badge variant="secondary">gravidade {REJECTION_SEVERITY_LABEL[rejection.severity].toLowerCase()}</Badge>
							)}
							<Typography variant="caption" className="text-muted-foreground ml-auto">
								{new Date(rejection.createdAt).toLocaleString()}
							</Typography>
						</div>
						<Typography variant="body-sm">{rejection.reason}</Typography>
						{trained && (
							<Typography variant="caption" className="text-muted-foreground">
								{[
									rejection.training?.lessonDocumentId ? "lição salva na base" : null,
									rejection.training?.promptVersionId ? "prompt alterado" : null,
									rejection.training?.retriedRunId ? "passo refeito" : null,
								]
									.filter(Boolean)
									.join(" · ")}
							</Typography>
						)}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="self-start"
							onClick={() => startTraining(squad, run, rejection)}
						>
							<GraduationCap />
							{trained ? "Treinar de novo" : "Treinar o agente"}
						</Button>
					</div>
				);
			})}
		</section>
	);
};
