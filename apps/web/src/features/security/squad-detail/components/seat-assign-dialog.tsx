import { AppSheet, Badge, Button, EmptyState, Typography, notify } from "@/components";
import { Armchair, Bot, Pencil, Plus, Replace, Trash2, UserMinus } from "lucide-react";
import { useState } from "react";
import { AgentAvatar, ConfirmDialog } from "@/components/orchestrator";
import { modelLabel } from "@/features/security/orchestrator-shared/data/providers";
import type { Agent } from "@/features/security/orchestrator-shared/types";
import { useProvidersQuery } from "@/features/security/models/api";
import { useAssignSeat, useDeleteAgent, useRemoveSeat, useSquadQuery } from "@/features/security/squad-detail/api";
import { AgentFormDialog } from "./agent-form-dialog";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	squadId: string;
	seatId: string | null;
	currentAgentId: string | null;
};

export const SeatAssignDialog = ({ open, onOpenChange, squadId, seatId, currentAgentId }: Props) => {
	const { data: squad } = useSquadQuery(squadId);
	const { data: providers = [] } = useProvidersQuery();
	const assignSeat = useAssignSeat(squadId);
	const deleteAgent = useDeleteAgent(squadId);
	const removeSeat = useRemoveSeat(squadId);
	const agents = squad?.agents ?? [];

	const [agentForm, setAgentForm] = useState<{ agent?: Agent } | null>(null);
	const [toDelete, setToDelete] = useState<Agent | null>(null);

	const currentAgent = currentAgentId ? agents.find((agent) => agent.id === currentAgentId) : undefined;
	/** Exclui o agente já sentado aqui — ele fica no card de resumo acima, repeti-lo na lista é redundante. */
	const pickableAgents = currentAgent ? agents.filter((agent) => agent.id !== currentAgent.id) : agents;

	const pick = async (agentId: string | null) => {
		if (!seatId) return;
		try {
			await assignSeat.mutateAsync({ seatId, agentId });
			notify.success(agentId ? "Agent sentado na cadeira" : "Cadeira esvaziada");
			onOpenChange(false);
		} catch {
			// useAssignSeat already shows the API error toast.
		}
	};

	const removeThisSeat = async () => {
		if (!seatId) return;
		try {
			await removeSeat.mutateAsync(seatId);
			notify.success("Cadeira removida");
			onOpenChange(false);
		} catch {
			// useRemoveSeat already shows the API error toast.
		}
	};

	const createAndAssign = (agent: Agent) => {
		void pick(agent.id);
	};

	const confirmDeleteAgent = async () => {
		if (!toDelete) return;
		try {
			await deleteAgent.mutateAsync(toDelete.id);
			notify.success("Agent excluido");
			if (toDelete.id === currentAgentId) {
				onOpenChange(false);
			}
			setToDelete(null);
		} catch {
			// useDeleteAgent already shows the API error toast.
		}
	};

	const renderAgentOption = (agent: Agent) => {
		const actionLabel = currentAgent ? "Substituir" : "Sentar";

		return (
			<div
				key={agent.id}
				className="hover:border-ring flex flex-col gap-3 rounded-lg border p-2 transition-colors sm:flex-row sm:items-center"
			>
				<div className="flex min-w-0 flex-1 items-center gap-3 self-stretch">
					<AgentAvatar character={agent.character} accentColor={agent.accentColor} size={44} />
					<div className="flex min-w-0 flex-1 flex-col">
						<Typography variant="title-sm" className="truncate">
							{agent.name}
						</Typography>
						<Typography variant="caption" className="text-muted-foreground truncate">
							{agent.role} - {modelLabel(providers, agent.modelRef.providerId, agent.modelRef.model)}
						</Typography>
					</div>
				</div>
				<div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={assignSeat.isPending}
						onClick={() => pick(agent.id)}
					>
						<Replace />
						{actionLabel}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={`Editar ${agent.name}`}
						onClick={() => setAgentForm({ agent })}
					>
						<Pencil />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={`Excluir ${agent.name}`}
						className="text-destructive"
						onClick={() => setToDelete(agent)}
					>
						<Trash2 />
					</Button>
				</div>
			</div>
		);
	};

	return (
		<>
			<AppSheet
				open={open}
				onOpenChange={onOpenChange}
				title={currentAgent ? currentAgent.name : "Cadeira vazia"}
				description={
					currentAgent
						? "Agent sentado nesta cadeira. Edite, retire ou substitua por outro agent."
						: "Escolha um agent para ocupar esta posicao do squad."
				}
				contentClassName="sm:max-w-2xl"
				headerLeading={
					currentAgent ? (
						<AgentAvatar character={currentAgent.character} accentColor={currentAgent.accentColor} size={44} />
					) : (
						<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
							<Armchair className="size-5" />
						</div>
					)
				}
				footer={
					<div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
						<Button variant="error" size="sm" disabled={removeSeat.isPending} onClick={removeThisSeat}>
							<Trash2 />
							Remover cadeira
						</Button>
						{currentAgent && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={assignSeat.isPending}
								onClick={() => pick(null)}
							>
								<UserMinus />
								Retirar agent da cadeira
							</Button>
						)}
					</div>
				}
			>
				<section className="bg-muted/40 flex flex-col gap-4 rounded-lg border p-4">
					{currentAgent ? (
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div className="flex min-w-0 items-center gap-3">
								<AgentAvatar character={currentAgent.character} accentColor={currentAgent.accentColor} size={56} />
								<div className="flex min-w-0 flex-col gap-1">
									<div className="flex flex-wrap items-center gap-2">
										<Typography variant="title-md" className="truncate">
											{currentAgent.name}
										</Typography>
										<Badge variant="secondary">Sentado</Badge>
									</div>
									<Typography variant="body-sm" className="text-muted-foreground">
										{currentAgent.role} -{" "}
										{modelLabel(providers, currentAgent.modelRef.providerId, currentAgent.modelRef.model)}
									</Typography>
								</div>
							</div>
							<div className="flex shrink-0 flex-wrap gap-2">
								<Button type="button" variant="outline" size="sm" onClick={() => setAgentForm({ agent: currentAgent })}>
									<Pencil />
									Editar
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={assignSeat.isPending}
									onClick={() => pick(null)}
								>
									<UserMinus />
									Esvaziar
								</Button>
							</div>
						</div>
					) : (
						<div className="flex items-start gap-3">
							<div className="bg-background text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg border">
								<Armchair className="size-5" />
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<Typography variant="title-sm">Nenhum agent sentado</Typography>
								<Typography variant="body-sm" className="text-muted-foreground">
									Sente um agent existente ou crie um novo para esta cadeira entrar no fluxo do squad.
								</Typography>
							</div>
						</div>
					)}
					{currentAgent && (
						<Typography variant="body-sm" className="text-muted-foreground line-clamp-3">
							{currentAgent.systemPrompt}
						</Typography>
					)}
				</section>

				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 flex-col">
						<Typography variant="title-sm">{currentAgent ? "Substituir por" : "Agents disponiveis"}</Typography>
						<Typography variant="caption" className="text-muted-foreground">
							{currentAgent ? "Escolha outro agent do squad para sentar aqui no lugar." : "Selecione um agent para sentar."}
						</Typography>
					</div>
					<Button type="button" size="sm" onClick={() => setAgentForm({})}>
						<Plus />
						Novo agent
					</Button>
				</div>

				{agents.length === 0 ? (
					<EmptyState
						icon={Bot}
						title="Nenhum agent"
						message="Crie um agent por aqui e ele ja sera sentado nesta cadeira."
						onAction={() => setAgentForm({})}
						actionLabel="Novo agent"
						actionIcon={<Plus />}
					/>
				) : pickableAgents.length === 0 ? (
					<div className="border-t pt-3">
						<Typography variant="body-sm" className="text-muted-foreground">
							Esse é o único agent do squad. Crie outro acima para poder substituir o desta cadeira.
						</Typography>
					</div>
				) : (
					<div className="flex flex-col gap-2 border-t pt-3">{pickableAgents.map(renderAgentOption)}</div>
				)}
			</AppSheet>

			<AgentFormDialog
				open={Boolean(agentForm)}
				onOpenChange={(nextOpen) => !nextOpen && setAgentForm(null)}
				squadId={squadId}
				agent={agentForm?.agent}
				onSaved={agentForm?.agent ? undefined : createAndAssign}
			/>

			<ConfirmDialog
				open={Boolean(toDelete)}
				onOpenChange={(nextOpen) => !nextOpen && setToDelete(null)}
				title="Excluir agent?"
				description={
					toDelete ? `"${toDelete.name}" sera removido e as cadeiras que o usavam ficarao vazias.` : undefined
				}
				confirmLabel="Excluir"
				destructive
				onConfirm={confirmDeleteAgent}
			/>
		</>
	);
};
