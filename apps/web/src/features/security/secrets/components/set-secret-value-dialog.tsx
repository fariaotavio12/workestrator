import { AppSheet, Button, Input, notify } from "@/components";
import type { Secret } from "@/features/security/orchestrator-shared/types";
import { useUpdateSecretValue } from "@/features/security/secrets/api";
import { KeyRound } from "lucide-react";
import { useState } from "react";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	secret: Secret | null;
};

/**
 * Rotaciona o valor real de um secret já criado — `PUT /secrets/{id}/value`. O valor nunca é relido
 * de volta (nem aqui, nem em outra tela): é cifrado no backend (AES-256-GCM) no momento do envio.
 */
export const SetSecretValueDialog = ({ open, onOpenChange, secret }: Props) => {
	const [value, setValue] = useState("");
	const updateSecretValue = useUpdateSecretValue();

	const handleSave = async () => {
		if (!secret || !value.trim()) return;
		try {
			await updateSecretValue.mutateAsync({ id: secret.id, payload: { value: value.trim() } });
			notify.success("Valor atualizado");
			setValue("");
			onOpenChange(false);
		} catch (err) {
			notify.error(err instanceof Error ? err.message : "Falha ao atualizar o valor.");
		}
	};

	return (
		<AppSheet
			open={open}
			onOpenChange={(next) => {
				if (!next) setValue("");
				onOpenChange(next);
			}}
			title="Definir valor do segredo"
			description={secret ? `"${secret.label}" — o valor é cifrado no backend e nunca é devolvido.` : undefined}
			contentClassName="sm:max-w-md"
			headerLeading={
				<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
					<KeyRound className="size-5" />
				</div>
			}
			footer={
				<>
					<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button type="button" size="sm" disabled={!value.trim() || updateSecretValue.isPending} onClick={handleSave}>
						{updateSecretValue.isPending ? "Salvando..." : "Salvar"}
					</Button>
				</>
			}
		>
			<Input
				label="Valor real"
				type="password"
				placeholder="Cole a chave/token aqui"
				autoComplete="off"
				value={value}
				onChange={(e) => setValue(e.target.value)}
			/>
		</AppSheet>
	);
};
