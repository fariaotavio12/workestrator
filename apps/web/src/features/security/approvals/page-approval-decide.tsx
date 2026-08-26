import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { Button, EmptyState, ErrorState, LoadingSpinner, notify, PageHeader, Textarea } from "@/components";
import { Typography } from "@/components/typography";
import {
	approvalsKeys,
	cancelApprovalApi,
	decideApprovalApi,
	extractApprovalFromConflict,
	useApprovalQuery,
} from "@/features/security/approvals/api";
import type { ApprovalRequest } from "@/features/security/orchestrator-shared/types";
import { useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, Check, Lock, ShieldOff, X } from "lucide-react";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ApprovalItemsPanel } from "./components/approval-items-panel";
import { ApprovalRunPanel } from "./components/approval-run-panel";

const CHECKPOINT_KIND_LABEL: Record<ApprovalRequest["checkpointKind"], string> = {
	before: "antes de agir",
	after: "depois de agir, antes de o coordenador seguir",
};

const STATUS_MESSAGE: Record<Exclude<ApprovalRequest["status"], "pending">, string> = {
	approved: "Aprovado",
	rejected: "Reprovado",
	canceled: "Cancelado",
};

/**
 * Tela dedicada de decisão de checkpoint (ver .specs/001-aprovacoes-externas-teams, design D5/D6). Serve
 * tanto o dono do squad quanto um aprovador delegado — o mesmo link, a mesma tela, a autorização é
 * resolvida pelo backend (`ApprovalResponse.canDecide`/`canCancel`). Não busca squad/agente por id: quem
 * decide pode não ter acesso ao squad, então todo o contexto legível já vem embutido em `title`/`summary`.
 *
 * A execução aparece abaixo (`ApprovalRunPanel`), lida por `GET /approvals/:id/run` — autorizada pelo
 * pedido, não pelo squad. Ela fica montada **em qualquer status**: quem aprovou continua acompanhando o
 * que o squad fez com aquilo, que é justamente o que a tela não entregava quando só mostrava "Aprovado".
 */
export const PageApprovalDecide = () => {
	const { approvalId = "" } = useParams();
	// `?item=` vem do link por item do aviso (design D15) — quem chegou de uma mensagem específica no Teams
	// abre a lista com aquele chamado destacado, em vez de ter que procurar no meio do lote.
	const [searchParams] = useSearchParams();
	const focusedItemId = searchParams.get("item");
	const queryClient = useQueryClient();
	const { data: approval, isLoading, isError, error, refetch } = useApprovalQuery(approvalId);
	const [rejecting, setRejecting] = useState(false);
	const [reason, setReason] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const applyResult = (result: ApprovalRequest) => {
		queryClient.setQueryData(approvalsKeys.detail(approvalId), result);
	};

	const decide = async (approved: boolean) => {
		if (!approved && !reason.trim()) return;
		setSubmitting(true);
		try {
			const result = await decideApprovalApi(approvalId, { approved, feedback: reason.trim() || undefined });
			applyResult(result);
			setRejecting(false);
			setReason("");
		} catch (err) {
			const conflicting = extractApprovalFromConflict(err);
			if (conflicting) {
				applyResult(conflicting);
				notify.warning("Este checkpoint já tinha sido decidido por outra pessoa.");
			} else {
				notify.error(getApiErrorMessage(err, "Não foi possível registrar a decisão."));
			}
		} finally {
			setSubmitting(false);
		}
	};

	const cancelRun = async () => {
		setSubmitting(true);
		try {
			applyResult(await cancelApprovalApi(approvalId));
		} catch (err) {
			notify.error(getApiErrorMessage(err, "Não foi possível cancelar a execução."));
		} finally {
			setSubmitting(false);
		}
	};

	if (isLoading) {
		return <LoadingSpinner containerClassName="h-[60vh]" />;
	}

	if (isError || !approval) {
		return (
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-10">
				<ErrorState
					title="Não foi possível abrir esta aprovação"
					message={getApiErrorMessage(
						error,
						"O link pode ter expirado, o pedido pode não existir mais, ou sua conta não tem acesso a ele.",
					)}
					onRetry={() => refetch()}
				/>
			</div>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
			<PageHeader eyebrow="Aprovação de checkpoint" title={approval.title} />

			{approval.status !== "pending" ? (
				<EmptyState
					icon={approval.status === "approved" ? Check : approval.status === "rejected" ? X : AlertOctagon}
					title={STATUS_MESSAGE[approval.status]}
					message={
						approval.decidedAt
							? `Decidido ${approval.decidedByRole === "approver" ? "por um aprovador" : "pelo dono do squad"} em ${new Date(approval.decidedAt).toLocaleString()}.`
							: "Este pedido não está mais pendente."
					}
				/>
			) : (
				<div className="flex flex-col gap-5 rounded-xl border p-5">
					<div className="flex flex-col gap-1">
						<Typography variant="caption" className="text-muted-foreground uppercase">
							{CHECKPOINT_KIND_LABEL[approval.checkpointKind]}
						</Typography>
						<Typography variant="body-md" className="whitespace-pre-wrap">
							{approval.summary}
						</Typography>
					</div>

					{!approval.canDecide && !approval.canCancel && (
						<div className="text-muted-foreground flex items-center gap-2 text-sm">
							<Lock className="size-4 shrink-0" />
							Sua conta não tem permissão para decidir esta aprovação.
						</div>
					)}

					{!approval.canDecide && approval.canCancel && (
						<div className="flex flex-col gap-3">
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<ShieldOff className="size-4 shrink-0" />
								Você se retirou da decisão deste agente — só pode abortar a execução.
							</div>
							<Button variant="error" disabled={submitting} onClick={cancelRun}>
								Abortar execução
							</Button>
						</div>
					)}

					{/* Com itens a decisão é sempre por item — o `decide` do lote responde 422 (design D15). */}
					{approval.items.length > 0 && (
						<ApprovalItemsPanel approval={approval} onDecided={applyResult} focusedItemId={focusedItemId} />
					)}

					{approval.items.length === 0 && approval.canDecide && !rejecting && (
						<div className="flex gap-2">
							<Button variant="error" className="flex-1" disabled={submitting} onClick={() => setRejecting(true)}>
								<X />
								Reprovar
							</Button>
							<Button className="flex-1" disabled={submitting} onClick={() => decide(true)}>
								<Check />
								Aprovar
							</Button>
						</div>
					)}

					{approval.items.length === 0 && approval.canDecide && rejecting && (
						<div className="flex flex-col gap-3">
							<Textarea
								label="Motivo da reprovação"
								placeholder="O que precisa mudar? Esse texto alimenta o treinamento do agente."
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								autoFocus
								className="min-h-24"
							/>
							<div className="flex justify-end gap-2">
								<Button variant="outline" disabled={submitting} onClick={() => setRejecting(false)}>
									Cancelar
								</Button>
								<Button variant="error" disabled={submitting || !reason.trim()} onClick={() => decide(false)}>
									Confirmar reprovação
								</Button>
							</div>
						</div>
					)}
				</div>
			)}

			<ApprovalRunPanel approvalId={approvalId} />
		</div>
	);
};
