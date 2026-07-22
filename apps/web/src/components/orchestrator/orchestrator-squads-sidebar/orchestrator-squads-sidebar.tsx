import { Rotas } from "@/app/routing/variables";
import { cn } from "@/app/utils/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	Typography,
	notify,
} from "@/components";
import { AlertTriangle, Copy, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../confirm-dialog";
import { renderSquadIcon } from "../icon-picker/render-squad-icon";
import { SquadFormDialog } from "../squad-form-dialog";
import { useDeleteSquad, useDuplicateSquad, useSquadsQuery } from "@/features/security/squads/api";
import type { SquadSummary } from "@/features/security/squads/api";
import { ACTIVE_RUN_STATUSES, ATTENTION_RUN_STATUSES } from "@/features/security/orchestrator-shared/data/constants";
import { useOrchestratorRuntimeStore, useRunDialogStore } from "@/features/security/orchestrator-shared/model";

const squadPath = (id: string) => Rotas.protegidas.orchestrator.squadDetail.replace(":id", id);

export const OrchestratorSquadsSidebar = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { data: squads = [] } = useSquadsQuery();
	const duplicateSquad = useDuplicateSquad();
	const deleteSquad = useDeleteSquad();
	const runtimes = useOrchestratorRuntimeStore((s) => s.runtimes);
	const runIdsBySquad = useOrchestratorRuntimeStore((s) => s.runIdsBySquad);
	const openRunDialog = useRunDialogStore((s) => s.openRunDialog);

	// Indicador global de execuções ao vivo — "precisa de você" tem prioridade sobre "só rodando"
	// (ver docs/plano-integracoes-e-flow-builder.md, Etapa 4.5). Sem isso, nada no app avisa
	// persistentemente que um run está esperando resposta fora do dialog. Lista achatada (squad + run)
	// pra permitir acessar qualquer execução ativa, não só a primeira — essencial com runs paralelos.
	const activity = useMemo(() => {
		const squadById = new Map(squads.map((squad) => [squad.id, squad]));
		const entries = Object.entries(runIdsBySquad).flatMap(([squadId, runIds]) => {
			const squad = squadById.get(squadId);
			if (!squad) return [];
			return runIds
				.map((runId) => ({ runId, squad, status: runtimes[runId]?.status ?? "idle" }))
				.filter((entry) => ACTIVE_RUN_STATUSES.has(entry.status));
		});
		const attentionEntries = entries.filter((entry) => ATTENTION_RUN_STATUSES.has(entry.status));
		return { entries, attentionEntries };
	}, [runIdsBySquad, squads, runtimes]);

	const [createOpen, setCreateOpen] = useState(false);
	const [editingSquad, setEditingSquad] = useState<SquadSummary | undefined>(undefined);
	const [deletingSquad, setDeletingSquad] = useState<SquadSummary | undefined>(undefined);

	const openCreate = () => setCreateOpen(true);

	const cloneSquad = async (squad: SquadSummary) => {
		try {
			const copy = await duplicateSquad.mutateAsync(squad);
			notify.success("Squad clonado");
			navigate(squadPath(copy.id));
		} catch {
			// useDuplicateSquad already shows the API error toast.
		}
	};

	const confirmDelete = async () => {
		if (!deletingSquad) return;

		const shouldLeaveDetail = pathname === squadPath(deletingSquad.id);
		try {
			await deleteSquad.mutateAsync(deletingSquad.id);
			notify.success("Squad excluido");
			setDeletingSquad(undefined);

			if (shouldLeaveDetail) {
				navigate(Rotas.protegidas.orchestrator.squads);
			}
		} catch {
			// useDeleteSquad already shows the API error toast.
		}
	};

	return (
		<>
			<SidebarGroup>
				<SidebarGroupLabel>Recentes</SidebarGroupLabel>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton type="button" tooltip="Novo squad" className="mb-1" onClick={openCreate}>
							<Plus className="size-4" />
							<Typography variant="nav-link" as="span" className="group-data-[collapsible=icon]:hidden">
								Novo squad
							</Typography>
						</SidebarMenuButton>
					</SidebarMenuItem>

					{activity.attentionEntries.length > 0 ? (
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton
										type="button"
										tooltip="Precisa de você"
										className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/15 mb-1 border"
									>
										<AlertTriangle className="size-4" />
										<Typography variant="nav-link" as="span" className="group-data-[collapsible=icon]:hidden">
											Precisa de você{activity.attentionEntries.length > 1 ? ` (${activity.attentionEntries.length})` : ""}
										</Typography>
									</SidebarMenuButton>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-56">
									<DropdownMenuLabel>Precisam de você</DropdownMenuLabel>
									{activity.attentionEntries.map((entry) => (
										<DropdownMenuItem
											key={entry.runId}
											variant="warning"
											onClick={() => openRunDialog(entry.squad.id, entry.runId)}
										>
											<AlertTriangle className="size-3.5" />
											<span className="truncate">{entry.squad.name}</span>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					) : (
						activity.entries.length > 0 && (
							<SidebarMenuItem>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<SidebarMenuButton type="button" tooltip="Execuções rodando" className="text-primary mb-1">
											<Play className="size-4" />
											<Typography variant="nav-link" as="span" className="group-data-[collapsible=icon]:hidden">
												{activity.entries.length} execução(ões) rodando
											</Typography>
										</SidebarMenuButton>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="start" className="w-56">
										<DropdownMenuLabel>Execuções rodando</DropdownMenuLabel>
										{activity.entries.map((entry) => (
											<DropdownMenuItem key={entry.runId} onClick={() => openRunDialog(entry.squad.id, entry.runId)}>
												<Play className="size-3.5" />
												<span className="truncate">{entry.squad.name}</span>
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						)
					)}

					{squads.length === 0 ? (
						<SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
							<div className="border-sidebar-border bg-muted/40 rounded-lg border border-dashed px-3 py-3">
								<Typography variant="caption" className="text-muted-foreground">
									Nenhum squad criado.
								</Typography>
							</div>
						</SidebarMenuItem>
					) : (
						squads.map((squad) => {
							const url = squadPath(squad.id);
							const isActive = pathname === url;
							const squadRunIds = runIdsBySquad[squad.id] ?? [];
							const status =
								squadRunIds
									.map((runId) => runtimes[runId]?.status ?? "idle")
									.find((item) => ATTENTION_RUN_STATUSES.has(item)) ??
								squadRunIds
									.map((runId) => runtimes[runId]?.status ?? "idle")
									.find((item) => ACTIVE_RUN_STATUSES.has(item)) ??
								"idle";
							const isLive = ACTIVE_RUN_STATUSES.has(status);
							const needsAttention = ATTENTION_RUN_STATUSES.has(status);

							return (
								<SidebarMenuItem key={squad.id}>
									<SidebarMenuButton asChild tooltip={squad.name} isActive={isActive}>
										<Link to={url} aria-current={isActive ? "page" : undefined}>
											<span
												aria-hidden
												className={cn(
													"size-1.5 shrink-0 rounded-full group-data-[collapsible=icon]:hidden",
													needsAttention ? "bg-warning" : isLive ? "bg-success" : "bg-border",
												)}
											/>
											<span aria-hidden className="flex size-4 shrink-0 items-center justify-center text-sm">
												{renderSquadIcon(squad.icon)}
											</span>
											<Typography
												variant="nav-link"
												as="span"
												className="truncate group-data-[collapsible=icon]:hidden"
											>
												{squad.name}
											</Typography>
										</Link>
									</SidebarMenuButton>

									<div className="bg-sidebar/95 ring-sidebar-border absolute top-1.5 right-1 flex h-6 items-center gap-0.5 rounded-full p-0.5 opacity-0 shadow-sm ring-1 transition-opacity group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 group-data-[collapsible=icon]:hidden">
										<button
											type="button"
											aria-label={`Editar ${squad.name}`}
											className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-5 items-center justify-center rounded-full transition-colors"
											onClick={(event) => {
												event.preventDefault();
												event.stopPropagation();
												setEditingSquad(squad);
											}}
										>
											<Pencil className="size-3.5" />
										</button>
										<button
											type="button"
											aria-label={`Clonar ${squad.name}`}
											className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-5 items-center justify-center rounded-full transition-colors"
											onClick={(event) => {
												event.preventDefault();
												event.stopPropagation();
												cloneSquad(squad);
											}}
										>
											<Copy className="size-3.5" />
										</button>
										<button
											type="button"
											aria-label={`Excluir ${squad.name}`}
											className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex size-5 items-center justify-center rounded-full transition-colors"
											onClick={(event) => {
												event.preventDefault();
												event.stopPropagation();
												setDeletingSquad(squad);
											}}
										>
											<Trash2 className="size-3.5" />
										</button>
									</div>
								</SidebarMenuItem>
							);
						})
					)}
				</SidebarMenu>
			</SidebarGroup>

			<SquadFormDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				onSaved={(squad) => navigate(squadPath(squad.id))}
			/>

			<SquadFormDialog
				open={Boolean(editingSquad)}
				onOpenChange={(open) => !open && setEditingSquad(undefined)}
				squad={editingSquad}
			/>

			<ConfirmDialog
				open={Boolean(deletingSquad)}
				onOpenChange={(open) => !open && setDeletingSquad(undefined)}
				title="Excluir squad?"
				description={deletingSquad ? `"${deletingSquad.name}" sera removido permanentemente.` : undefined}
				confirmLabel="Excluir"
				destructive
				onConfirm={confirmDelete}
			/>
		</>
	);
};
