import { Button, Card, CardContent, CardHeader, Typography } from "@/components";
import type { ConnectorPreset } from "@/features/security/secrets/connectors-catalog";
import type { Secret } from "@/features/security/orchestrator-shared/types";
import { Loader2, Pencil, PlugZap, SquareAsterisk } from "lucide-react";
import { ConnectionStatusPill, type ConnectionStatus } from "./connection-status-pill";

type Props = {
	preset: ConnectorPreset;
	secret?: Secret;
	status: ConnectionStatus;
	testing?: boolean;
	onConnect: () => void;
	onEdit: () => void;
	onSetValue: () => void;
	onTest: () => void;
};

export const ConnectorCard = ({ preset, secret, status, testing, onConnect, onEdit, onSetValue, onTest }: Props) => {
	const Icon = preset.icon;

	return (
		<Card size="sm" className="gap-4">
			<CardHeader className="grid-cols-[auto_1fr] grid-rows-1 gap-3 px-5">
				<div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${preset.colorClassName}`}>
					<Icon className="size-5" />
				</div>
				<div className="min-w-0">
					<Typography variant="title-sm" as="h3" className="truncate">
						{preset.name}
					</Typography>
					<Typography variant="body-sm" className="text-muted-foreground line-clamp-2">
						{preset.description}
					</Typography>
				</div>
			</CardHeader>

			<CardContent className="flex flex-col gap-3 px-5">
				<ConnectionStatusPill status={status} className="self-start" />

				<div className="flex flex-wrap gap-2">
					{!secret ? (
						<Button type="button" size="sm" onClick={onConnect}>
							<PlugZap />
							Conectar
						</Button>
					) : (
						<>
							{!secret.hasValue && (
								<Button type="button" size="sm" onClick={onSetValue}>
									<SquareAsterisk />
									Definir valor
								</Button>
							)}
							{secret.hasValue && (
								<Button type="button" variant="outline" size="sm" onClick={onTest} disabled={testing}>
									{testing ? <Loader2 className="animate-spin" /> : <PlugZap />}
									Testar conexão
								</Button>
							)}
							<Button type="button" variant="ghost" size="sm" onClick={onEdit}>
								<Pencil />
								Editar
							</Button>
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
