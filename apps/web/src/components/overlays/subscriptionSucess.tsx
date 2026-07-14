import { useQueryModal } from "@/app/hooks/useDialogParam";
import { SmartOverlay } from "@/components/smart-dialog";
import { Check } from "lucide-react";

export const DialogSubscriptionSucess = () => {
	const { isOpen, close } = useQueryModal({
		paramValue: "payment-success",
	});

	return (
		<SmartOverlay open={isOpen} forcePlacement="center" onOpenChange={close} size="sm">
			<div className="mt-2 flex flex-col gap-6">
				<div className="flex items-start gap-4">
					<div className="bg-secondary flex h-14 w-14 shrink-0 items-center justify-center rounded-full">
						<Check className="text-primary h-7 w-7" />
					</div>

					<div className="min-w-0 flex-1 pt-1">
						<h2 className="text-foreground text-lg font-semibold tracking-tight">Pagamento confirmado</h2>

						<p className="text-muted-foreground mt-1 text-sm leading-6">
							Recebemos seu pagamento e seu plano já está ativo para uso.
						</p>
					</div>
				</div>

				<div className="bg-muted/30 w-full rounded-2xl border p-4 text-left">
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground text-sm">Assinatura</span>
						<span className="text-primary text-sm font-medium">Ativa</span>
					</div>

					<div className="bg-border my-3 h-px" />

					<div className="flex items-center justify-between">
						<span className="text-muted-foreground text-sm">Pagamento</span>
						<span className="text-foreground text-sm font-medium">Aprovado</span>
					</div>
				</div>
			</div>
		</SmartOverlay>
	);
};
