import { Input, SheetSection, Typography } from "@/components";
import type { SecretAuthType } from "@/features/security/orchestrator-shared/types";
import type { UseFormRegister } from "react-hook-form";
import { VALUE_LABEL } from "./constants";
import type { SecretFormValues } from "./schema";

type Props = {
	authType: SecretAuthType;
	isEditing: boolean;
	register: UseFormRegister<SecretFormValues>;
};

export const SecretCredentialSection = ({ authType, isEditing, register }: Props) => {
	if (isEditing) {
		return (
			<Typography variant="caption" className="text-muted-foreground">
				Pra trocar o valor real, use a acao &quot;Definir valor&quot; na lista.
			</Typography>
		);
	}

	return (
		<SheetSection label="Credencial">
			<Input
				label={VALUE_LABEL[authType]}
				type="password"
				placeholder="Cole o valor real aqui"
				autoComplete="off"
				{...register("value")}
			/>
			<Typography variant="caption" className="text-muted-foreground">
				O valor fica cifrado no backend - nunca e exibido de volta, nem aqui, nem em outra tela.
			</Typography>
		</SheetSection>
	);
};
