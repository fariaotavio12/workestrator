import { copyToClipboard } from "@/app/utils/clipboard";
import { Check, ClipboardCopy } from "lucide-react";
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/button";
import { notify } from "@/components/toast/notify";

type ClipBoardProps = {
	texto: string;
} & ButtonProps

export const ClipBoard = ({ texto, onClick, variant = "outline", size = "icon", children, ...props }: ClipBoardProps) => {
	const [copied, setCopied] = useState(false);

	const handleClick: React.MouseEventHandler<HTMLButtonElement> = async (event) => {
		if (onClick) {
			onClick(event as any);
		}

		if (event.defaultPrevented) return;

		const ok = await copyToClipboard(texto);

		if (!ok) {
			notify.error("Não foi possível copiar o texto");
			return;
		}

		setCopied(true);
		notify.success("Item copiado com sucesso");
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<Button {...props} variant={variant} size={size} onClick={handleClick}>
			{copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
			{children}
		</Button>
	);
};
