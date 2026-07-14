import { Rotas } from "@/app/routing/variables";
import {
	Button,
	EmptyState,
	ErrorState,
	PageHeader,
	ResponsiveTableCustom,
	notify,
} from "@/components";
import type { Row } from "@tanstack/react-table";
import { Boxes, Copy, Link2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog, SquadFormDialog } from "@/components/orchestrator";
import { useProvidersQuery } from "@/features/security/models/api";
import { useDeleteSquad, useDuplicateSquad, useSquadsQuery } from "@/features/security/squads/api";
import type { SquadSummary } from "@/features/security/squads/api";
import { ImportShareDialog } from "@/features/security/squads/components/import-share-dialog";
import { OnboardingChecklist } from "@/features/security/squads/components/onboarding-checklist";
import { useSquadTableColumns } from "@/features/security/squads/components/squad-table-columns";

const DEFAULT_PAGE_SIZE = 10;

export const PageSquads = () => {
	const { data: squads = [], isLoading, isError, refetch } = useSquadsQuery();
	const { data: providers = [] } = useProvidersQuery();
	const duplicateSquad = useDuplicateSquad();
	const deleteSquad = useDeleteSquad();
	const navigate = useNavigate();
	const columns = useSquadTableColumns();

	const [page, setPage] = useState(0);
	const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
	const [formOpen, setFormOpen] = useState(false);
	const [importOpen, setImportOpen] = useState(false);
	const [toDelete, setToDelete] = useState<SquadSummary | undefined>(undefined);

	const totalPages = Math.max(Math.ceil(squads.length / size), 1);
	const currentPage = Math.min(page, totalPages - 1);
	const paginatedSquads = squads.slice(currentPage * size, currentPage * size + size);
	const pagination = {
		page: currentPage,
		size,
		totalElements: squads.length,
		totalPages,
	};

	const handleSizeChange = (nextSize: number) => {
		setSize(nextSize);
		setPage(0);
	};

	const openSquad = (squad: SquadSummary) =>
		navigate(Rotas.protegidas.orchestrator.squadDetail.replace(":id", squad.id));

	const hasProviders = providers.length > 0;
	const hasSquads = squads.length > 0;
	const showChecklist = !isLoading && (!hasProviders || !hasSquads);

	const renderActions = (row: Row<SquadSummary>) => (
		<div className="flex justify-end gap-1">
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Duplicar"
				onClick={async (e) => {
					e.stopPropagation();
					try {
						await duplicateSquad.mutateAsync(row.original);
						notify.success("Squad duplicado");
					} catch {
						// useDuplicateSquad already shows the API error toast.
					}
				}}
				disabled={duplicateSquad.isPending}
			>
				<Copy />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Excluir"
				className="text-destructive"
				onClick={(e) => {
					e.stopPropagation();
					setToDelete(row.original);
				}}
			>
				<Trash2 />
			</Button>
		</div>
	);

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
						<Button onClick={() => setFormOpen(true)}>
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
				<section className="flex flex-col gap-3 px-4">
					<ResponsiveTableCustom
						columns={columns}
						data={paginatedSquads}
						isPending={isLoading}
						pagination={pagination}
						onPageChange={setPage}
						onSizeChange={handleSizeChange}
						onRowClick={openSquad}
						renderActions={renderActions}
					/>
				</section>
			)}

			<SquadFormDialog open={formOpen} onOpenChange={setFormOpen} />
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
