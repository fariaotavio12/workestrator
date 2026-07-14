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
import { useDeleteSecret, useSecretsQuery } from "@/features/security/secrets/api";
import { testSecretConnection } from "@/features/security/orchestrator-shared/runtime/model-client";
import type { Secret, SecretAuthType } from "@/features/security/orchestrator-shared/types";
import type { ConnectorPreset } from "@/features/security/secrets/connectors-catalog";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { KeyRound, Pencil, PlugZap, Plus, SquareAsterisk, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConnectionStatus } from "./components/connection-status-pill";
import { ConnectOAuthDialog } from "./components/connect-oauth-dialog";
import { ConnectorsCatalogSheet } from "./components/connectors-catalog-sheet";
import { SecretFormDialog } from "./components/secret-form-dialog";
import { SetSecretValueDialog } from "./components/set-secret-value-dialog";

const DEFAULT_PAGE_SIZE = 10;

const AUTH_TYPE_LABEL: Record<SecretAuthType, string> = {
	bearer: "Bearer",
	header: "Header",
	query: "Query param",
	basic: "Basic",
	oauth2_client_credentials: "OAuth2 (client credentials)",
	oauth2_refresh: "OAuth2 (refresh)",
	raw: "Manual",
};

export const PageSecrets = () => {
	const { data: secrets = [], isLoading, isError, refetch } = useSecretsQuery();
	const deleteSecret = useDeleteSecret();
	const [page, setPage] = useState(0);
	const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<Secret | undefined>(undefined);
	const [preset, setPreset] = useState<ConnectorPreset | undefined>(undefined);
	const [oauthPreset, setOauthPreset] = useState<ConnectorPreset | undefined>(undefined);
	const [toDelete, setToDelete] = useState<Secret | null>(null);
	const [valueTarget, setValueTarget] = useState<Secret | null>(null);
	const [testingId, setTestingId] = useState<string | null>(null);
	const [testResults, setTestResults] = useState<Record<string, boolean>>({});
	const [catalogOpen, setCatalogOpen] = useState(false);

	const secretByConnectorId = useMemo(() => {
		const map = new Map<string, Secret>();
		for (const secret of secrets) {
			if (secret.connectorId) map.set(secret.connectorId, secret);
		}
		return map;
	}, [secrets]);

	const connectorStatus = (secret: Secret | undefined): ConnectionStatus => {
		if (!secret || !secret.hasValue) return "not_configured";
		if (testResults[secret.id] === false) return "failed";
		return "connected";
	};

	const openCreate = () => {
		setEditing(undefined);
		setPreset(undefined);
		setFormOpen(true);
	};

	const openEdit = (secret: Secret) => {
		setEditing(secret);
		setPreset(undefined);
		setFormOpen(true);
	};

	const openConnect = (connectorPreset: ConnectorPreset) => {
		const existing = secretByConnectorId.get(connectorPreset.id);
		if (existing) {
			openEdit(existing);
			return;
		}
		if (connectorPreset.authUrl) {
			setOauthPreset(connectorPreset);
			return;
		}
		setEditing(undefined);
		setPreset(connectorPreset);
		setFormOpen(true);
	};

	const handleTest = async (secret: Secret) => {
		setTestingId(secret.id);
		try {
			const result = await testSecretConnection(secret.id);
			setTestResults((prev) => ({ ...prev, [secret.id]: result.ok }));
			if (result.ok) notify.success(result.message || "Conexão validada");
			else notify.error(result.message || "Falha ao testar a conexão");
		} catch (err) {
			setTestResults((prev) => ({ ...prev, [secret.id]: false }));
			notify.error(err instanceof Error ? err.message : "Falha ao testar a conexão");
		} finally {
			setTestingId(null);
		}
	};

	const columns = useMemo<ColumnDef<Secret>[]>(
		() => [
			{
				accessorKey: "label",
				header: "Nome",
				cell: ({ row }) => (
					<div className="flex min-w-0 items-center gap-3">
						<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
							<KeyRound className="size-5" />
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
				accessorKey: "authType",
				header: "Esquema",
				cell: ({ row }) => <Badge variant="secondary">{AUTH_TYPE_LABEL[row.original.authType]}</Badge>,
				meta: {
					mobileStatus: true,
					mobileOrder: 2,
				},
			},
			{
				accessorKey: "hasValue",
				header: "Valor",
				cell: ({ row }) =>
					row.original.hasValue ? (
						<Badge variant="secondary">Definido</Badge>
					) : (
						<Badge variant="destructive">Não definido</Badge>
					),
				meta: {
					mobileOrder: 3,
				},
			},
		],
		[],
	);

	const totalPages = Math.max(Math.ceil(secrets.length / size), 1);
	const currentPage = Math.min(page, totalPages - 1);
	const paginatedSecrets = secrets.slice(currentPage * size, currentPage * size + size);
	const pagination = {
		page: currentPage,
		size,
		totalElements: secrets.length,
		totalPages,
	};

	const handleSizeChange = (nextSize: number) => {
		setSize(nextSize);
		setPage(0);
	};

	const renderActions = (row: Row<Secret>) => (
		<div className="flex justify-end gap-1">
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={`Editar ${row.original.label}`}
				onClick={() => openEdit(row.original)}
			>
				<Pencil />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label={`Definir valor de ${row.original.label}`}
				onClick={() => setValueTarget(row.original)}
			>
				<SquareAsterisk />
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
		<div className="flex w-full flex-col gap-8">
			<PageHeader
				title="Conexões"
				description="Credenciais e conectores reutilizáveis por modelos, ferramentas HTTP, MCP e integrações. O valor real é cifrado no backend."
				actions={
					<>
						<Button variant="outline" onClick={() => setCatalogOpen(true)}>
							<PlugZap />
							Conectores
						</Button>
						<Button onClick={openCreate}>
							<Plus />
							Conexão manual
						</Button>
					</>
				}
			/>

			<section className="flex flex-col gap-3 px-4">
				<Typography variant="title-sm" as="h2">
					Credenciais e conectores
				</Typography>

				{isError ? (
					<ErrorState message="Não foi possível carregar as conexões." onRetry={() => refetch()} />
				) : !isLoading && secrets.length === 0 ? (
					<EmptyState
						icon={KeyRound}
						title="Nenhuma conexão"
						message="Cadastre uma conexão para modelos, ferramentas HTTP, servidores MCP ou conectores."
						onAction={openCreate}
						actionLabel="Nova conexão"
						actionIcon={<Plus />}
					/>
				) : (
					<ResponsiveTableCustom
						columns={columns}
						data={paginatedSecrets}
						isPending={isLoading}
						pagination={pagination}
						onPageChange={setPage}
						onSizeChange={handleSizeChange}
						renderActions={renderActions}
					/>
				)}
			</section>

			<ConnectorsCatalogSheet
				open={catalogOpen}
				onOpenChange={setCatalogOpen}
				secretByConnectorId={secretByConnectorId}
				connectorStatus={connectorStatus}
				testingId={testingId}
				onConnect={openConnect}
				onEdit={openEdit}
				onSetValue={setValueTarget}
				onTest={handleTest}
			/>

			<SecretFormDialog open={formOpen} onOpenChange={setFormOpen} secret={editing} preset={preset} />

			<ConnectOAuthDialog
				open={Boolean(oauthPreset)}
				onOpenChange={(next) => !next && setOauthPreset(undefined)}
				preset={oauthPreset}
			/>

			<SetSecretValueDialog
				open={Boolean(valueTarget)}
				onOpenChange={(next) => !next && setValueTarget(null)}
				secret={valueTarget}
			/>

			<ConfirmDialog
				open={Boolean(toDelete)}
				onOpenChange={(next) => !next && setToDelete(null)}
				title="Excluir conexão?"
				description={
					toDelete
						? `"${toDelete.label}" será removida. Modelos e ferramentas que a usavam ficarão com uma referência inexistente.`
						: undefined
				}
				confirmLabel="Excluir"
				destructive
				onConfirm={async () => {
					if (!toDelete) return;
					try {
						await deleteSecret.mutateAsync(toDelete.id);
						notify.success("Conexão excluída");
						setToDelete(null);
					} catch {
						// useDeleteSecret already shows the API error toast.
					}
				}}
			/>
		</div>
	);
};
