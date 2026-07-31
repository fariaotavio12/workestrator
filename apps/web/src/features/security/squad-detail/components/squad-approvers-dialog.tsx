import { Button, Input, notify } from "@/components";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { SmartOverlay } from "@/components/smart-dialog";
import { Typography } from "@/components/typography";
import { useInviteApprover, useRemoveApprover, useSquadApproversQuery } from "@/features/security/squad-detail/api";
import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	squadId: string;
};

/**
 * Pool de aprovadores do squad (ver .specs/001-aprovacoes-externas-teams). Só convida contas já
 * existentes — o erro do backend já vem claro quando o e-mail não corresponde a ninguém. Quem entra aqui
 * fica disponível para ser atribuído por agente em `agent-form-dialog` (não decide nada só por estar
 * neste pool).
 */
export const SquadApproversDialog = ({ open, onOpenChange, squadId }: Props) => {
	const { data: approvers = [], isLoading } = useSquadApproversQuery(squadId);
	const inviteApprover = useInviteApprover(squadId);
	const removeApprover = useRemoveApprover(squadId);
	const [email, setEmail] = useState("");

	const submitInvite = async () => {
		if (!email.trim()) return;
		try {
			await inviteApprover.mutateAsync(email.trim());
			notify.success("Aprovador adicionado ao pool.");
			setEmail("");
		} catch {
			// useInviteApprover already shows the API error toast.
		}
	};

	const handleRemove = async (approverUserId: string) => {
		try {
			await removeApprover.mutateAsync(approverUserId);
			notify.success("Aprovador removido do pool.");
		} catch (error) {
			// Bloqueado pela invariante D13 (agente ficaria sem ninguém apto a decidir) — mostra o motivo do backend.
			notify.error(getApiErrorMessage(error, "Não foi possível remover este aprovador."));
		}
	};

	return (
		<SmartOverlay
			open={open}
			onOpenChange={onOpenChange}
			title="Aprovadores do squad"
			description="Contas já existentes no Workestrator que podem ser atribuídas para decidir checkpoints de agentes deste squad."
			headerIcon={<ShieldCheck />}
			size="sm"
		>
			<div className="flex flex-col gap-4">
				<div className="flex gap-2">
					<Input
						wrapperClassName="flex-1"
						type="email"
						placeholder="email@empresa.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submitInvite()}
					/>
					<Button size="sm" disabled={!email.trim() || inviteApprover.isPending} onClick={submitInvite}>
						{inviteApprover.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
						Convidar
					</Button>
				</div>

				{isLoading ? (
					<div className="text-muted-foreground flex items-center justify-center gap-2 py-6">
						<Loader2 className="size-4 animate-spin" />
						<Typography variant="body-sm">Carregando...</Typography>
					</div>
				) : approvers.length === 0 ? (
					<Typography variant="body-sm" className="text-muted-foreground py-4 text-center">
						Nenhum aprovador ainda — convide uma conta existente pelo e-mail.
					</Typography>
				) : (
					<div className="flex flex-col gap-1">
						{approvers.map((approver) => (
							<div key={approver.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
								<div className="min-w-0">
									<Typography variant="body-sm" className="truncate">
										{approver.displayName || approver.email}
									</Typography>
									<Typography variant="caption" className="text-muted-foreground truncate">
										{approver.email}
									</Typography>
								</div>
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Remover aprovador"
									disabled={removeApprover.isPending}
									onClick={() => handleRemove(approver.approverUserId)}
								>
									<Trash2 />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>
		</SmartOverlay>
	);
};
