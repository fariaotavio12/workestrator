import { AppSheet } from "@/components";
import type { Secret } from "@/features/security/orchestrator-shared/types";
import { useConnectorsCatalogQuery } from "@/features/security/secrets/api";
import { CONNECTOR_CATALOG, toConnectorPreset, type ConnectorPreset } from "@/features/security/secrets/connectors-catalog";
import { PlugZap } from "lucide-react";
import { useMemo } from "react";
import type { ConnectionStatus } from "./connection-status-pill";
import { ConnectorCard } from "./connector-card";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	secretByConnectorId: Map<string, Secret>;
	connectorStatus: (secret: Secret | undefined) => ConnectionStatus;
	testingId: string | null;
	onConnect: (preset: ConnectorPreset) => void;
	onEdit: (secret: Secret) => void;
	onSetValue: (secret: Secret) => void;
	onTest: (secret: Secret) => void;
};

/** Catálogo de conectores num sheet à parte — mantém a página de Segredos enxuta, o catálogo vira uma ação. */
export const ConnectorsCatalogSheet = ({
	open,
	onOpenChange,
	secretByConnectorId,
	connectorStatus,
	testingId,
	onConnect,
	onEdit,
	onSetValue,
	onTest,
}: Props) => {
	// Fase 4 do plano OAuth: o catálogo vem do backend (`OAuthProviderCatalog`) quando disponível.
	// Backend antigo (sem `/connectors`, 404) ou fora do ar -> `data` fica undefined e cai no array
	// estático (mesmo catálogo de antes desta fase) — nunca quebra a tela por causa da migração.
	const { data: backendCatalog } = useConnectorsCatalogQuery();
	const catalog = useMemo(
		() => (backendCatalog && backendCatalog.length > 0 ? backendCatalog.map(toConnectorPreset) : CONNECTOR_CATALOG),
		[backendCatalog],
	);

	return (
		<AppSheet
			open={open}
			onOpenChange={onOpenChange}
			title="Conectores"
			description="Conecte um provider conhecido — o esquema de autenticação já vem configurado."
			contentClassName="sm:max-w-2xl"
			headerLeading={
				<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
					<PlugZap className="size-5" />
				</div>
			}
			showFooter={false}
		>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{catalog.map((preset) => {
					const secret = secretByConnectorId.get(preset.id);
					return (
						<ConnectorCard
							key={preset.id}
							preset={preset}
							secret={secret}
							status={connectorStatus(secret)}
							testing={testingId === secret?.id}
							onConnect={() => onConnect(preset)}
							onEdit={() => secret && onEdit(secret)}
							onSetValue={() => secret && onSetValue(secret)}
							onTest={() => secret && onTest(secret)}
						/>
					);
				})}
			</div>
		</AppSheet>
	);
};
