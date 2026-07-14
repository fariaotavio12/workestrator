import { Button } from "@/components/button";
import { SmartOverlay } from "@/components/smart-dialog";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	confirmLabel?: string;
	destructive?: boolean;
	onConfirm: () => void;
};

export const ConfirmDialog = ({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Confirmar",
	destructive = false,
	onConfirm,
}: Props) => (
	<SmartOverlay
		open={open}
		onOpenChange={onOpenChange}
		title={title}
		description={description}
		size="sm"
		footer={
			<>
				<Button variant="outline" onClick={() => onOpenChange(false)}>
					Cancelar
				</Button>
				<Button
					variant={destructive ? "destructive" : "default"}
					onClick={() => {
						onConfirm();
						onOpenChange(false);
					}}
				>
					{confirmLabel}
				</Button>
			</>
		}
	>
		{null}
	</SmartOverlay>
);
