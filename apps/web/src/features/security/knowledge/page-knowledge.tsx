import { Rotas } from "@/app/routing/variables";
import { ConfirmDialog } from "@/components/orchestrator";
import { Badge, Button, EmptyState, ErrorState, PageHeader, ResponsiveTableCustom, Typography, notify } from "@/components";
import {
	useCollectionsQuery,
	useDeleteCollection,
	type KnowledgeCollection,
} from "@/features/security/knowledge/api";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { FolderOpen, Library, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CollectionFormDialog } from "./components/collection-form-dialog";

const DEFAULT_PAGE_SIZE = 10;

export const PageKnowledge = () => {
	const navigate = useNavigate();
	const { data: collections = [], isLoading, isError, refetch } = useCollectionsQuery();
	const deleteCollection = useDeleteCollection();
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
	const [form, setForm] = useState<{ collection?: KnowledgeCollection } | null>(null);
	const [toDelete, setToDelete] = useState<KnowledgeCollection | null>(null);

	const openDetail = (id: string) => navigate(Rotas.protegidas.orchestrator.knowledgeDetail.replace(":id", id));

	const columns = useMemo<ColumnDef<KnowledgeCollection>[]>(
		() => [
			{
				accessorKey: "name",
				header: "Nome",
				cell: ({ row }) => (
					<button
						type="button"
						className="flex min-w-0 items-center gap-3 text-left"
						onClick={() => openDetail(row.original.id)}
					>
						<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
							<Library className="size-5" />
						</div>
						<Typography variant="body-sm" className="truncate font-medium hover:underline">
							{row.original.name}
						</Typography>
					</button>
				),
				meta: { mobileHeader: true, mobileOrder: 1 },
			},
			{
				accessorKey: "description",
				header: "Descrição",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground line-clamp-2">
						{row.original.description || "—"}
					</Typography>
				),
				meta: { mobileLabel: "Descrição", mobileOrder: 3 },
			},
			{
				accessorKey: "documentCount",
				header: "Documentos",
				cell: ({ row }) => <Badge variant="secondary">{row.original.documentCount}</Badge>,
				meta: { mobileStatus: true, mobileOrder: 2 },
			},
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const totalPages = Math.max(Math.ceil(collections.length / size), 1);
	const currentPage = Math.min(page, totalPages - 1);
	const paginated = collections.slice(currentPage * size, currentPage * size + size);
	const pagination = { page: currentPage, size, totalElements: collections.length, totalPages };

	const handleSizeChange = (nextSize: number) => {
		setSize(nextSize);
		setPage(0);
	};

	const renderActions = (row: Row<KnowledgeCollection>) => (
		<div className="flex justify-end gap-1">
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={`Abrir ${row.original.name}`}
				onClick={() => openDetail(row.original.id)}
			>
				<FolderOpen />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={`Editar ${row.original.name}`}
				onClick={() => setForm({ collection: row.original })}
			>
				<Pencil />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className="text-destructive"
				aria-label={`Excluir ${row.original.name}`}
				onClick={() => setToDelete(row.original)}
			>
				<Trash2 />
			</Button>
		</div>
	);

	return (
		<div className="flex w-full flex-col gap-6">
			<PageHeader
				title="Conhecimento"
				description="Bases de documentos que os agents podem consultar durante uma execução."
				actions={
					<Button onClick={() => setForm({})}>
						<Plus />
						Nova base
					</Button>
				}
			/>

			{isError ? (
				<div className="px-4">
					<ErrorState message="Não foi possível carregar as bases." onRetry={() => refetch()} />
				</div>
			) : !isLoading && collections.length === 0 ? (
				<div className="px-4">
					<EmptyState
						icon={Library}
						title="Nenhuma base de conhecimento"
						message="Crie uma base e envie documentos para os agents poderem consultá-la."
						onAction={() => setForm({})}
						actionLabel="Nova base"
						actionIcon={<Plus />}
					/>
				</div>
			) : (
				<section className="flex flex-col gap-3 px-4">
					<ResponsiveTableCustom
						columns={columns}
						data={paginated}
						isPending={isLoading}
						pagination={pagination}
						onPageChange={setPage}
						onSizeChange={handleSizeChange}
						renderActions={renderActions}
					/>
				</section>
			)}

			<CollectionFormDialog
				open={Boolean(form)}
				onOpenChange={(next) => !next && setForm(null)}
				collection={form?.collection}
			/>

			<ConfirmDialog
				open={Boolean(toDelete)}
				onOpenChange={(next) => !next && setToDelete(null)}
				title="Excluir base?"
				description={
					toDelete
						? `"${toDelete.name}" e todos os seus documentos serão removidos. Agents que a usavam deixarão de recuperar contexto dela.`
						: undefined
				}
				confirmLabel="Excluir"
				destructive
				onConfirm={async () => {
					if (!toDelete) return;
					await deleteCollection.mutateAsync(toDelete.id);
					notify.success("Base excluída");
					setToDelete(null);
				}}
			/>
		</div>
	);
};
