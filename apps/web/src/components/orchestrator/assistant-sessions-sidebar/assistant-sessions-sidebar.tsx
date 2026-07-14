import { Rotas } from "@/app/routing/variables";
import {
	Button,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
	FieldWrapper,
	Input,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SmartOverlay,
	Typography,
	notify,
} from "@/components";
import {
	useAssistantSessionsQuery,
	useDeleteAssistantSession,
	useSetAssistantSessionGroup,
	useUpdateAssistantSession,
	type AssistantSessionSummary,
} from "@/features/security/assistant-sessions/api";
import {
	useAssistantSessionGroupsQuery,
	useCreateAssistantSessionGroup,
	useDeleteAssistantSessionGroup,
	useUpdateAssistantSessionGroup,
	type AssistantSessionGroup,
} from "@/features/security/assistant-session-groups/api";
import { resetAssistant } from "@/features/security/orchestrator-shared/runtime/config-assistant-runtime";
import { ChevronRight, FolderPlus, MessageSquarePlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../confirm-dialog";

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
const DAY_MS = 86_400_000;

const byUpdatedDesc = (a: AssistantSessionSummary, b: AssistantSessionSummary) =>
	(b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");

/** Agrupa sessões por recência (mais recente primeiro). */
const groupByDate = (sessions: AssistantSessionSummary[]): [string, AssistantSessionSummary[]][] => {
	const today = startOfDay(new Date());
	const yesterday = today - DAY_MS;
	const weekAgo = today - 7 * DAY_MS;
	const buckets: Record<string, AssistantSessionSummary[]> = {
		Hoje: [],
		Ontem: [],
		"Últimos 7 dias": [],
		Anteriores: [],
	};
	for (const session of [...sessions].sort(byUpdatedDesc)) {
		const time = new Date(session.updatedAt).getTime();
		if (time >= today) buckets["Hoje"].push(session);
		else if (time >= yesterday) buckets["Ontem"].push(session);
		else if (time >= weekAgo) buckets["Últimos 7 dias"].push(session);
		else buckets["Anteriores"].push(session);
	}
	return Object.entries(buckets).filter(([, items]) => items.length > 0);
};

type GroupDialogState = { mode: "create" | "rename"; group?: AssistantSessionGroup; moveSessionId?: string };

export const AssistantSessionsSidebar = () => {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { data: sessions = [] } = useAssistantSessionsQuery();
	const { data: groups = [] } = useAssistantSessionGroupsQuery();
	const deleteSession = useDeleteAssistantSession();
	const updateSession = useUpdateAssistantSession();
	const setSessionGroup = useSetAssistantSessionGroup();
	const createGroup = useCreateAssistantSessionGroup();
	const updateGroup = useUpdateAssistantSessionGroup();
	const deleteGroup = useDeleteAssistantSessionGroup();

	const activeSessionId = pathname.startsWith(`${Rotas.protegidas.orchestrator.assistant}/`)
		? pathname.split("/")[3]
		: undefined;

	const { grouped, ungrouped } = useMemo(() => {
		const groupIds = new Set(groups.map((g) => g.id));
		const grouped = new Map<string, AssistantSessionSummary[]>();
		const ungrouped: AssistantSessionSummary[] = [];
		for (const session of sessions) {
			if (session.groupId && groupIds.has(session.groupId)) {
				const list = grouped.get(session.groupId) ?? [];
				list.push(session);
				grouped.set(session.groupId, list);
			} else {
				ungrouped.push(session);
			}
		}
		return { grouped, ungrouped };
	}, [sessions, groups]);

	const [deleting, setDeleting] = useState<AssistantSessionSummary | undefined>(undefined);
	const [renaming, setRenaming] = useState<AssistantSessionSummary | undefined>(undefined);
	const [renameValue, setRenameValue] = useState("");
	const [groupDialog, setGroupDialog] = useState<GroupDialogState | undefined>(undefined);
	const [groupName, setGroupName] = useState("");
	const [deletingGroup, setDeletingGroup] = useState<AssistantSessionGroup | undefined>(undefined);

	const startNewConversation = () => {
		resetAssistant();
		navigate(Rotas.protegidas.orchestrator.assistant);
	};

	const openSession = (id: string) => navigate(`${Rotas.protegidas.orchestrator.assistant}/${id}`);

	const openRename = (session: AssistantSessionSummary) => {
		setRenaming(session);
		setRenameValue(session.title);
	};

	const confirmRename = async () => {
		if (!renaming) return;
		const title = renameValue.trim();
		if (!title) return;
		await updateSession.mutateAsync({ id: renaming.id, payload: { title } });
		notify.success("Conversa renomeada");
		setRenaming(undefined);
	};

	const confirmDelete = async () => {
		if (!deleting) return;
		const leaving = activeSessionId === deleting.id;
		await deleteSession.mutateAsync(deleting.id);
		notify.success("Conversa excluída");
		setDeleting(undefined);
		if (leaving) startNewConversation();
	};

	const moveToGroup = async (sessionId: string, groupId: string | null) => {
		await setSessionGroup.mutateAsync({ id: sessionId, groupId });
	};

	const openNewGroup = (moveSessionId?: string) => {
		setGroupDialog({ mode: "create", moveSessionId });
		setGroupName("");
	};

	const openRenameGroup = (group: AssistantSessionGroup) => {
		setGroupDialog({ mode: "rename", group });
		setGroupName(group.name);
	};

	const confirmGroupDialog = async () => {
		if (!groupDialog) return;
		const name = groupName.trim();
		if (!name) return;
		if (groupDialog.mode === "rename" && groupDialog.group) {
			await updateGroup.mutateAsync({ id: groupDialog.group.id, payload: { name } });
			notify.success("Grupo renomeado");
		} else {
			const created = await createGroup.mutateAsync({ name });
			if (groupDialog.moveSessionId) await moveToGroup(groupDialog.moveSessionId, created.id);
			notify.success("Grupo criado");
		}
		setGroupDialog(undefined);
	};

	const confirmDeleteGroup = async () => {
		if (!deletingGroup) return;
		await deleteGroup.mutateAsync(deletingGroup.id);
		notify.success("Grupo excluído");
		setDeletingGroup(undefined);
	};

	const renderSessionRow = (session: AssistantSessionSummary) => (
		<ContextMenu key={session.id}>
			<ContextMenuTrigger asChild>
				<SidebarMenuItem>
					<SidebarMenuButton
						type="button"
						tooltip={session.title}
						isActive={activeSessionId === session.id}
						onClick={() => openSession(session.id)}
					>
						<Typography variant="nav-link" as="span" className="truncate">
							{session.title}
						</Typography>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-52">
				<ContextMenuItem onClick={() => openRename(session)}>Renomear</ContextMenuItem>
				<ContextMenuSub>
					<ContextMenuSubTrigger>Mover para grupo</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-48">
						{groups.length === 0 ? (
							<ContextMenuItem disabled>Nenhum grupo</ContextMenuItem>
						) : (
							groups.map((group) => (
								<ContextMenuItem
									key={group.id}
									disabled={session.groupId === group.id}
									onClick={() => moveToGroup(session.id, group.id)}
								>
									{group.name}
								</ContextMenuItem>
							))
						)}
						<ContextMenuSeparator />
						<ContextMenuItem onClick={() => openNewGroup(session.id)}>Novo grupo…</ContextMenuItem>
						{session.groupId && (
							<ContextMenuItem onClick={() => moveToGroup(session.id, null)}>Remover do grupo</ContextMenuItem>
						)}
					</ContextMenuSubContent>
				</ContextMenuSub>
				<ContextMenuSeparator />
				<ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(session)}>
					Excluir
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);

	return (
		<>
			<SidebarGroup>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton type="button" tooltip="Nova conversa" onClick={startNewConversation}>
							<MessageSquarePlus className="size-4" />
							<Typography variant="nav-link" as="span" className="group-data-[collapsible=icon]:hidden">
								Nova conversa
							</Typography>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton type="button" tooltip="Novo grupo" onClick={() => openNewGroup()}>
							<FolderPlus className="size-4" />
							<Typography variant="nav-link" as="span" className="group-data-[collapsible=icon]:hidden">
								Novo grupo
							</Typography>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarGroup>

			{/* Grupos criados pelo usuário */}
			{groups.map((group) => {
				const items = (grouped.get(group.id) ?? []).sort(byUpdatedDesc);
				return (
					<Collapsible key={group.id} defaultOpen className="group-data-[collapsible=icon]:hidden">
						<SidebarGroup>
							<ContextMenu>
								<ContextMenuTrigger asChild>
									<CollapsibleTrigger asChild>
										<SidebarGroupLabel className="group/label hover:bg-sidebar-accent flex cursor-pointer items-center gap-1">
											<ChevronRight className="size-3.5 transition-transform group-data-[state=open]/label:rotate-90" />
											<span className="truncate">{group.name}</span>
											<span className="text-muted-foreground ml-auto text-xs">{items.length}</span>
										</SidebarGroupLabel>
									</CollapsibleTrigger>
								</ContextMenuTrigger>
								<ContextMenuContent className="w-44">
									<ContextMenuItem onClick={() => openRenameGroup(group)}>Renomear grupo</ContextMenuItem>
									<ContextMenuSeparator />
									<ContextMenuItem
										className="text-destructive focus:text-destructive"
										onClick={() => setDeletingGroup(group)}
									>
										Excluir grupo
									</ContextMenuItem>
								</ContextMenuContent>
							</ContextMenu>
							<CollapsibleContent>
								<SidebarMenu>
									{items.length === 0 ? (
										<Typography variant="caption" className="text-muted-foreground px-2 py-1">
											Vazio — mova conversas para cá.
										</Typography>
									) : (
										items.map(renderSessionRow)
									)}
								</SidebarMenu>
							</CollapsibleContent>
						</SidebarGroup>
					</Collapsible>
				);
			})}

			{/* Sessões sem grupo, por data */}
			{sessions.length === 0 ? (
				<SidebarGroup>
					<SidebarMenuItem className="list-none group-data-[collapsible=icon]:hidden">
						<div className="border-sidebar-border bg-muted/40 rounded-lg border border-dashed px-3 py-3">
							<Typography variant="caption" className="text-muted-foreground">
								Nenhuma conversa ainda. Comece uma nova acima.
							</Typography>
						</div>
					</SidebarMenuItem>
				</SidebarGroup>
			) : (
				groupByDate(ungrouped).map(([label, items]) => (
					<SidebarGroup key={label} className="group-data-[collapsible=icon]:hidden">
						<SidebarGroupLabel>{label}</SidebarGroupLabel>
						<SidebarMenu>{items.map(renderSessionRow)}</SidebarMenu>
					</SidebarGroup>
				))
			)}

			<SmartOverlay
				open={Boolean(renaming)}
				onOpenChange={(open) => !open && setRenaming(undefined)}
				title="Renomear conversa"
				size="sm"
				footer={
					<>
						<Button variant="outline" onClick={() => setRenaming(undefined)}>
							Cancelar
						</Button>
						<Button onClick={confirmRename} disabled={!renameValue.trim() || updateSession.isPending}>
							Salvar
						</Button>
					</>
				}
			>
				<FieldWrapper label="Título">
					<Input
						value={renameValue}
						onChange={(event) => setRenameValue(event.target.value)}
						onKeyDown={(event) => event.key === "Enter" && confirmRename()}
						autoFocus
					/>
				</FieldWrapper>
			</SmartOverlay>

			<SmartOverlay
				open={Boolean(groupDialog)}
				onOpenChange={(open) => !open && setGroupDialog(undefined)}
				title={groupDialog?.mode === "rename" ? "Renomear grupo" : "Novo grupo"}
				size="sm"
				footer={
					<>
						<Button variant="outline" onClick={() => setGroupDialog(undefined)}>
							Cancelar
						</Button>
						<Button
							onClick={confirmGroupDialog}
							disabled={!groupName.trim() || createGroup.isPending || updateGroup.isPending}
						>
							Salvar
						</Button>
					</>
				}
			>
				<FieldWrapper label="Nome do grupo" htmlFor="assistant-session-group-name">
					<Input
						id="assistant-session-group-name"
						value={groupName}
						onChange={(event) => setGroupName(event.target.value)}
						onKeyDown={(event) => event.key === "Enter" && confirmGroupDialog()}
						autoFocus
					/>
				</FieldWrapper>
			</SmartOverlay>

			<ConfirmDialog
				open={Boolean(deleting)}
				onOpenChange={(open) => !open && setDeleting(undefined)}
				title="Excluir conversa?"
				description={deleting ? `"${deleting.title}" será removida permanentemente.` : undefined}
				confirmLabel="Excluir"
				destructive
				onConfirm={confirmDelete}
			/>

			<ConfirmDialog
				open={Boolean(deletingGroup)}
				onOpenChange={(open) => !open && setDeletingGroup(undefined)}
				title="Excluir grupo?"
				description={
					deletingGroup
						? `"${deletingGroup.name}" será removido. As conversas dele voltam para "sem grupo".`
						: undefined
				}
				confirmLabel="Excluir"
				destructive
				onConfirm={confirmDeleteGroup}
			/>
		</>
	);
};
