import { useAuth } from "@/app/providers/authProvider";
import { Rotas } from "@/app/routing/variables";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { Button, ErrorState, Skeleton, Typography, notify } from "@/components";
import { renderSquadIcon } from "@/components/orchestrator/icon-picker/render-squad-icon";
import { AgentAvatar } from "@/components/orchestrator";
import { useAcceptSquadShare, useSquadSharePreview } from "@/features/security/squad-share/api";
import type { CharacterName } from "@/features/security/orchestrator-shared/types";
import { Bot, Loader2, LogIn, ShieldCheck, Wrench } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

/** Página pública (sem auth) — preview de um squad compartilhado e importação para a conta logada. */
export const PageSquadShareAccept = () => {
	const { token = "" } = useParams();
	const navigate = useNavigate();
	const { user, isInitializing } = useAuth();
	const { data: preview, isLoading, error } = useSquadSharePreview(token);
	const acceptShare = useAcceptSquadShare();

	const handleAccept = async () => {
		try {
			const result = await acceptShare.mutateAsync(token);
			notify.success("Squad importado! Configure os modelos dos agents para começar a rodar.");
			navigate(Rotas.protegidas.orchestrator.squadDetail.replace(":id", result.squadId));
		} catch {
			// useAcceptSquadShare already shows the API error toast.
		}
	};

	const handleGoToLogin = () => {
		navigate(Rotas.desprotegidas.auth.login, { state: { from: `/compartilhar/squad/${token}` } });
	};

	return (
		<div className="bg-background flex min-h-screen w-full items-center justify-center p-4">
			<div className="w-full max-w-lg rounded-2xl border p-6 sm:p-8">
				{isLoading && (
					<div className="flex flex-col gap-4">
						<Skeleton className="size-12 rounded-xl" />
						<Skeleton className="h-6 w-2/3" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-24 w-full rounded-lg" />
					</div>
				)}

				{!isLoading && error && (
					<ErrorState
						title="Link indisponível"
						message={
							getApiErrorMessage(error).includes("revoked")
								? "Este link foi revogado pelo dono do squad."
								: "Este link não existe ou já foi removido."
						}
					/>
				)}

				{!isLoading && preview && (
					<div className="flex flex-col gap-6">
						<div className="flex items-start gap-3">
							<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-xl text-xl" aria-hidden>
								{renderSquadIcon(preview.icon, "size-5")}
							</div>
							<div className="flex min-w-0 flex-col gap-1">
								<Typography variant="title-lg" className="truncate">
									{preview.name}
								</Typography>
								{preview.description && (
									<Typography variant="body-sm" className="text-muted-foreground">
										{preview.description}
									</Typography>
								)}
							</div>
						</div>

						<div className="flex items-center gap-4">
							<div className="text-muted-foreground flex items-center gap-1.5">
								<Bot className="size-4" />
								<Typography variant="caption" as="span">
									{preview.agentCount} agent{preview.agentCount === 1 ? "" : "s"}
								</Typography>
							</div>
							<div className="text-muted-foreground flex items-center gap-1.5">
								<Wrench className="size-4" />
								<Typography variant="caption" as="span">
									{preview.scriptCount} ferramenta{preview.scriptCount === 1 ? "" : "s"}
								</Typography>
							</div>
						</div>

						{preview.agents.length > 0 && (
							<div className="flex flex-col gap-2">
								{preview.agents.map((agent, index) => (
									<div key={`${agent.name}-${index}`} className="bg-muted/40 flex items-center gap-3 rounded-lg border p-2">
										<AgentAvatar
											character={agent.character as CharacterName}
											accentColor={agent.accentColor}
											size={40}
										/>
										<div className="flex min-w-0 flex-col">
											<Typography variant="title-sm" className="truncate">
												{agent.name}
											</Typography>
											<Typography variant="caption" className="text-muted-foreground truncate">
												{agent.role}
											</Typography>
										</div>
									</div>
								))}
							</div>
						)}

						<div className="bg-muted/40 flex gap-2 rounded-lg border p-3">
							<ShieldCheck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
							<Typography variant="caption" className="text-muted-foreground">
								Você vai receber os prompts, agents e ferramentas deste squad — nenhuma chave de modelo ou credencial é
								compartilhada. Configure os modelos depois de importar.
							</Typography>
						</div>

						{isInitializing ? (
							<Button disabled className="w-full">
								<Loader2 className="animate-spin" />
								Carregando...
							</Button>
						) : user ? (
							<Button className="w-full" disabled={acceptShare.isPending} onClick={handleAccept}>
								{acceptShare.isPending && <Loader2 className="animate-spin" />}
								Aceitar e importar
							</Button>
						) : (
							<Button className="w-full" onClick={handleGoToLogin}>
								<LogIn />
								Entrar para aceitar
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	);
};
