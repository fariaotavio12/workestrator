import { Rotas } from "@/app/routing/variables";
import { Button, Input } from "@/components";
import { SmartOverlay } from "@/components/smart-dialog";
import { Link2 } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/** Aceita tanto o link completo quanto só o token final — extrai o token de qualquer um dos dois. */
const extractShareToken = (input: string): string => {
	const trimmed = input.trim();
	const marker = "/compartilhar/squad/";
	const markerIndex = trimmed.indexOf(marker);
	const raw = markerIndex === -1 ? trimmed : trimmed.slice(markerIndex + marker.length);
	return raw.split(/[/?#]/)[0] ?? "";
};

/** Não importa direto — leva pro preview público (`/compartilhar/squad/:token`), que já faz o aceite. */
export const ImportShareDialog = ({ open, onOpenChange }: Props) => {
	const [value, setValue] = useState("");
	const [error, setError] = useState<string | undefined>();
	const navigate = useNavigate();

	const handleOpenChange = (next: boolean) => {
		if (!next) {
			setValue("");
			setError(undefined);
		}
		onOpenChange(next);
	};

	const handleContinue = () => {
		const token = extractShareToken(value);
		if (!token) {
			setError("Cole o link ou o código de compartilhamento.");
			return;
		}
		handleOpenChange(false);
		navigate(Rotas.desprotegidas.share.replace(":token", token));
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.preventDefault();
			handleContinue();
		}
	};

	return (
		<SmartOverlay
			open={open}
			onOpenChange={handleOpenChange}
			title="Importar squad compartilhado"
			description="Cole o link que você recebeu para ver o preview e importar uma cópia para a sua conta."
			headerIcon={<Link2 />}
			size="sm"
			footer={
				<>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						Cancelar
					</Button>
					<Button onClick={handleContinue} disabled={!value.trim()}>
						Continuar
					</Button>
				</>
			}
		>
			<Input
				label="Link ou código"
				placeholder="https://.../compartilhar/squad/..."
				value={value}
				error={error}
				onChange={(e) => {
					setValue(e.target.value);
					setError(undefined);
				}}
				onKeyDown={handleKeyDown}
				autoFocus
			/>
		</SmartOverlay>
	);
};
