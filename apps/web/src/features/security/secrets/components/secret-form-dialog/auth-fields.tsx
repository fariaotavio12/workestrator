import {
	Combobox,
	FieldWrapper,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	SheetSection,
} from "@/components";
import type { SecretAuthType } from "@/features/security/orchestrator-shared/types";
import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useWatch, type Control } from "react-hook-form";
import { AUTH_TYPE_HINT, AUTH_TYPE_ICON, AUTH_TYPE_LABEL, AUTH_TYPES } from "./constants";
import type { SecretFormValues } from "./schema";

const SIGNATURE_METHODS = ["HMAC-SHA1", "HMAC-SHA256", "PLAINTEXT"] as const;

type Props = {
	authType: SecretAuthType;
	control: Control<SecretFormValues>;
	errors: FieldErrors<SecretFormValues>;
	register: UseFormRegister<SecretFormValues>;
	setValue: UseFormSetValue<SecretFormValues>;
};

export const SecretAuthFields = ({ authType, control, errors, register, setValue }: Props) => {
	const signatureMethod = useWatch({ control, name: "signatureMethod" });

	return (
		<SheetSection label="Como autentica">
			<Combobox<SecretAuthType>
				label="Esquema de autenticacao"
				error={errors.authType?.message}
				options={AUTH_TYPES}
				getOptionKey={(type) => type}
				getOptionLabel={(type) => AUTH_TYPE_LABEL[type]}
				value={authType}
				onChange={(type) => setValue("authType", type, { shouldValidate: true })}
				renderValue={(type) => {
					const Icon = AUTH_TYPE_ICON[type];
					return (
						<span className="flex items-center gap-2">
							<Icon className="size-4 shrink-0" />
							{AUTH_TYPE_LABEL[type]}
						</span>
					);
				}}
				renderOption={(type) => {
					const Icon = AUTH_TYPE_ICON[type];
					return (
						<span className="flex w-full items-center gap-3 py-1">
							<span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
								<Icon className="size-4" />
							</span>
							<span className="flex min-w-0 flex-col gap-0.5">
								<span className="text-sm leading-tight font-medium">{AUTH_TYPE_LABEL[type]}</span>
								<span className="text-muted-foreground text-xs leading-tight">{AUTH_TYPE_HINT[type]}</span>
							</span>
						</span>
					);
				}}
			/>

			{authType === "header" && (
				<>
					<Input
						label="Nome do header"
						placeholder="Ex.: x-api-key"
						error={errors.headerName?.message}
						{...register("headerName")}
					/>
					<Input label="Prefixo do valor (opcional)" placeholder="Ex.: Bearer " {...register("valuePrefix")} />
				</>
			)}

			{authType === "query" && (
				<Input
					label="Nome do query param"
					placeholder="Ex.: key"
					error={errors.queryParam?.message}
					{...register("queryParam")}
				/>
			)}

			{authType === "basic" && (
				<Input label="Usuário" error={errors.basicUsername?.message} {...register("basicUsername")} />
			)}

			{authType.startsWith("oauth2") && (
				<>
					<Input
						label="Token URL"
						placeholder="https://..."
						error={errors.tokenUrl?.message}
						{...register("tokenUrl")}
					/>
					<Input label="Client ID (opcional)" {...register("clientId")} />
					<Input label="Scopes (opcional)" placeholder="separados por espaco" {...register("scopes")} />
				</>
			)}

			{authType === "oauth1" && (
				<>
					<Input
						label="Chave do consumidor"
						placeholder="Ex.: fluig_avalia_chamados"
						error={errors.consumerKey?.message}
						{...register("consumerKey")}
					/>
					<Input label="Token (opcional)" placeholder="Ex.: 843be26f-..." {...register("oauthToken")} />
					<FieldWrapper label="Método de assinatura">
						<Select
							value={signatureMethod}
							onValueChange={(value) =>
								setValue("signatureMethod", value as SecretFormValues["signatureMethod"], {
									shouldValidate: true,
								})
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SIGNATURE_METHODS.map((method) => (
									<SelectItem key={method} value={method}>
										{method}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FieldWrapper>
					<Input label="Realm (opcional)" placeholder="Ex.: Fluig" {...register("realm")} />
				</>
			)}
		</SheetSection>
	);
};
