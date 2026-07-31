import { Button, Input, Textarea } from "@/components";
import { useApprovalQuery } from "@/features/security/approvals/api";
import { Check, Send, X } from "lucide-react";
import { useState } from "react";
import { Typography } from "@/components/typography";
import type { CheckpointRejectionInput } from "@/features/security/orchestrator-shared/runtime/orchestrator-runtime";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { AgentAvatar } from "../agent-avatar";

type Props = {
	squad: Squad;
	onApprove: () => void;
	onReject: (rejection: CheckpointRejectionInput) => void;
	onAnswer: (answer: string) => void;
};

/** Painel de interação: aprovação de checkpoint ou resposta a uma pergunta do agent. */
export const RunInteractionPanel = ({ squad, onApprove, onReject, onAnswer }: Props) => {
	const { status, pendingSeatId, pendingCheckpointKind, pendingQuestion, pendingApprovalId } = squad.runtime;
	const [answer, setAnswer] = useState("");
	const [rejecting, setRejecting] = useState(false);
	const [reason, setReason] = useState("");
	// Só para exibição (notificado/erro) — a decisão em si é dirigida pelo `approval-watcher` via
	// `runtime.pendingApprovalId`, não por este fetch.
	const { data: approval } = useApprovalQuery(pendingApprovalId ?? undefined);

	const seatAgent = (seatId?: string | null) => {
		const seat = seatId ? squad.seats.find((s) => s.id === seatId) : undefined;
		return seat?.agentId ? squad.agents.find((a) => a.id === seat.agentId) : undefined;
	};

	if (status === "checkpoint") {
		const agent = seatAgent(pendingSeatId);
		const approverIds = agent?.approvalPolicy?.approverUserIds ?? [];
		const ownerCanDecide = agent?.approvalPolicy?.ownerCanDecide ?? true;

		const submitReject = () => {
			if (!reason.trim()) return;
			onReject({ reason: reason.trim() });
			setReason("");
			setRejecting(false);
		};

		if (rejecting) {
			return (
				<div className="border-error/40 bg-error/5 flex flex-col gap-3 rounded-xl border p-3">
					<Textarea
						label="Motivo da reprovação"
						placeholder="O que precisa mudar? Esse texto alimenta o treinamento do agente."
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						autoFocus
						className="min-h-20"
					/>
					<div className="flex justify-end gap-2">
						<Button size="sm" variant="outline" onClick={() => setRejecting(false)}>
							Cancelar
						</Button>
						<Button size="sm" variant="error" disabled={!reason.trim()} onClick={submitReject}>
							<X />
							Confirmar reprovação
						</Button>
					</div>
				</div>
			);
		}

		return (
			<div className="border-warning/40 bg-warning/10 flex flex-col gap-2 rounded-xl border p-3">
				<div className="flex items-center gap-3">
					{agent && <AgentAvatar character={agent.character} accentColor={agent.accentColor} size={32} />}
					<Typography variant="body-sm" className="min-w-0 flex-1">
						{pendingCheckpointKind === "after" ? (
							<>
								Aprovar para seguir depois de <span className="font-semibold">{agent?.name ?? "o agent"}</span>?
							</>
						) : (
							<>
								Aprovar antes de acionar <span className="font-semibold">{agent?.name ?? "o agent"}</span>?
							</>
						)}
					</Typography>
					{!ownerCanDecide ? (
						<Typography variant="caption" className="text-muted-foreground shrink-0">
							Você se retirou da decisão deste agente — só abortar.
						</Typography>
					) : (
						<div className="flex shrink-0 gap-2">
							<Button size="sm" variant="error" onClick={() => setRejecting(true)}>
								<X />
								Rejeitar
							</Button>
							<Button size="sm" onClick={onApprove}>
								<Check />
								Aprovar
							</Button>
						</div>
					)}
				</div>
				{pendingApprovalId && (
					<Typography variant="caption" className="text-muted-foreground">
						{approval?.notifyError
							? `Falha ao notificar externamente: ${approval.notifyError}`
							: approval?.notifiedAt
								? `Notificado externamente às ${new Date(approval.notifiedAt).toLocaleTimeString()}.`
								: "Registrando pedido de aprovação..."}
						{approverIds.length > 0 && ` · ${approverIds.length} aprovador(es) também podem decidir.`}
					</Typography>
				)}
			</div>
		);
	}

	if (status === "awaiting_input" && pendingQuestion) {
		const agent = seatAgent(pendingQuestion.seatId);
		const submit = () => {
			if (!answer.trim()) return;
			onAnswer(answer.trim());
			setAnswer("");
		};
		return (
			<div className="border-primary/40 bg-primary/5 flex flex-col gap-3 rounded-xl border p-3">
				<div className="flex items-center gap-2">
					{agent && <AgentAvatar character={agent.character} accentColor={agent.accentColor} size={28} />}
					<Typography variant="title-sm">{agent?.name ?? "Agent"} perguntou</Typography>
				</div>
				<Typography variant="body-sm">{pendingQuestion.question}</Typography>
				{pendingQuestion.options && pendingQuestion.options.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{pendingQuestion.options.map((option) => (
							<Button key={option} size="sm" variant="outline" onClick={() => onAnswer(option)}>
								{option}
							</Button>
						))}
					</div>
				) : (
					<div className="flex gap-2">
						<Input
							wrapperClassName="flex-1"
							placeholder="Sua resposta"
							value={answer}
							onChange={(e) => setAnswer(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && submit()}
							autoFocus
						/>
						<Button size="sm" onClick={submit}>
							<Send />
							Enviar
						</Button>
					</div>
				)}
			</div>
		);
	}

	return null;
};
