import { Rotas } from "@/app/routing/variables";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { Badge, EmptyState, ErrorState, LoadingSpinner, PageHeader } from "@/components";
import { Typography } from "@/components/typography";
import { useAssignedToMeQuery } from "@/features/security/approvals/api";
import { approvalStatusLabel, approvalStatusVariant } from "@/features/security/approvals/constants";
import { ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * "Aprovações atribuídas a mim" (RF16, .specs/001-aprovacoes-externas-teams) — fallback de um aprovador
 * delegado que não recebeu (ou perdeu) o aviso externo. Não depende de nenhum squad/agente resolvido: só
 * o que o backend já devolve em `GET /approvals/assigned-to-me`.
 */
export const PageApprovalsAssigned = () => {
	const { data: approvals = [], isLoading, isError, error, refetch } = useAssignedToMeQuery();

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
			<PageHeader
				eyebrow="Aprovador delegado"
				title="Aprovações atribuídas a mim"
				description="Checkpoints de squads de outras pessoas onde você foi adicionado como aprovador."
			/>

			{isLoading && <LoadingSpinner containerClassName="h-60" />}

			{isError && !isLoading && (
				<ErrorState
					message={getApiErrorMessage(error, "Não foi possível carregar suas aprovações.")}
					onRetry={() => refetch()}
				/>
			)}

			{!isLoading && !isError && approvals.length === 0 && (
				<EmptyState
					icon={ClipboardCheck}
					title="Nenhuma aprovação atribuída"
					message="Quando alguém te adicionar como aprovador de um agente, os checkpoints pendentes aparecem aqui."
				/>
			)}

			{!isLoading && approvals.length > 0 && (
				<div className="flex flex-col gap-2">
					{approvals.map((approval) => (
						<Link
							key={approval.id}
							to={Rotas.protegidas.orchestrator.approvalDecide.replace(":approvalId", approval.id)}
							className="hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
						>
							<div className="min-w-0 flex-1">
								<Typography variant="body-sm" className="truncate">
									{approval.title}
								</Typography>
								<Typography variant="caption" className="text-muted-foreground">
									{new Date(approval.createdAt).toLocaleString()}
								</Typography>
							</div>
							<Badge variant={approvalStatusVariant[approval.status]}>{approvalStatusLabel[approval.status]}</Badge>
						</Link>
					))}
				</div>
			)}
		</div>
	);
};
