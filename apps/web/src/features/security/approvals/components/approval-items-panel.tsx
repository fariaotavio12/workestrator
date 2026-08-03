import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { Badge, Button, notify, Textarea } from "@/components";
import { Typography } from "@/components/typography";
import { decideApprovalItemApi, extractApprovalFromConflict } from "@/features/security/approvals/api";
import type { ApprovalItem, ApprovalRequest } from "@/features/security/orchestrator-shared/types";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { approvalItemStatusLabel, approvalItemStatusVariant } from "../constants";

type Props = {
	approval: ApprovalRequest;
	/** Recebe o pedido atualizado após cada decisão — quem chama decide onde guardar (cache, store…). */
	onDecided: (updated: ApprovalRequest) => void;
	/** Item em foco (`?item=` do link do aviso) — destacado para quem chegou por uma mensagem específica. */
	focusedItemId?: string | null;
};

/**
 * Lista de itens decidíveis de um checkpoint (ver .specs/001-aprovacoes-externas-teams, design D15) — um
 * veredito por item, em vez de um botão só para o lote. Compartilhada entre a tela dedicada de decisão e o
 * painel do run, porque a regra de "o que ainda é decidível" tem que ser idêntica nos dois.
 *
 * `data` é renderizado como pares chave/valor **sem conhecer nome de campo nenhum**: o esquema pertence ao
 * domínio de quem montou o squad, e hardcodar campo aqui amarraria a tela a um caso de uso só.
 */
export const ApprovalItemsPanel = ({ approval, onDecided, focusedItemId }: Props) => {
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [reason, setReason] = useState("");
	const [submittingId, setSubmittingId] = useState<string | null>(null);

	const decided = approval.items.filter((item) => item.status !== "pending").length;
	const total = approval.items.length;

	const decide = async (item: ApprovalItem, approved: boolean) => {
		const feedback = approved ? undefined : reason.trim();
		if (!approved && !feedback) return;
		setSubmittingId(item.id);
		try {
			const updated = await decideApprovalItemApi(approval.id, item.id, { approved, feedback });
			onDecided(updated);
			setRejectingId(null);
			setReason("");
		} catch (err) {
			// Mesma semântica do pedido inteiro (D10), por item: o 409 traz o estado real, então aplicar é
			// mais útil que mostrar erro — quem chegou depois vê quem decidiu aquele item.
			const conflicting = extractApprovalFromConflict(err);
			if (conflicting) {
				onDecided(conflicting);
				notify.warning("Este item já tinha sido decidido.");
			} else {
				notify.error(getApiErrorMessage(err, "Não foi possível registrar a decisão deste item."));
			}
		} finally {
			setSubmittingId(null);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-2">
				<Typography variant="caption" className="text-muted-foreground uppercase">
					Decisão por item
				</Typography>
				<Typography variant="caption" className="text-muted-foreground">
					{decided} de {total} decididos
				</Typography>
			</div>

			{approval.items.map((item, index) => {
				const isFocused = item.id === focusedItemId;
				const isPending = item.status === "pending";
				const canAct = isPending && approval.canDecide;
				return (
					<div
						key={item.id}
						className={`flex flex-col gap-3 rounded-lg border p-3 ${isFocused ? "border-primary" : "border-border"}`}
					>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<Typography variant="title-sm" className="truncate">
									{item.ref ?? item.label ?? `Item ${index + 1}`}
								</Typography>
								{item.ref && item.label && item.label !== item.ref && (
									<Typography variant="body-sm" className="text-muted-foreground truncate">
										{item.label}
									</Typography>
								)}
							</div>
							<Badge variant={approvalItemStatusVariant[item.status]}>{approvalItemStatusLabel[item.status]}</Badge>
						</div>

						<dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
							{Object.entries(item.data).map(([key, value]) => (
								<div key={key} className="contents">
									<dt className="text-muted-foreground text-sm break-words">{key}</dt>
									<dd className="text-sm break-words">{formatValue(value)}</dd>
								</div>
							))}
						</dl>

						{item.status === "rejected" && item.feedback && (
							<Typography variant="body-sm" className="text-muted-foreground">
								Motivo: {item.feedback}
							</Typography>
						)}

						{canAct && rejectingId !== item.id && (
							<div className="flex gap-2">
								<Button
									variant="error"
									size="sm"
									className="flex-1"
									disabled={submittingId !== null}
									onClick={() => {
										setRejectingId(item.id);
										setReason("");
									}}
								>
									<X />
									Reprovar
								</Button>
								<Button
									size="sm"
									className="flex-1"
									disabled={submittingId !== null}
									onClick={() => decide(item, true)}
								>
									<Check />
									Aprovar
								</Button>
							</div>
						)}

						{canAct && rejectingId === item.id && (
							<div className="flex flex-col gap-2">
								<Textarea
									label="Motivo da reprovação"
									placeholder="O que está errado neste item? Esse texto alimenta o treinamento do agente."
									value={reason}
									onChange={(event) => setReason(event.target.value)}
									autoFocus
									className="min-h-20"
								/>
								<div className="flex justify-end gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={submittingId !== null}
										onClick={() => setRejectingId(null)}
									>
										Cancelar
									</Button>
									<Button
										variant="error"
										size="sm"
										disabled={submittingId !== null || !reason.trim()}
										onClick={() => decide(item, false)}
									>
										Confirmar reprovação
									</Button>
								</div>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};

/** `data` é passthrough, então o valor pode ser objeto/array — serializa em vez de renderizar "[object Object]". */
const formatValue = (value: unknown): string => {
	if (value === null || value === undefined || value === "") return "—";
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
};
