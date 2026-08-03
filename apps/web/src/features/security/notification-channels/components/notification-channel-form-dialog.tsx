import { Button, FieldWrapper, Input, notify } from "@/components";
import { SmartOverlay } from "@/components/smart-dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/select";
import {
	useCreateNotificationChannel,
	useUpdateNotificationChannel,
} from "@/features/security/notification-channels/api";
import type { NotificationChannel, Secret } from "@/features/security/orchestrator-shared/types";
import { useSecretsQuery } from "@/features/security/secrets/api";
import { Webhook } from "lucide-react";
import { useState } from "react";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	channel?: NotificationChannel;
};

const NONE_SECRET = "__none__";

/**
 * Conexão de notificação (n8n → Teams — ver .specs/001-aprovacoes-externas-teams). `url` e o segredo do
 * header nunca voltam do backend (`NotificationChannelResponse` só expõe `hasUrl`/`urlHost`) — em edição,
 * os campos ficam em branco por desenho: o dono digita de novo se quiser trocar, não reaproveita algo que
 * ele não consegue mais conferir. Formulário simples (sem react-hook-form): só 4 campos, sem ramificação
 * por tipo de autenticação como `SecretFormDialog` precisa.
 */
export const NotificationChannelFormDialog = (props: Props) => {
	if (!props.open) return null;
	return <NotificationChannelFormDialogContent {...props} />;
};

const NotificationChannelFormDialogContent = ({ open, onOpenChange, channel }: Props) => {
	const createChannel = useCreateNotificationChannel();
	const updateChannel = useUpdateNotificationChannel();
	const { data: secrets = [] } = useSecretsQuery();
	const isEditing = Boolean(channel);

	// Sem `useEffect` de reset: o componente monta do zero a cada abertura (`if (!open) return null` acima),
	// mesmo padrão de `AgentFormDialog`/`RunDialog` — o estado inicial já nasce certo.
	const [label, setLabel] = useState(channel?.label ?? "");
	const [url, setUrl] = useState("");
	const [authHeaderName, setAuthHeaderName] = useState(channel?.authHeaderName ?? "");
	const [authSecretId, setAuthSecretId] = useState<string>(NONE_SECRET);

	const isPending = createChannel.isPending || updateChannel.isPending;

	const submit = async () => {
		if (!label.trim() || (!isEditing && !url.trim())) return;
		const authSecretIdValue = authSecretId === NONE_SECRET ? null : authSecretId;
		try {
			if (isEditing && channel) {
				await updateChannel.mutateAsync({
					id: channel.id,
					payload: {
						label: label.trim(),
						url: url.trim() || undefined,
						authSecretId: authSecretIdValue,
						authHeaderName: authHeaderName.trim() || null,
					},
				});
				notify.success("Conexão atualizada.");
			} else {
				await createChannel.mutateAsync({
					label: label.trim(),
					url: url.trim(),
					authSecretId: authSecretIdValue,
					authHeaderName: authHeaderName.trim() || null,
				});
				notify.success("Conexão criada.");
			}
			onOpenChange(false);
		} catch {
			// useCreate/UpdateNotificationChannel already show the API error toast.
		}
	};

	return (
		<SmartOverlay
			open={open}
			onOpenChange={onOpenChange}
			title={isEditing ? "Editar conexão" : "Nova conexão de notificação"}
			description="URL de um webhook (ex.: n8n) que recebe o aviso quando um checkpoint abre. A URL e o segredo nunca voltam depois de salvos."
			headerIcon={<Webhook />}
			size="sm"
			footer={
				<Button disabled={isPending || !label.trim() || (!isEditing && !url.trim())} onClick={submit}>
					{isEditing ? "Salvar" : "Criar conexão"}
				</Button>
			}
		>
			<div className="flex flex-col gap-4">
				<FieldWrapper label="Nome" htmlFor="channel-label">
					<Input id="channel-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Teams — squad de conteúdo" />
				</FieldWrapper>

				<FieldWrapper
					label="URL do webhook"
					htmlFor="channel-url"
					description={
						isEditing
							? "A URL salva não é reexibida por segurança — deixe em branco para manter a atual."
							: undefined
					}
				>
					<Input
						id="channel-url"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder={
							isEditing && channel?.hasUrl
								? `Atual: ${channel.urlHost ?? "configurada"} — digite para substituir`
								: "https://n8n.exemplo.com/webhook/..."
						}
					/>
				</FieldWrapper>

				<FieldWrapper label="Nome do header de autenticação (opcional)" htmlFor="channel-header">
					<Input
						id="channel-header"
						value={authHeaderName}
						onChange={(e) => setAuthHeaderName(e.target.value)}
						placeholder="X-Workestrator-Token"
					/>
				</FieldWrapper>

				<FieldWrapper
					label="Segredo do header (opcional)"
					description="Cadastre o valor como uma conexão em Credenciais e selecione aqui."
				>
					<Select value={authSecretId} onValueChange={setAuthSecretId}>
						<SelectTrigger>
							<SelectValue placeholder="Nenhum" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={NONE_SECRET}>Nenhum</SelectItem>
							{secrets.map((secret: Secret) => (
								<SelectItem key={secret.id} value={secret.id}>
									{secret.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FieldWrapper>
			</div>
		</SmartOverlay>
	);
};
