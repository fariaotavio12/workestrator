import { Combobox, Input, SheetSection } from "@/components";
import type { SecretAuthType } from "@/features/security/orchestrator-shared/types";
import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { AUTH_TYPE_HINT, AUTH_TYPE_ICON, AUTH_TYPE_LABEL, AUTH_TYPES } from "./constants";
import type { SecretFormValues } from "./schema";

type Props = {
	authType: SecretAuthType;
	errors: FieldErrors<SecretFormValues>;
	register: UseFormRegister<SecretFormValues>;
	setValue: UseFormSetValue<SecretFormValues>;
};

export const SecretAuthFields = ({ authType, errors, register, setValue }: Props) => (
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
				<Input label="Token URL" placeholder="https://..." error={errors.tokenUrl?.message} {...register("tokenUrl")} />
				<Input label="Client ID (opcional)" {...register("clientId")} />
				<Input label="Scopes (opcional)" placeholder="separados por espaco" {...register("scopes")} />
			</>
		)}
	</SheetSection>
);
