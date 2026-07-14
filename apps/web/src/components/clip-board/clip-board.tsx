import { ClipboardCopy, ClipboardIcon } from "lucide-react";
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/button";
import { notify } from "@/components/toast/notify";

type ClipBoardProps = {
	texto: string;
} & ButtonProps

export const ClipBoard = ({ texto, onClick, variant = "outline", size = "icon", ...props }: ClipBoardProps) => {
	const [copied, setCopied] = useState(false);

	const handleClick: React.MouseEventHandler<HTMLButtonElement> = async (event) => {
		// Respeita um onClick passado por props, se existir
		if (onClick) {
			onClick(event as any);
		}

		if (event.defaultPrevented) return;

		try {
			await navigator.clipboard.writeText(texto);
			setCopied(true);
			notify.success("Item copiado com sucesso");

			// Resetar o Ã­cone depois de um tempo
			setTimeout(() => setCopied(false), 1500);
		} catch {
			notify.error("NÃ£o foi possÃ­vel copiar o texto");
		}
	};

	return (
		<Button {...props} variant={variant} size={size} onClick={handleClick}>
			{copied ? <ClipboardIcon size={14} /> : <ClipboardCopy size={14} />}
		</Button>
	);
};
