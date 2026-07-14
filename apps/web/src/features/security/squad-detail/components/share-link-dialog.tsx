import { Rotas } from "@/app/routing/variables";
import { Button, ClipBoard, Typography, notify } from "@/components";
import { SmartOverlay } from "@/components/smart-dialog";
import { useCreateSquadShare, useRevokeSquadShare } from "@/features/security/squad-share/api";
import { Link2, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	squadId: string;
	squadName: string;
};

const shareUrl = (token: string) => `${window.location.origin}${Rotas.desprotegidas.share.replace(":token", token)}`;

/** Cria (ao abrir) um link público de compartilhamento — quem entra só importa prompts/agents, nunca modelos/chaves. */
export const ShareLinkDialog = ({ open, onOpenChange, squadId, squadName }: Props) => {
	const createShare = useCreateSquadShare();
	const revokeShare = useRevokeSquadShare();
	const [token, setToken] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		createShare.mutate(squadId, { onSuccess: (share) => setToken(share.token) });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, squadId]);

	const handleOpenChange = (next: boolean) => {
		if (!next) setToken(null);
		onOpenChange(next);
	};

	const handleRevoke = async () => {
		if (!token) return;
		try {
			await revokeShare.mutateAsync({ squadId, token });
			notify.success("Link revogado");
			handleOpenChange(false);
		} catch {
			// useRevokeSquadShare already shows the API error toast.
		}
	};

	return (
		<SmartOverlay
			open={open}
			onOpenChange={handleOpenChange}
			title="Compartilhar squad"
			description={`Qualquer pessoa com este link pode importar uma cópia de "${squadName}".`}
			headerIcon={<Link2 />}
			size="sm"
			footer={
				token && !createShare.isPending && (
					<Button variant="outline" className="text-destructive" disabled={revokeShare.isPending} onClick={handleRevoke}>
						{revokeShare.isPending && <Loader2 className="animate-spin" />}
						Revogar link
					</Button>
				)
			}
		>
			{createShare.isPending && (
				<div className="text-muted-foreground flex items-center justify-center gap-2 py-6">
					<Loader2 className="size-4 animate-spin" />
					<Typography variant="body-sm">Gerando link...</Typography>
				</div>
			)}

			{token && !createShare.isPending && (
				<div className="flex flex-col gap-4">
					<div className="flex items-center gap-2 rounded-lg border p-2">
						<Typography variant="body-sm" className="min-w-0 flex-1 truncate font-mono">
							{shareUrl(token)}
						</Typography>
						<ClipBoard texto={shareUrl(token)} />
					</div>
					<div className="bg-muted/40 flex gap-2 rounded-lg border p-3">
						<ShieldAlert className="text-muted-foreground mt-0.5 size-4 shrink-0" />
						<Typography variant="caption" className="text-muted-foreground">
							Quem aceitar recebe os prompts, agents e ferramentas deste squad — nunca suas chaves de modelo ou
							credenciais. A pessoa configura os próprios modelos depois de importar.
						</Typography>
					</div>
				</div>
			)}
		</SmartOverlay>
	);
};
