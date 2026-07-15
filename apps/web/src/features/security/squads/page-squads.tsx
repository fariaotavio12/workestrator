import { Rotas } from "@/app/routing/variables";
import { cn } from "@/app/utils/cn";
import {
	Badge,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	EmptyState,
	ErrorState,
	Input,
	PageHeader,
	Typography,
	notify,
} from "@/components";
import { ConfirmDialog, SquadFormDialog } from "@/components/orchestrator";
import { renderSquadIcon } from "@/components/orchestrator/icon-picker/render-squad-icon";
import { useProvidersQuery } from "@/features/security/models/api";
import { useOrchestratorRuntimeStore, useRunDialogStore } from "@/features/security/orchestrator-shared/model";
import type { Trigger } from "@/features/security/orchestrator-shared/types";
import { useDeleteSquad, useDuplicateSquad, useSquadsQuery } from "@/features/security/squads/api";
import type { SquadSummary } from "@/features/security/squads/api";
import { ImportShareDialog } from "@/features/security/squads/components/import-share-dialog";
import { OnboardingChecklist } from "@/features/security/squads/components/onboarding-checklist";
import { Boxes, Clock, Copy, Link2, MoreVertical, Play, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const ACTIVE_STATUSES = new Set(["running", "paused", "checkpoint", "awaiting_input"]);

const triggerLabel = (trigger: Trigger): string => {
	if (trigger.type === "manual") return "Manual";
	if (trigger.type === "schedule") return `${trigger.every}${trigger.enabled ? "" : " (off)"}`;
	return "Encadeado";
};

type SquadCardProps = {
	squad: SquadSummary;
	isLive: boolean;
	onOpen: (squad: SquadSummary) => void;
	onRun: (squad: SquadSummary) => void;
	onDuplicate: (squad: SquadSummary) => void;
	onDelete: (squad: SquadSummary) => void;
};

const SquadCard = ({ squad, isLive, onOpen, onRun, onDuplicate, onDelete }: SquadCardProps) => (
	<article
		role="button"
		tabIndex={0}
		onClick={() => onOpen(squad)}
		onKeyDown={(event) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			onOpen(squad);
		}}
		className="bg-card hover:bg-secondary flex cursor-pointer flex-col gap-3 border rounded-lg p-4 transition-colors"
	>
		<div className="flex items-start justify-between gap-2">
			<div className="flex min-w-0 items-center gap-2">
				<span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", isLive ? "bg-success" : "bg-border")} />
				<Typography variant="title-sm" className="truncate">
					{squad.name}
				</Typography>
			</div>

			<div className="flex shrink-0 items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2"
					onClick={(event) => {
						event.stopPropagation();
						onRun(squad);
					}}
				>
					<Play className="size-3.5" />
					Executar
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={`Mais ações para ${squad.name}`}
							onClick={(event) => event.stopPropagation()}
						>
							<MoreVertical className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onDuplicate(squad)}>
							<Copy className="size-4" />
							Duplicar
						</DropdownMenuItem>
						<DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(squad)}>
							<Trash2 className="size-4" />
							Excluir
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>

		<Typography variant="body-sm" className="text-muted-foreground line-clamp-2">
			{squad.description || "Sem descrição."}
		</Typography>

		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="outline" className="gap-1 px-2 py-1">
				<Clock className="size-3" />
				{triggerLabel(squad.trigger)}
			</Badge>
			<div
				className="bg-background flex size-6 shrink-0 items-center justify-center rounded-md border text-sm"
				aria-hidden
			>
				{renderSquadIcon(squad.icon)}
			</div>
		</div>
	</article>
);

export const PageSquads = () => {
	const { data: squads = [], isLoading, isError, refetch } = useSquadsQuery();
	const { data: providers = [] } = useProvidersQuery();
	const duplicateSquad = useDuplicateSquad();
	const deleteSquad = useDeleteSquad();
	const runtimes = useOrchestratorRuntimeStore((s) => s.runtimes);
	const openRunDialog = useRunDialogStore((s) => s.openRunDialog);
	const navigate = useNavigate();

	const [query, setQuery] = useState("");
	const [formOpen, setFormOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [toDelete, setToDelete] = useState<SquadSummary | undefined>(undefined);

	const filteredSquads = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return squads;
		return squads.filter((squad) => `${squad.name} ${squad.description}`.toLowerCase().includes(normalizedQuery));
	}, [squads, query]);

	const { activeSquads, idleSquads } = useMemo(() => {
		const activeSquads: SquadSummary[] = [];
		const idleSquads: SquadSummary[] = [];
		for (const squad of filteredSquads) {
			const status = runtimes[squad.id]?.status ?? "idle";
			(ACTIVE_STATUSES.has(status) ? activeSquads : idleSquads).push(squad);
		}
		return { activeSquads, idleSquads };
	}, [filteredSquads, runtimes]);

	const openSquad = (squad: SquadSummary) =>
		navigate(Rotas.protegidas.orchestrator.squadDetail.replace(":id", squad.id));

	const hasProviders = providers.length > 0;
	const hasSquads = squads.length > 0;
	const showChecklist = !isLoading && (!hasProviders || !hasSquads);

	const cloneSquad = async (squad: SquadSummary) => {
		try {
			const copy = await duplicateSquad.mutateAsync(squad);
			notify.success("Squad clonado");
			navigate(Rotas.protegidas.orchestrator.squadDetail.replace(":id", copy.id));
		} catch {
			// useDuplicateSquad already shows the API error toast.
		}
	};

	const renderGroup = (label: string, items: SquadSummary[], isLive: boolean) => {
		if (items.length === 0) return null;

		return (
			<div className="flex flex-col gap-3">
				<div className="flex items-center gap-2">
					<Typography variant="title-sm" as="h2">
						{label}
					</Typography>
					<Badge variant="secondary" className="px-2 py-0.5 text-xs">
						{items.length}
					</Badge>
				</div>
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{items.map((squad) => (
						<SquadCard
							key={squad.id}
							squad={squad}
							isLive={isLive}
							onOpen={openSquad}
							onRun={(s) => openRunDialog(s.id)}
							onDuplicate={cloneSquad}
							onDelete={setToDelete}
						/>
					))}
				</div>
			</div>
		);
	};

	return (
		<div className="flex w-full flex-col gap-6">
			<PageHeader
				className="pb-0"
				title="Squads"
				description="Suas equipes de agentes. Cada squad tem seu escritorio com os bonequinhos sentados nas cadeiras."
				actions={
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={() => setImportOpen(true)}>
							<Link2 />
							Importar por link
						</Button>
						<Button variant="outline" onClick={() => setFormOpen(true)}>
							<Plus />
							Novo squad
						</Button>
					</div>
				}
			/>
			{showChecklist && (
				<div className="px-4">
					<OnboardingChecklist
						steps={[
							{
								label: "Conecte um modelo (provider)",
								done: hasProviders,
								actionLabel: "Conectar modelo",
								onAction: () => navigate(Rotas.protegidas.orchestrator.models),
							},
							{
								label: "Crie seu primeiro squad",
								done: hasSquads,
								actionLabel: "Novo squad",
								onAction: () => setFormOpen(true),
							},
						]}
					/>
				</div>
			)}

			{isError ? (
				<ErrorState className="mx-4" message="Não foi possível carregar os squads." onRetry={() => refetch()} />
			) : !isLoading && squads.length === 0 ? (
				<EmptyState
					className="mx-4"
					icon={Boxes}
					title="Nenhum squad ainda"
					message={
						hasProviders
							? "Crie seu primeiro squad para montar o escritorio."
							: "Antes de criar um squad, conecte um modelo — sem ele nenhum agent consegue rodar."
					}
					onAction={hasProviders ? () => setFormOpen(true) : () => navigate(Rotas.protegidas.orchestrator.models)}
					actionLabel={hasProviders ? "Novo squad" : "Conectar modelo"}
					actionIcon={<Plus />}
				/>
			) : (
				<section className="flex flex-col gap-6 px-4">
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Buscar squads"
						inputSize="sm"
						iconLeft={<Search className="size-4" />}
						wrapperClassName="md:w-80"
					/>

					{filteredSquads.length === 0 ? (
						<EmptyState icon={Search} title="Nenhum squad encontrado" message={`Nada bate com "${query}".`} />
					) : (
						<>
							{renderGroup("Ativos", activeSquads, true)}
							{renderGroup("Ociosos", idleSquads, false)}
						</>
					)}
				</section>
			)}

			<SquadFormDialog
				open={formOpen}
				onOpenChange={setFormOpen}
				onSaved={(squad) => navigate(Rotas.protegidas.orchestrator.squadDetail.replace(":id", squad.id))}
			/>
			<ImportShareDialog open={importOpen} onOpenChange={setImportOpen} />

			<ConfirmDialog
				open={Boolean(toDelete)}
				onOpenChange={(open) => !open && setToDelete(undefined)}
				title="Excluir squad?"
				description={toDelete ? `"${toDelete.name}" sera removido permanentemente.` : undefined}
				confirmLabel="Excluir"
				destructive
				onConfirm={async () => {
					if (!toDelete) return;
					try {
						await deleteSquad.mutateAsync(toDelete.id);
						notify.success("Squad excluido");
						setToDelete(undefined);
					} catch {
						// useDeleteSquad already shows the API error toast.
					}
				}}
			/>
		</div>
	);
};
