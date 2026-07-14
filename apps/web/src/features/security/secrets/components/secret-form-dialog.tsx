import { AppSheet, Button, Input, SheetSection, notify } from "@/components";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { Secret } from "@/features/security/orchestrator-shared/types";
import { useCreateSecret, useUpdateSecret } from "@/features/security/secrets/api";
import type { ConnectorPreset } from "@/features/security/secrets/connectors-catalog";
import { SecretAuthFields } from "./secret-form-dialog/auth-fields";
import { SecretCredentialSection } from "./secret-form-dialog/credential-section";
import { emptyValues, secretFormSchema, type SecretFormValues } from "./secret-form-dialog/schema";
import { toMetadata, toValue } from "./secret-form-dialog/utils";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	secret?: Secret;
	preset?: ConnectorPreset;
};

export const SecretFormDialog = ({ open, onOpenChange, secret, preset }: Props) => {
	const createSecret = useCreateSecret();
	const updateSecret = useUpdateSecret();
	const isEditing = Boolean(secret);

	const {
		register,
		handleSubmit,
		reset,
		control,
		setValue,
		formState: { errors },
	} = useForm<SecretFormValues>({
		mode: "onTouched",
		resolver: zodResolver(secretFormSchema),
		defaultValues: emptyValues,
	});

	useEffect(() => {
		if (!open) return;
		if (secret) {
			reset({
				...emptyValues,
				label: secret.label,
				authType: secret.authType,
				headerName: secret.metadata?.headerName ?? "",
				valuePrefix: secret.metadata?.valuePrefix ?? "",
				queryParam: secret.metadata?.queryParam ?? "",
				basicUsername: secret.metadata?.basicUsername ?? "",
				tokenUrl: secret.metadata?.tokenUrl ?? "",
				clientId: secret.metadata?.clientId ?? "",
				scopes: secret.metadata?.scopes ?? "",
			});
			return;
		}
		reset(
			preset
				? {
						...emptyValues,
						label: preset.name,
						authType: preset.authType,
						tokenUrl: preset.tokenUrl ?? "",
						scopes: preset.defaultScopes ?? "",
					}
				: emptyValues,
		);
	}, [open, secret, preset, reset]);

	const authType = useWatch({ control, name: "authType" });

	const onSubmit = async (values: SecretFormValues) => {
		const metadata = toMetadata(values);
		try {
			if (secret) {
				await updateSecret.mutateAsync({
					id: secret.id,
					payload: { label: values.label, authType: values.authType, metadata, connectorId: secret.connectorId },
				});
				notify.success("Conexão atualizada");
			} else {
				await createSecret.mutateAsync({
					label: values.label,
					authType: values.authType,
					metadata,
					value: toValue(values),
					connectorId: preset?.id,
				});
				notify.success(preset ? `${preset.name} conectado` : "Conexão criada");
			}
			onOpenChange(false);
		} catch {
			// Secret API hooks already show the API error toast.
		}
	};

	const PresetIcon = preset?.icon;

	return (
		<AppSheet
			open={open}
			onOpenChange={onOpenChange}
			title={isEditing ? "Editar conexão" : preset ? `Conectar ${preset.name}` : "Nova conexão"}
			description="O valor real é cifrado no backend e nunca é devolvido, nem para esta tela."
			contentClassName="sm:max-w-lg"
			headerLeading={
				<div
					className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${preset?.colorClassName ?? "bg-muted text-muted-foreground"}`}
				>
					{PresetIcon ? <PresetIcon className="size-5" /> : <KeyRound className="size-5" />}
				</div>
			}
			footer={
				<>
					<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form="secret-form"
						size="sm"
						disabled={createSecret.isPending || updateSecret.isPending}
					>
						{isEditing ? "Salvar" : "Criar conexão"}
					</Button>
				</>
			}
		>
			<form id="secret-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
				<SheetSection label="Identificação">
					<Input
						label="Nome da conexão"
						placeholder="Ex.: openai-principal"
						error={errors.label?.message}
						{...register("label")}
					/>
				</SheetSection>

				<SecretAuthFields authType={authType} errors={errors} register={register} setValue={setValue} />
				<SecretCredentialSection authType={authType} isEditing={isEditing} register={register} />
			</form>
		</AppSheet>
	);
};
