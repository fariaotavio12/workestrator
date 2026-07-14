import { Button } from "@/components/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

type FooterButtonProps = {
	isSubmitting: boolean;
	isCreateMode: boolean;
	onCancel?: () => void;
	cancelLabel?: string;
	createLabel?: string;
	updateLabel?: string;
};

export const FooterButton = ({
	isSubmitting,
	isCreateMode,
	onCancel,
	cancelLabel = "Cancelar",
	createLabel = "Salvar",
	updateLabel = "Atualizar",
}: FooterButtonProps) => {
	const navigate = useNavigate();
	const onCancelHandler = onCancel ?? (() => navigate(-1));

	return (
		<div className="bg-muted/25 mt-auto flex w-full flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-end">
			<Button type="button" variant="outline" onClick={onCancelHandler} disabled={isSubmitting}>
				{cancelLabel}
			</Button>

			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting && <Loader2 className="animate-spin" size={14} />}
				{isCreateMode ? createLabel : updateLabel}
			</Button>
		</div>
	);
};
