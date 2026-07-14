import { Button, FieldWrapper, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Typography } from "@/components";
import { SecretFormDialog } from "@/features/security/secrets/components/secret-form-dialog";
import { useSecretsQuery } from "@/features/security/secrets/api";
import { Plus } from "lucide-react";
import { useState } from "react";

type StepAuthProps = {
	authRef: string;
	onChange: (value: string) => void;
};

/** Passo 3 do wizard — só aparece quando o template pede autenticação. Nunca digita a chave crua aqui. */
export const StepAuth = ({ authRef, onChange }: StepAuthProps) => {
	const { data: secrets = [] } = useSecretsQuery();
	const [creatingSecret, setCreatingSecret] = useState(false);

	return (
		<div className="flex flex-col gap-4">
			<Typography variant="body-sm" className="text-muted-foreground">
				Escolha um segredo já cadastrado no cofre local, ou crie um novo — o valor real nunca fica salvo no script.
			</Typography>

			<FieldWrapper label="Referência de segredo">
				<Select value={authRef || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
					<SelectTrigger>
						<SelectValue placeholder="Nenhuma" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">Nenhuma</SelectItem>
						{secrets.map((secret) => (
							<SelectItem key={secret.id} value={secret.id}>
								{secret.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FieldWrapper>

			<Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setCreatingSecret(true)}>
				<Plus />
				Criar novo segredo
			</Button>

			<SecretFormDialog open={creatingSecret} onOpenChange={setCreatingSecret} />
		</div>
	);
};
