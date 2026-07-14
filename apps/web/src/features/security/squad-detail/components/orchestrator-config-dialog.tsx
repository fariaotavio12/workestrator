import {
	AppSheet,
	BlockEditor,
	Button,
	Input,
	ModelCombobox,
	Switch,
	Tabs,
	TabsContent,
	TabsContents,
	TabsList,
	TabsTrigger,
	Typography,
	notify,
} from "@/components";
import { Compass } from "lucide-react";
import { useState } from "react";
import { useProvidersQuery } from "@/features/security/models/api";
import { orchestratorConfigToPayload, useUpdateSquad } from "@/features/security/squad-detail/api";
import type { Squad } from "@/features/security/orchestrator-shared/types";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	squad: Squad;
};

export const OrchestratorConfigDialog = ({ open, onOpenChange, squad }: Props) => {
	if (!open) return null;
	return <OrchestratorConfigDialogContent open={open} onOpenChange={onOpenChange} squad={squad} />;
};

const OrchestratorConfigDialogContent = ({ open, onOpenChange, squad }: Props) => {
	const { data: providers = [] } = useProvidersQuery();
	const updateSquad = useUpdateSquad(squad.id);

	const locked = squad.runtime.status === "running" || squad.runtime.status === "checkpoint";

	const [systemPrompt, setSystemPrompt] = useState(squad.orchestrator.systemPrompt);
	const [providerId, setProviderId] = useState(squad.orchestrator.modelRef.providerId);
	const [model, setModel] = useState(squad.orchestrator.modelRef.model);
	const [maxSteps, setMaxSteps] = useState(squad.orchestrator.maxSteps);
	const [useRunHistory, setUseRunHistory] = useState(squad.orchestrator.useRunHistory ?? false);

	const save = async () => {
		if (!systemPrompt.trim()) {
			notify.error("Descreva as instruções do coordenador.");
			return;
		}
		if (maxSteps < 1) {
			notify.error("O limite de passos deve ser pelo menos 1.");
			return;
		}
		try {
			await updateSquad.mutateAsync(
				orchestratorConfigToPayload({
					systemPrompt: systemPrompt.trim(),
					modelRef: { providerId, model },
					maxSteps,
					useRunHistory,
				}),
			);
			notify.success("Coordenador atualizado");
			onOpenChange(false);
		} catch {
			// useUpdateSquad already shows the API error toast.
		}
	};

	return (
		<AppSheet
			open={open}
			onOpenChange={onOpenChange}
			title="Coordenador do squad"
			description="Ele decide, em tempo real, qual agent sentado age a seguir - até a tarefa acabar."
			contentClassName="sm:max-w-3xl"
			bodyClassName="overflow-hidden"
			headerLeading={
				<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
					<Compass className="size-5" />
				</div>
			}
			footer={
				<>
					<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button size="sm" onClick={save} disabled={locked || updateSquad.isPending}>
						Salvar
					</Button>
				</>
			}
		>
			<Tabs defaultValue="config" className="min-h-0 flex-1 gap-4">
				<TabsList className="grid h-auto w-full grid-cols-2" activeClassName="rounded-md">
					<TabsTrigger value="config" className="w-full text-center">
						Configuração
					</TabsTrigger>
					<TabsTrigger value="instructions" className="w-full text-center">
						Instruções
					</TabsTrigger>
				</TabsList>

				<TabsContents className="h-full min-h-0 flex-1 [&>div]:h-full [&>div>div]:h-full">
					<TabsContent value="config" className="flex flex-col gap-6">
						{locked && (
							<div className="border-warning/40 bg-warning/10 rounded-lg border p-3">
								<Typography variant="body-sm">Pare a execução para editar o coordenador.</Typography>
							</div>
						)}

						<div className="grid gap-4 sm:grid-cols-2">
							<ModelCombobox
								label="Modelo do coordenador"
								providers={providers}
								disabled={locked}
								value={providerId && model ? { providerId, model } : undefined}
								onChange={(next) => {
									setProviderId(next.providerId);
									setModel(next.model);
								}}
							/>
							<Input
								type="number"
								min={1}
								label="Limite de passos"
								description="Guardrail contra loop infinito e custo - encerra o run mesmo sem 'done'."
								value={maxSteps}
								disabled={locked}
								onChange={(e) => setMaxSteps(Math.max(1, Number(e.target.value) || 1))}
							/>
						</div>

						<Switch
							label="Consultar histórico de execuções"
							description="O coordenador vê um resumo das execuções anteriores deste squad para evitar repetir temas/decisões."
							checked={useRunHistory}
							disabled={locked}
							onCheckedChange={setUseRunHistory}
						/>

						<Typography variant="caption" className="text-muted-foreground">
							Quem precisa de aprovação antes de agir é configurado no próprio agent (aba Perfil, "Requer aprovação
							antes de agir").
						</Typography>
					</TabsContent>

					<TabsContent
						value="instructions"
						className="border-border flex h-full min-h-0 flex-col overflow-hidden rounded-lg border"
					>
						{locked && (
							<div className="border-warning/40 bg-warning/10 m-3 rounded-lg border p-3">
								<Typography variant="body-sm">Pare a execução para editar as instruções.</Typography>
							</div>
						)}
						<div className="min-h-0 flex-1 overflow-y-auto [&_.block-editor]:min-h-full [&_.block-editor-shell]:min-h-full [&_.bn-container]:min-h-full [&_.bn-editor]:min-h-full">
							<BlockEditor value={systemPrompt} editable={!locked} onChange={setSystemPrompt} />
						</div>
					</TabsContent>
				</TabsContents>
			</Tabs>
		</AppSheet>
	);
};
