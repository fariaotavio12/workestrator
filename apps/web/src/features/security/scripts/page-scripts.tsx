import { ConfirmDialog, ScriptFormDialog } from "@/components/orchestrator";
import {
	Badge,
	Button,
	EmptyState,
	ErrorState,
	PageHeader,
	ResponsiveTableCustom,
	Typography,
	notify,
} from "@/components";
import { useDeleteScript, useScriptsQuery } from "@/features/security/scripts/api";
import { SCRIPT_KIND_LABEL } from "@/features/security/orchestrator-shared/data/constants";
import type { Script } from "@/features/security/orchestrator-shared/types";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Pencil, Plus, Terminal, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE = 10;

const scriptSummary = (script: Script): string => {
	switch (script.kind) {
		case "command":
			return [script.command, ...(script.args ?? [])].filter(Boolean).join(" ");
		case "inline":
			return `inline - ${script.language ?? "bash"}`;
		case "file":
			return script.path ?? "-";
		case "http":
			return [script.method, script.urlTemplate].filter(Boolean).join(" ") || "-";
		case "mcp":
			return script.transport === "http"
				? (script.url ?? "-")
				: [script.command, ...(script.args ?? [])].filter(Boolean).join(" ");
		case "connector":
			return script.connectorProvider ?? "-";
		default:
			return "-";
	}
};

export const PageScripts = () => {
	const { data: scripts = [], isLoading, isError, refetch } = useScriptsQuery();
	const deleteScript = useDeleteScript();
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
	const [form, setForm] = useState<{ script?: Script } | null>(null);
	const [toDelete, setToDelete] = useState<Script | null>(null);

	const columns = useMemo<ColumnDef<Script>[]>(
		() => [
			{
				accessorKey: "name",
				header: "Nome",
				cell: ({ row }) => (
					<div className="flex min-w-0 items-center gap-3">
						<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
							<Terminal className="size-5" />
						</div>
						<Typography variant="body-sm" className="truncate font-medium">
							{row.original.name}
						</Typography>
					</div>
				),
				meta: {
					mobileHeader: true,
					mobileOrder: 1,
				},
			},
			{
				accessorKey: "kind",
				header: "Tipo",
				cell: ({ row }) => <Badge variant="secondary">{SCRIPT_KIND_LABEL[row.original.kind]}</Badge>,
				meta: {
					mobileStatus: true,
					mobileOrder: 2,
				},
			},
			{
				id: "summary",
				header: "Comando",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground truncate font-mono">
						{scriptSummary(row.original)}
					</Typography>
				),
				meta: {
					mobileLabel: "Comando",
					mobileOrder: 3,
				},
			},
			{
				accessorKey: "description",
				header: "Descrição",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground truncate">
						{row.original.description ?? "-"}
					</Typography>
				),
				meta: {
					mobileLabel: "Descrição",
					mobileOrder: 4,
				},
			},
		],
		[],
	);

	const totalPages = Math.max(Math.ceil(scripts.length / size), 1);
	const currentPage = Math.min(page, totalPages - 1);
	const paginatedScripts = scripts.slice(currentPage * size, currentPage * size + size);
	const pagination = {
		page: currentPage,
		size,
		totalElements: scripts.length,
		totalPages,
	};

	const handleSizeChange = (nextSize: number) => {
		setSize(nextSize);
		setPage(0);
	};

	const renderActions = (row: Row<Script>) => (
		<div className="flex justify-end gap-1">
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={`Editar ${row.original.name}`}
				onClick={() => setForm({ script: row.original })}
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
				title="Scripts"
				description="Biblioteca compartilhada. Qualquer agent pode referenciar um script como ferramenta."
				actions={
					<Button onClick={() => setForm({})}>
						<Plus />
						Novo script
					</Button>
				}
			/>

			{isError ? (
				<div className="px-4">
					<ErrorState message="Não foi possível carregar os scripts." onRetry={() => refetch()} />
				</div>
			) : !isLoading && scripts.length === 0 ? (
				<div className="px-4">
					<EmptyState
						icon={Terminal}
						title="Nenhum script"
						message="Cadastre um script para qualquer agent poder usar como ferramenta."
						onAction={() => setForm({})}
						actionLabel="Novo script"
						actionIcon={<Plus />}
					/>
				</div>
			) : (
				<section className="flex flex-col gap-3 px-4">
					<ResponsiveTableCustom
						columns={columns}
						data={paginatedScripts}
						isPending={isLoading}
						pagination={pagination}
						onPageChange={setPage}
						onSizeChange={handleSizeChange}
						renderActions={renderActions}
					/>
				</section>
			)}

			<ScriptFormDialog open={Boolean(form)} onOpenChange={(next) => !next && setForm(null)} script={form?.script} />

			<ConfirmDialog
				open={Boolean(toDelete)}
				onOpenChange={(next) => !next && setToDelete(null)}
				title="Excluir script?"
				description={
					toDelete ? `"${toDelete.name}" sera removido. Agents que o usavam perdem so a referencia.` : undefined
				}
				confirmLabel="Excluir"
				destructive
				onConfirm={async () => {
					if (!toDelete) return;
					try {
						await deleteScript.mutateAsync(toDelete.id);
						notify.success("Script excluido");
						setToDelete(null);
					} catch {
						// useDeleteScript already shows the API error toast.
					}
				}}
			/>
		</div>
	);
};
