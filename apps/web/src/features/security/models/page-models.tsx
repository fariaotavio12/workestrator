import { ConfirmDialog } from "@/components/orchestrator";
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
import { useDeleteProvider, useProvidersQuery } from "@/features/security/models/api";
import type { ModelProvider } from "@/features/security/orchestrator-shared/types";
import { useSecretsQuery } from "@/features/security/secrets/api";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Cpu, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ProviderFormDialog } from "./components/provider-form-dialog";

const DEFAULT_PAGE_SIZE = 10;

const KIND_LABEL: Record<ModelProvider["kind"], string> = {
	"claude-cli": "CLI local (Claude)",
	"codex-cli": "CLI local (Codex)",
	"gpt-cli": "CLI local (GPT)",
	"anthropic-api": "Anthropic API",
	openai: "OpenAI",
	"openai-compat": "OpenAI-compat",
};

export const PageModels = () => {
	const { data: providers = [], isLoading, isError, refetch } = useProvidersQuery();
	const { data: secrets = [] } = useSecretsQuery();
	const deleteProvider = useDeleteProvider();
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
	const [form, setForm] = useState<{ provider?: ModelProvider } | null>(null);
	const [toDelete, setToDelete] = useState<ModelProvider | null>(null);

	const secretLabelById = useMemo(() => new Map(secrets.map((secret) => [secret.id, secret.label])), [secrets]);

	const columns = useMemo<ColumnDef<ModelProvider>[]>(
		() => [
			{
				accessorKey: "label",
				header: "Nome",
				cell: ({ row }) => (
					<div className="flex min-w-0 items-center gap-3">
						<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
							<Cpu className="size-5" />
						</div>
						<Typography variant="body-sm" className="truncate font-medium">
							{row.original.label}
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
				cell: ({ row }) => <Badge variant="secondary">{KIND_LABEL[row.original.kind]}</Badge>,
				meta: {
					mobileStatus: true,
					mobileOrder: 2,
				},
			},
			{
				id: "models",
				header: "Modelos",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground line-clamp-2">
						{row.original.models.map((model) => model.label).join(", ")}
					</Typography>
				),
				meta: {
					mobileLabel: "Modelos",
					mobileOrder: 3,
				},
			},
			{
				accessorKey: "apiKeyRef",
				header: "Key",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground">
						{(row.original.apiKeyRef && secretLabelById.get(row.original.apiKeyRef)) ?? "Não configurada"}
					</Typography>
				),
				meta: {
					mobileLabel: "Key",
					mobileOrder: 4,
				},
			},
		],
		[secretLabelById],
	);

	const totalPages = Math.max(Math.ceil(providers.length / size), 1);
	const currentPage = Math.min(page, totalPages - 1);
	const paginatedProviders = providers.slice(currentPage * size, currentPage * size + size);
	const pagination = {
		page: currentPage,
		size,
		totalElements: providers.length,
		totalPages,
	};

	const handleSizeChange = (nextSize: number) => {
		setSize(nextSize);
		setPage(0);
	};

	const renderActions = (row: Row<ModelProvider>) => (
		<div className="flex justify-end gap-1">
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={`Editar ${row.original.label}`}
				onClick={() => setForm({ provider: row.original })}
			>
				<Pencil />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				className="text-destructive"
				aria-label={`Excluir ${row.original.label}`}
				onClick={() => setToDelete(row.original)}
			>
				<Trash2 />
			</Button>
		</div>
	);

	return (
		<div className="flex w-full flex-col gap-6">
			<PageHeader
				title="Modelos"
				description="Providers cadastrados. Cada agent escolhe um modelo dentre eles."
				actions={
					<Button onClick={() => setForm({})}>
						<Plus />
						Novo provider
					</Button>
				}
			/>

			{isError ? (
				<div className="px-4">
					<ErrorState message="Não foi possível carregar os providers." onRetry={() => refetch()} />
				</div>
			) : !isLoading && providers.length === 0 ? (
				<div className="px-4">
					<EmptyState
						icon={Cpu}
						title="Nenhum provider"
						message="Cadastre um provider para os agents poderem usa-lo."
						onAction={() => setForm({})}
						actionLabel="Novo provider"
						actionIcon={<Plus />}
					/>
				</div>
			) : (
				<section className="flex flex-col gap-3 px-4">
					<ResponsiveTableCustom
						columns={columns}
						data={paginatedProviders}
						isPending={isLoading}
						pagination={pagination}
						onPageChange={setPage}
						onSizeChange={handleSizeChange}
						renderActions={renderActions}
					/>
				</section>
			)}

			<ProviderFormDialog
				open={Boolean(form)}
				onOpenChange={(next) => !next && setForm(null)}
				provider={form?.provider}
			/>

			<ConfirmDialog
				open={Boolean(toDelete)}
				onOpenChange={(next) => !next && setToDelete(null)}
				title="Excluir provider?"
				description={
					toDelete
						? `"${toDelete.label}" sera removido. Agents que o usavam ficarao com um provider inexistente.`
						: undefined
				}
				confirmLabel="Excluir"
				destructive
				onConfirm={async () => {
					if (!toDelete) return;
					try {
						await deleteProvider.mutateAsync(toDelete.id);
						notify.success("Provider excluido");
						setToDelete(null);
					} catch {
						// useDeleteProvider already shows the API error toast.
					}
				}}
			/>
		</div>
	);
};
