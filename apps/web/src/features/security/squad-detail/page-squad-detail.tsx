import { Rotas } from "@/app/routing/variables";
import { Button, Skeleton, SquadFormDialog, Typography, notify } from "@/components";
import { MAX_SEATS } from "@/features/security/orchestrator-shared/data/constants";
import { modelLabel } from "@/features/security/orchestrator-shared/data/providers";
import {
	IDLE_RUNTIME,
	useOrchestratorRuntimeStore,
	useRunDialogStore,
	useSquadHistoryDialogStore,
} from "@/features/security/orchestrator-shared/model";
import { answerPrompt, resolveCheckpoint } from "@/features/security/orchestrator-shared/runtime/orchestrator-runtime";
import { getSquadReadiness, readinessMessage } from "@/features/security/orchestrator-shared/runtime/squad-readiness";
import type { Agent, Squad } from "@/features/security/orchestrator-shared/types";
import { useProvidersQuery } from "@/features/security/models/api";
import { useAddSeat, useAssignSeat, useSquadQuery } from "@/features/security/squad-detail/api";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AgentFormDialog } from "./components/agent-form-dialog";
import { OrchestratorConfigDialog } from "./components/orchestrator-config-dialog";
import { SeatAssignDialog } from "./components/seat-assign-dialog";
import { ShareLinkDialog } from "./components/share-link-dialog";
import { SquadDetailHeader, SquadDetailHeaderSkeleton } from "./components/squad-detail-header";
import { OfficeCanvas, type OfficeSeatView } from "./office/office-canvas";

/** Layout de cadeira nova replicado do antigo `use-orchestrator.ts` — 3 por linha. */
const nextSeatPosition = (seatCount: number): { col: number; row: number } => ({
	col: (seatCount % 3) + 1,
	row: Math.floor(seatCount / 3) + 1,
});

export const PageSquadDetail = () => {
	const { id = "" } = useParams();
	const navigate = useNavigate();

	const { data: squadDetail, isLoading } = useSquadQuery(id);
	const { data: providers = [] } = useProvidersQuery();
	const runtime = useOrchestratorRuntimeStore((s) => s.runtimes[id] ?? IDLE_RUNTIME);
	const addSeat = useAddSeat(id);
	const assignSeat = useAssignSeat(id);

	const squad = useMemo<Squad | undefined>(
		() => (squadDetail ? { ...squadDetail, runtime } : undefined),
		[squadDetail, runtime],
	);

	const [editOpen, setEditOpen] = useState(false);
	const [agentForm, setAgentForm] = useState<{ agent?: Agent } | null>(null);
	const [seatDialog, setSeatDialog] = useState<{ seatId: string; agentId: string | null } | null>(null);
	const [orchestratorOpen, setOrchestratorOpen] = useState(false);
	const [shareOpen, setShareOpen] = useState(false);
	const openRunDialog = useRunDialogStore((s) => s.openRunDialog);
	const openHistoryDialog = useSquadHistoryDialogStore((s) => s.openHistoryDialog);

	const readiness = useMemo(() => (squad ? getSquadReadiness(squad, providers) : []), [squad, providers]);

	const seatsView = useMemo<OfficeSeatView[]>(() => {
		if (!squad) return [];
		const brokenAgentIssues = new Map<string, string>();
		for (const issue of readiness) {
			if (issue.kind === "agent-provider-missing" || issue.kind === "agent-no-model") {
				brokenAgentIssues.set(issue.agentId, readinessMessage(issue));
			}
		}
		return squad.seats.map((seat) => {
			const agent = seat.agentId ? squad.agents.find((a) => a.id === seat.agentId) : null;
			return {
				seatId: seat.id,
				agent: agent
					? {
							name: agent.name,
							role: agent.role,
							character: agent.character,
							accentColor: agent.accentColor,
							model: modelLabel(providers, agent.modelRef.providerId, agent.modelRef.model),
							issue: brokenAgentIssues.get(agent.id),
						}
					: null,
				status: squad.runtime.perAgentStatus[seat.id] ?? "idle",
			};
		});
	}, [squad, providers, readiness]);

	if (isLoading) {
		return (
			<div className="flex min-h-0 w-full flex-1 flex-col">
				<SquadDetailHeaderSkeleton />
				<div className="min-h-0 flex-1 p-4 sm:p-6">
					<Skeleton className="h-full min-h-96 w-full rounded-xl" />
				</div>
			</div>
		);
	}

	if (!squad) {
		return (
			<div className="flex w-full flex-col items-center gap-4 p-10 text-center">
				<Typography variant="title-md">Squad não encontrado</Typography>
				<Button variant="outline" onClick={() => navigate(Rotas.protegidas.orchestrator.squads)}>
					<ArrowLeft />
					Voltar para squads
				</Button>
			</div>
		);
	}

	const occupied = squad.seats.filter((s) => s.agentId).length;
	const seatFull = squad.seats.length >= MAX_SEATS;
	const isRunning = ["running", "checkpoint", "awaiting_input"].includes(squad.runtime.status);

	const openSeat = (seatId: string) => {
		if (isRunning) {
			notify.warning("Pare a execução para editar as cadeiras.");
			return;
		}
		const seat = squad.seats.find((s) => s.id === seatId);
		setSeatDialog({ seatId, agentId: seat?.agentId ?? null });
	};

	const handleAddSeat = async () => {
		try {
			await addSeat.mutateAsync(nextSeatPosition(squad.seats.length));
			notify.success("Cadeira adicionada");
		} catch {
			// useAddSeat already shows the API error toast.
		}
	};

	// Só roda na criação (nunca ao editar, ver `onSaved` abaixo) — senta o agent novo numa cadeira vazia
	// existente ou, se não houver, cria uma cadeira já ocupada por ele. Sem cadeira o agent fica "no banco",
	// invisível no escritório até alguém sentá-lo manualmente.
	const handleNewAgentSeated = async (newAgent: Agent) => {
		const emptySeat = squad.seats.find((s) => !s.agentId);
		try {
			if (emptySeat) {
				await assignSeat.mutateAsync({ seatId: emptySeat.id, agentId: newAgent.id });
			} else if (squad.seats.length < MAX_SEATS) {
				await addSeat.mutateAsync({ ...nextSeatPosition(squad.seats.length), agentId: newAgent.id });
			} else {
				notify.info("Squad no limite de cadeiras — sente este agent manualmente.");
			}
		} catch {
			// useAssignSeat/useAddSeat already show the API error toast.
		}
	};

	return (
		<div className="flex min-h-0 w-full flex-1 flex-col">
			<SquadDetailHeader
				squad={squad}
				occupiedSeats={occupied}
				isRunning={isRunning}
				isSeatFull={seatFull}
				isAddingSeat={addSeat.isPending}
				isRunDisabled={readiness.length > 0}
				runDisabledTitle={readiness.length > 0 ? readiness.map(readinessMessage).join(" ") : undefined}
				onBack={() => navigate(Rotas.protegidas.orchestrator.squads)}
				onEdit={() => setEditOpen(true)}
				onAddSeat={handleAddSeat}
				onNewAgent={() => setAgentForm({})}
				onOpenHistory={() => openHistoryDialog(squad.id)}
				onShare={() => setShareOpen(true)}
				onRun={() => openRunDialog(squad.id)}
			/>

			<div className="min-h-0 flex-1 p-4 sm:p-6">
				{readiness.length > 0 && (
					<div className="border-warning/40 bg-warning/10 mb-4 rounded-lg border p-4">
						<div className="flex flex-col gap-3">
							<div className="flex items-start gap-3">
								<div className="border-warning/30 bg-warning/15 flex size-8 shrink-0 items-center justify-center rounded-lg border">
									<AlertTriangle className="text-warning size-4" />
								</div>
								<div className="min-w-0 space-y-1">
									<Typography variant="title-sm">Este squad não vai rodar do jeito que está</Typography>
									<Typography variant="body-sm" className="text-muted-foreground">
										Resolva as pendências abaixo antes de iniciar a execução.
									</Typography>
								</div>
							</div>

							<ul className="border-warning/20 bg-background/40 divide-warning/20 divide-y overflow-hidden rounded-lg border">
								{readiness.map((issue, i) => (
									<li key={i} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center">
										<Typography variant="body-sm" className="text-muted-foreground min-w-0">
											{readinessMessage(issue)}
										</Typography>
										<div className="flex md:justify-end">
											{issue.kind === "no-provider" && (
												<Button
													size="sm"
													variant="outline"
													className="w-full md:w-44"
													onClick={() => navigate(Rotas.protegidas.orchestrator.models)}
												>
													Conectar modelo
												</Button>
											)}
											{issue.kind === "coordinator-provider-missing" && (
												<Button
													size="sm"
													variant="outline"
													className="w-full md:w-44"
													onClick={() => setOrchestratorOpen(true)}
												>
													Revisar coordenador
												</Button>
											)}
											{(issue.kind === "agent-provider-missing" || issue.kind === "agent-no-model") && (
												<Button
													size="sm"
													variant="outline"
													className="w-full md:w-44"
													onClick={() => {
														const brokenAgent = squad.agents.find((a) => a.id === issue.agentId);
														if (brokenAgent) setAgentForm({ agent: brokenAgent });
													}}
												>
													Corrigir agent
												</Button>
											)}
										</div>
									</li>
								))}
							</ul>
						</div>
					</div>
				)}
				<OfficeCanvas
					squad={squad}
					seats={seatsView}
					coordinator={{
						model: modelLabel(providers, squad.orchestrator.modelRef.providerId, squad.orchestrator.modelRef.model),
						maxSteps: squad.orchestrator.maxSteps,
					}}
					onCoordinatorClick={() => setOrchestratorOpen(true)}
					onSeatClick={openSeat}
					onAnswerQuestion={(answer) => answerPrompt(squad.id, answer)}
					onApproveCheckpoint={() => resolveCheckpoint(squad.id, true)}
					onRejectCheckpoint={() => resolveCheckpoint(squad.id, false)}
				/>
			</div>

			<SquadFormDialog open={editOpen} onOpenChange={setEditOpen} squad={squad} />
			<AgentFormDialog
				open={Boolean(agentForm)}
				onOpenChange={(next) => !next && setAgentForm(null)}
				squadId={squad.id}
				agent={agentForm?.agent}
				onSaved={agentForm?.agent ? undefined : handleNewAgentSeated}
			/>
			<SeatAssignDialog
				open={Boolean(seatDialog)}
				onOpenChange={(open) => !open && setSeatDialog(null)}
				squadId={squad.id}
				seatId={seatDialog?.seatId ?? null}
				currentAgentId={seatDialog?.agentId ?? null}
			/>
			<OrchestratorConfigDialog open={orchestratorOpen} onOpenChange={setOrchestratorOpen} squad={squad} />
			<ShareLinkDialog open={shareOpen} onOpenChange={setShareOpen} squadId={squad.id} squadName={squad.name} />
		</div>
	);
};
