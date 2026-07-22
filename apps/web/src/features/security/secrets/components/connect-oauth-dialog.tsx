import { AppSheet, Button, Input, Typography, notify } from "@/components";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
	configureInstagramApp,
	connectInstagram,
	connectOAuth,
	getInstagramAppStatus,
} from "@/features/security/orchestrator-shared/runtime/model-client";
import { secretsKeys, useCreateSecret } from "@/features/security/secrets/api";
import type { ConnectorPreset } from "@/features/security/secrets/connectors-catalog";
import { apiUrl, tanStackQueryClient } from "@/app/api/clients";
import { tokenStorage } from "@/app/utils/tokenStorage";

const schema = z.object({
	clientId: z.string().optional(),
	clientSecret: z.string().optional(),
	scopes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Preset com `authUrl` definido — quem abre esta tela já garantiu isso (ver `page-secrets.tsx`). */
	preset: ConnectorPreset | undefined;
};

/**
 * Coleta as credenciais do app OAuth do usuário (Client ID/Secret cadastrados no provider) e dispara
 * o fluxo `authorization_code` + PKCE via IPC do Electron (`oauth-flow.ts`). O resultado vira um
 * secret comum `oauth2_refresh` — a partir daí segue o caminho já existente (rotação automática do
 * refresh_token, ver runner.ts). Se o provider não devolver `refresh_token` (alguns exigem opt-in do
 * app pra emitir um), salva como `bearer` mesmo — funciona até o access token expirar, sem renovação.
 */
export const ConnectOAuthDialog = ({ open, onOpenChange, preset }: Props) => {
	const [connecting, setConnecting] = useState(false);
	const [instagramConfigured, setInstagramConfigured] = useState<boolean | null>(null);
	const [instagramCallbackUri, setInstagramCallbackUri] = useState("");
	const createSecret = useCreateSecret();
	const isInstagram = preset?.id === "instagram";
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<FormValues>({
		mode: "onTouched",
		resolver: zodResolver(schema),
		defaultValues: { clientId: "", clientSecret: "", scopes: preset?.defaultScopes ?? "" },
	});

	useEffect(() => {
		if (!open) return;
		reset({ clientId: "", clientSecret: "", scopes: preset?.defaultScopes ?? "" });
		if (!isInstagram) return;
		void getInstagramAppStatus().then((status) => {
			setInstagramConfigured(status.configured);
			setInstagramCallbackUri(status.callbackUri);
		});
	}, [isInstagram, open, preset, reset]);

	const onSubmit = async (values: FormValues) => {
		if (!preset?.authUrl || !preset.tokenUrl) {
			// Nunca deveria acontecer (quem abre este sheet já garantiu `authUrl`) — mas falhar em
			// silêncio (só o `return`, sem aviso) já causou um bug real: parecia que o botão "não fazia
			// nada". Um preset sem `tokenUrl` é config incompleta, não algo pra engolir sem avisar.
			notify.error(`${preset?.name ?? "Este conector"} está sem tokenUrl configurado — não dá pra conectar.`);
			return;
		}
		setConnecting(true);
		try {
			if (isInstagram) {
				if (!instagramConfigured) {
					if (!values.clientId?.trim() || !values.clientSecret?.trim()) {
						throw new Error("Informe o App ID e o App Secret da Meta para configurar o conector.");
					}
					await configureInstagramApp({
						clientId: values.clientId.trim(),
						clientSecret: values.clientSecret.trim(),
					});
					setInstagramConfigured(true);
				}
				const backendToken = await tokenStorage.get();
				if (!backendToken) throw new Error("Faça login no Workestrator antes de conectar o Instagram.");
				if (!apiUrl) throw new Error("A URL da API do Workestrator não está configurada.");
				await connectInstagram({
					authUrl: preset.authUrl,
					tokenUrl: preset.tokenUrl,
					scopes:
						values.scopes || preset.defaultScopes || "instagram_business_basic instagram_business_content_publish",
					backendBaseUrl: apiUrl,
					backendToken,
				});
				await tanStackQueryClient.invalidateQueries({ queryKey: secretsKeys.list() });
				notify.success("Conta do Instagram conectada");
				onOpenChange(false);
				return;
			}
			if (!values.clientId?.trim()) throw new Error("Informe o Client ID.");
			const result = await connectOAuth({
				authUrl: preset.authUrl,
				tokenUrl: preset.tokenUrl,
				clientId: values.clientId.trim(),
				clientSecret: values.clientSecret || undefined,
				scopes: values.scopes || undefined,
			});

			if (result.refreshToken) {
				await createSecret.mutateAsync({
					label: preset.name,
					authType: "oauth2_refresh",
					metadata: {
						tokenUrl: preset.tokenUrl,
						clientId: values.clientId.trim(),
						...(values.scopes ? { scopes: values.scopes } : {}),
					},
					value: JSON.stringify({ refreshToken: result.refreshToken, clientSecret: values.clientSecret || undefined }),
					connectorId: preset.id,
				});
				notify.success(`${preset.name} conectado`);
			} else {
				await createSecret.mutateAsync({
					label: preset.name,
					authType: "bearer",
					value: result.accessToken,
					connectorId: preset.id,
				});
				notify.warning(
					`${preset.name} conectado, mas o provider não emitiu um refresh token — vai precisar reconectar quando o acesso expirar.`,
				);
			}
			onOpenChange(false);
		} catch (err) {
			notify.error(err instanceof Error ? err.message : "Falha ao conectar.");
		} finally {
			setConnecting(false);
		}
	};

	const PresetIcon = preset?.icon;

	return (
		<AppSheet
			open={open}
			onOpenChange={(next) => !connecting && onOpenChange(next)}
			title={preset ? `Conectar ${preset.name}` : "Conectar"}
			description={
				isInstagram
					? "Configure o aplicativo Meta uma vez e conecte quantas contas Instagram profissionais precisar."
					: "As credenciais do seu app OAuth (cadastrado no provider) — nunca trafegam além desta troca."
			}
			contentClassName="sm:max-w-md"
			headerLeading={
				<div
					className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${preset?.colorClassName ?? "bg-muted text-muted-foreground"}`}
				>
					{PresetIcon && <PresetIcon className="size-5" />}
				</div>
			}
			footer={
				<>
					<Button type="button" variant="outline" size="sm" disabled={connecting} onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form="connect-oauth-form"
						size="sm"
						disabled={connecting || (isInstagram && instagramConfigured === null)}
					>
						{connecting ? "Abrindo autorização..." : isInstagram ? "Entrar com Instagram" : "Conectar"}
					</Button>
				</>
			}
		>
			<div className="mb-2 flex items-center gap-2">
				<div className="flex items-center gap-1.5">
					<span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-xs font-semibold">
						1
					</span>
					<Typography variant="caption" className="font-semibold">
						Credenciais
					</Typography>
				</div>
				<div className="border-border h-px flex-1" />
				<div className="flex items-center gap-1.5">
					<span className="border-border text-muted-foreground flex size-5 items-center justify-center rounded-full border text-xs font-semibold">
						2
					</span>
					<Typography variant="caption" className="text-muted-foreground font-semibold">
						Autorizar
					</Typography>
				</div>
			</div>

			<form id="connect-oauth-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
				{(!isInstagram || instagramConfigured === false) && (
					<>
						<Input
							label={isInstagram ? "App ID da Meta" : "Client ID"}
							placeholder="Cadastrado no app OAuth do provider"
							error={errors.clientId?.message}
							{...register("clientId")}
						/>
						<Input
							label={isInstagram ? "App Secret da Meta" : "Client secret (opcional)"}
							type="password"
							autoComplete="off"
							{...register("clientSecret")}
						/>
					</>
				)}
				{isInstagram && instagramCallbackUri && (
					<Typography variant="caption" className="text-muted-foreground">
						Redirect URI para cadastrar no aplicativo Meta: {instagramCallbackUri}
					</Typography>
				)}
				<Input label="Scopes" placeholder="separados por espaço" {...register("scopes")} />
				<Typography variant="caption" className="text-muted-foreground">
					{isInstagram
						? "O navegador do seu computador será aberto. Entre no Instagram e autorize a conta profissional que deseja usar."
						: `Uma janela de autorização do ${preset?.name ?? "provider"} vai abrir. Depois de autorizar, ela fecha sozinha.`}
				</Typography>
			</form>
		</AppSheet>
	);
};
