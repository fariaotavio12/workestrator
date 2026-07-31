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
import type { NotificationChannel, Secret, SecretAuthType } from "@/features/security/orchestrator-shared/types";
import { NotificationChannelFormDialog } from "@/features/security/notification-channels/components/notification-channel-form-dialog";
import {
	useDeleteNotificationChannel,
	useNotificationChannelsQuery,
	useTestNotificationChannel,
} from "@/features/security/notification-channels/api";
import type { ConnectorPreset } from "@/features/security/secrets/connectors-catalog";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Bell, KeyRound, Loader2, Pencil, PlugZap, Plus, SquareAsterisk, TestTube2, Trash2 } from "lucide-react";
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

	// --- Notificações (n8n) — ver .specs/001-aprovacoes-externas-teams ---
	const { data: channels = [], isLoading: channelsLoading } = useNotificationChannelsQuery();
	const deleteChannel = useDeleteNotificationChannel();
	const testChannel = useTestNotificationChannel();
	const [channelFormOpen, setChannelFormOpen] = useState(false);
	const [editingChannel, setEditingChannel] = useState<NotificationChannel | undefined>(undefined);
	const [channelToDelete, setChannelToDelete] = useState<NotificationChannel | null>(null);
	const [testingChannelId, setTestingChannelId] = useState<string | null>(null);

	const openCreateChannel = () => {
		setEditingChannel(undefined);
		setChannelFormOpen(true);
	};

	const openEditChannel = (channel: NotificationChannel) => {
		setEditingChannel(channel);
		setChannelFormOpen(true);
	};

	const handleTestChannel = async (channel: NotificationChannel) => {
		setTestingChannelId(channel.id);
		try {
			const result = await testChannel.mutateAsync(channel.id);
			if (result.success) notify.success("Aviso de teste entregue.");
			else notify.error(result.error || "Falha ao entregar o aviso de teste.");
		} catch {
			// useTestNotificationChannel mutation não mostra toast de erro por padrão aqui — cobre a falha da chamada.
			notify.error("Falha ao entregar o aviso de teste.");
		} finally {
			setTestingChannelId(null);
		}
	};

	const secretByConnectorId = useMemo(() => {
		const map = new Map<string, Secret>();
		for (const secret of secrets) {
			if (secret.connectorId) map.set(secret.connectorId, secret);
		}
		return map;
	}, [secrets]);

	const connectorStatus = (secret: Secret | undefined): ConnectionStatus => {
		if (!secret || !secret.hasValue) return "not_configured";
		if (secret.status && secret.status !== "connected") return "failed";
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
				accessorKey: "accountDisplayName",
				header: "Conta",
				cell: ({ row }) => (
					<Typography variant="body-sm" className="text-muted-foreground">
						{row.original.accountDisplayName ?? row.original.connectorId ?? "—"}
					</Typography>
				),
				meta: { mobileOrder: 3 },
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => (
					<Badge variant={row.original.status && row.original.status !== "connected" ? "destructive" : "secondary"}>
						{row.original.status ?? "configurada"}
					</Badge>
				),
				meta: { mobileStatus: true, mobileOrder: 2 },
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

			<section className="flex flex-col gap-3 px-4">
				<div className="flex items-center justify-between gap-3">
					<Typography variant="title-sm" as="h2">
						Notificações (n8n)
					</Typography>
					<Button variant="outline" size="sm" onClick={openCreateChannel}>
						<Plus />
						Nova conexão
					</Button>
				</div>
				<Typography variant="body-sm" className="text-muted-foreground">
					Aviso externo quando um checkpoint abre — o Workestrator dispara um webhook (ex.: um fluxo do n8n que
					entrega no Teams). A decisão continua sempre dentro do Workestrator.
				</Typography>

				{!channelsLoading && channels.length === 0 ? (
					<EmptyState
						icon={Bell}
						title="Nenhuma conexão de notificação"
						message="Cadastre a URL de um webhook para avisar externamente quando um checkpoint abrir."
						onAction={openCreateChannel}
						actionLabel="Nova conexão"
						actionIcon={<Plus />}
					/>
				) : (
					<div className="flex flex-col gap-2">
						{channels.map((channel) => (
							<div key={channel.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<Typography variant="body-sm" className="truncate font-medium">
											{channel.label}
										</Typography>
										<Badge variant={channel.status === "error" ? "destructive" : "secondary"}>
											{channel.status === "active" ? "ativa" : channel.status === "error" ? "erro" : "desligada"}
										</Badge>
									</div>
									<Typography variant="caption" className="text-muted-foreground">
										{channel.hasUrl ? (channel.urlHost ?? "URL configurada") : "Sem URL"}
										{channel.lastError && ` · último erro: ${channel.lastError}`}
									</Typography>
								</div>
								<div className="flex shrink-0 gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={`Testar ${channel.label}`}
										disabled={testingChannelId === channel.id}
										onClick={() => handleTestChannel(channel)}
									>
										{testingChannelId === channel.id ? <Loader2 className="animate-spin" /> : <TestTube2 />}
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label={`Editar ${channel.label}`}
										onClick={() => openEditChannel(channel)}
									>
										<Pencil />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-destructive"
										aria-label={`Excluir ${channel.label}`}
										onClick={() => setChannelToDelete(channel)}
									>
										<Trash2 />
									</Button>
								</div>
							</div>
						))}
					</div>
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

			<NotificationChannelFormDialog
				open={channelFormOpen}
				onOpenChange={setChannelFormOpen}
				channel={editingChannel}
			/>

			<ConfirmDialog
				open={Boolean(channelToDelete)}
				onOpenChange={(next) => !next && setChannelToDelete(null)}
				title="Excluir conexão de notificação?"
				description={
					channelToDelete
						? `"${channelToDelete.label}" será removida. Agentes que a usam param de avisar externamente.`
						: undefined
				}
				confirmLabel="Excluir"
				destructive
				onConfirm={async () => {
					if (!channelToDelete) return;
					try {
						await deleteChannel.mutateAsync(channelToDelete.id);
						notify.success("Conexão excluída.");
						setChannelToDelete(null);
					} catch {
						// useDeleteNotificationChannel already shows the API error toast.
					}
				}}
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
