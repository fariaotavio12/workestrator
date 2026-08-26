import { Badge, EmptyState, ErrorState, LoadingSpinner } from "@/components";
import { renderSquadIcon } from "@/components/orchestrator/icon-picker/render-squad-icon";
import {
	formatFileSize,
	formatRunDuration,
	runStatusLabel,
	runStatusVariant,
} from "@/components/orchestrator/run-detail-sheet/run-meta";
import { AgentTurn } from "@/components/orchestrator/run-transcript";
import { Typography } from "@/components/typography";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { useApprovalRunQuery } from "@/features/security/approvals/api";
import { FileText, Image as ImageIcon, Loader2, ScrollText } from "lucide-react";

type Props = {
	approvalId: string;
};

/**
 * A execução por trás da aprovação, somente leitura (`GET /approvals/:id/run`). Existe para o aprovador
 * delegado não decidir às cegas, e — o motivo de ela continuar montada depois da decisão — para ele
 * acompanhar o que o squad fez com o que ele aprovou. O dono também a vê aqui, embora para ele isto
 * seja um resumo do que o histórico do squad já mostra inteiro.
 *
 * Sem nenhum botão de ação: continuar, refazer e salvar-como-ferramenta pertencem ao dono, no
 * `RunDetailSheet`. Aqui não há `Squad` resolvido para eles operarem, e é assim de propósito.
 */
export const ApprovalRunPanel = ({ approvalId }: Props) => {
	const { data: run, isLoading, isError, error, refetch } = useApprovalRunQuery(approvalId);

	if (isLoading) {
		return <LoadingSpinner containerClassName="h-40" />;
	}

	if (isError || !run) {
		return (
			<ErrorState
				title="Não foi possível carregar a execução"
				message={getApiErrorMessage(
					error,
					"A execução deste checkpoint ainda não foi registrada, ou não está mais disponível.",
				)}
				onRetry={() => refetch()}
			/>
		);
	}

	// Normalizado num ponto só: as colunas `jsonb` do run chegam como `null` em linhas antigas, e um
	// `.length` direto derrubava a tela de decisão inteira — o aprovador ficava sem nem o botão de decidir.
	const steps = run.steps ?? [];
	const qaLog = run.qaLog ?? [];
	const files = run.files ?? [];
	const agentById = new Map((run.agents ?? []).map((agent) => [agent.id, agent]));
	const isRunning = run.status === "running";

	return (
		<section className="flex flex-col gap-5 rounded-xl border p-5">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					{run.squad && (
						<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-xl">
							{renderSquadIcon(run.squad.icon, "size-5")}
						</div>
					)}
					<div className="min-w-0">
						<Typography variant="ui-header" className="truncate" title={run.input}>
							{run.input}
						</Typography>
						<Typography variant="caption" className="text-muted-foreground">
							{[
								run.squad?.name,
								runStatusLabel[run.status],
								formatRunDuration(run.startedAt, run.endedAt),
								new Date(run.startedAt).toLocaleString(),
							]
								.filter(Boolean)
								.join(" · ")}
						</Typography>
					</div>
				</div>
				<Badge variant={runStatusVariant[run.status]}>
					{isRunning && <Loader2 className="size-3 animate-spin" />}
					{runStatusLabel[run.status]}
				</Badge>
			</header>

			{qaLog.length > 0 && (
				<div className="flex flex-col gap-2">
					<Typography variant="ui-header">Perguntas durante a execução</Typography>
					{qaLog.map((qa, index) => (
						<div key={`${qa.seatId}-${index}`} className="rounded-lg border p-3">
							<Typography variant="body-sm">{qa.question}</Typography>
							<Typography variant="body-sm" className="text-muted-foreground mt-1">
								{qa.answer}
							</Typography>
						</div>
					))}
				</div>
			)}

			{files.length > 0 && (
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<Typography variant="ui-header">Arquivos gerados</Typography>
						<Badge variant="secondary">{files.length}</Badge>
					</div>
					{/* Só os metadados: o conteúdo vive no workspace do dono, que o aprovador não alcança. */}
					<div className="flex flex-col gap-1">
						{files.map((file) => (
							<div key={file.path} className="flex items-center gap-2 px-2 py-1.5">
								{file.isImage ? (
									<ImageIcon className="text-muted-foreground size-4 shrink-0" />
								) : (
									<FileText className="text-muted-foreground size-4 shrink-0" />
								)}
								<Typography variant="body-sm" className="min-w-0 flex-1 truncate">
									{file.path}
								</Typography>
								<Typography variant="caption" className="text-muted-foreground shrink-0">
									{formatFileSize(file.size)}
								</Typography>
							</div>
						))}
					</div>
				</div>
			)}

			{steps.length === 0 ? (
				<EmptyState
					icon={ScrollText}
					title="Nada registrado ainda"
					message={
						isRunning
							? "A execução começou agora — os passos aparecem aqui conforme os agentes trabalham."
							: "Esta execução não registrou nenhum passo."
					}
				/>
			) : (
				<div className="flex flex-col gap-4">
					{steps.map((step) => {
						const agent = step.agentId ? agentById.get(step.agentId) : undefined;
						return (
							<AgentTurn
								key={step.stepId}
								name={agent?.name ?? "Agent"}
								role={agent?.role}
								character={agent?.character}
								accentColor={agent?.accentColor}
								content={step.artifact ? step.artifact.content : "Sem artefato registrado."}
								artifactKind={step.artifact?.kind}
							/>
						);
					})}
				</div>
			)}

			{isRunning && (
				<Typography variant="caption" className="text-muted-foreground">
					Acompanhando em tempo real — atualiza sozinho a cada 10 segundos.
				</Typography>
			)}
		</section>
	);
};
