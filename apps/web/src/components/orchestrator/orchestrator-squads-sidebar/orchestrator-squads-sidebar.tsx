import { Rotas } from "@/app/routing/variables";
import { cn } from "@/app/utils/cn";
import {
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
import { useOrchestratorRuntimeStore, useRunDialogStore } from "@/features/security/orchestrator-shared/model";

const squadPath = (id: string) => Rotas.protegidas.orchestrator.squadDetail.replace(":id", id);
const ACTIVE_STATUSES = new Set(["running", "paused", "checkpoint", "awaiting_input"]);
const ATTENTION_STATUSES = new Set(["checkpoint", "awaiting_input"]);

export const OrchestratorSquadsSidebar = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { data: squads = [] } = useSquadsQuery();
	const duplicateSquad = useDuplicateSquad();
	const deleteSquad = useDeleteSquad();
	const runtimes = useOrchestratorRuntimeStore((s) => s.runtimes);
	const openRunDialog = useRunDialogStore((s) => s.openRunDialog);

	// Indicador global de execuções ao vivo — "precisa de você" tem prioridade sobre "só rodando"
	// (ver docs/plano-integracoes-e-flow-builder.md, Etapa 4.5). Sem isso, nada no app avisa
	// persistentemente que um run está esperando resposta fora do dialog.
	const activity = useMemo(() => {
		const activeSquads = squads.filter((squad) => ACTIVE_STATUSES.has(runtimes[squad.id]?.status ?? "idle"));
		const attentionSquads = activeSquads.filter((squad) =>
			ATTENTION_STATUSES.has(runtimes[squad.id]?.status ?? "idle"),
		);
		return { activeSquads, attentionSquads };
	}, [squads, runtimes]);

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

					{activity.attentionSquads.length > 0 ? (
						<SidebarMenuItem>
							<SidebarMenuButton
								type="button"
								tooltip="Precisa de você"
								className="border-warning/40 bg-warning/10 text-warning hover:bg-warning/15 mb-1 border"
								onClick={() => openRunDialog(activity.attentionSquads[0].id)}
							>
								<AlertTriangle className="size-4" />
								<Typography variant="nav-link" as="span" className="group-data-[collapsible=icon]:hidden">
									Precisa de você{activity.attentionSquads.length > 1 ? ` (${activity.attentionSquads.length})` : ""}
								</Typography>
							</SidebarMenuButton>
						</SidebarMenuItem>
					) : (
						activity.activeSquads.length > 0 && (
							<SidebarMenuItem>
								<SidebarMenuButton
									type="button"
									tooltip="Execuções rodando"
									className="text-primary mb-1"
									onClick={() => openRunDialog(activity.activeSquads[0].id)}
								>
									<Play className="size-4" />
									<Typography variant="nav-link" as="span" className="group-data-[collapsible=icon]:hidden">
										{activity.activeSquads.length} execução(ões) rodando
									</Typography>
								</SidebarMenuButton>
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
							const status = runtimes[squad.id]?.status ?? "idle";
							const isLive = ACTIVE_STATUSES.has(status);
							const needsAttention = ATTENTION_STATUSES.has(status);

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
