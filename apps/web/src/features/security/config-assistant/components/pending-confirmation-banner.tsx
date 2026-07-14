import { Button, Typography } from "@/components";
import type { ConfigAssistantPendingConfirmation } from "@/features/security/orchestrator-shared/model";

type Props = {
	pendingConfirmation: ConfigAssistantPendingConfirmation | null;
	onCancel: () => void;
	onConfirm: () => void;
};

export const PendingConfirmationBanner = ({ pendingConfirmation, onCancel, onConfirm }: Props) => {
	if (!pendingConfirmation) return null;

	return (
		<div className="border-warning/40 bg-warning/10 mb-3 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
			<Typography variant="body-sm">{pendingConfirmation.summary}</Typography>
			<div className="flex shrink-0 gap-2">
				<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
					Cancelar
				</Button>
				<Button type="button" variant="destructive" size="sm" onClick={onConfirm}>
					Confirmar
				</Button>
			</div>
		</div>
	);
};
