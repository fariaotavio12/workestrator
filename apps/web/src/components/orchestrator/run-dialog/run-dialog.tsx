import {
	AppSheet,
	BlockEditor,
	Button,
	FieldWrapper,
	ScrollArea,
	PreviewModal,
	type PreviewModalItem,
	notify,
} from "@/components";
import {
	buildPreviewUrl,
	listWorkspaceFiles,
	previewAvailable,
	registerPreviewRoot,
	runnerAvailable,
	runStepEndpointAvailable,
} from "@/features/security/orchestrator-shared/runtime/model-client";
import { MonitorDown, Play, Save } from "lucide-react";
import { useState } from "react";
import { renderSquadIcon } from "../icon-picker/render-squad-icon";
import {
	answerPrompt,
	continueRun,
	pauseRun,
	resetRun,
	resolveCheckpoint,
	resumeRun,
	retryLastStep,
	startRun,
	stopRun,
} from "@/features/security/orchestrator-shared/runtime/orchestrator-runtime";
import {
	getSquadReadiness,
	isApiOnlySquad,
	readinessMessage,
} from "@/features/security/orchestrator-shared/runtime/squad-readiness";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { useProvidersQuery } from "@/features/security/models/api";
import { useRunsQuery } from "@/features/security/executions/api";
import { useUpdateSquad } from "@/features/security/squad-detail/api";
import { RunActivityMap } from "../run-activity-map";
import { RunInteractionPanel, RunStatusBar, RunTranscript } from "../run-transcript";
import { ConfirmDialog } from "../confirm-dialog";
import { useOrchestratorRuntimeStore, useRunDialogStore } from "@/features/security/orchestrator-shared/model";

const EMPTY_RUN_IDS: string[] = [];

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	squad: Squad;
};

export const RunDialog = ({ open, onOpenChange, squad }: Props) => {
	if (!open) return null;
	return <RunDialogContent open={open} onOpenChange={onOpenChange} squad={squad} />;
};

const RunDialogContent = ({ open, onOpenChange, squad }: Props) => {
	const { data: providers = [] } = useProvidersQuery();
	// Último run persistido deste squad — alimenta "Continuar de onde parou"/"Refazer último passo"
	// assim que o run atual termina (a lista se atualiza sozinha via invalidação de query).
	const { data: runs = [] } = useRunsQuery(squad.id);
	const latestRun = [...runs].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

	const [input, setInput] = useState(() => squad.savedBriefing ?? "");
	const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewItems, setPreviewItems] = useState<PreviewModalItem[]>([]);

	const updateSquad = useUpdateSquad(squad.id);
	const openRunDialog = useRunDialogStore((state) => state.openRunDialog);
	const runIds = useOrchestratorRuntimeStore((state) => state.runIdsBySquad[squad.id] ?? EMPTY_RUN_IDS);
	const runtimes = useOrchestratorRuntimeStore((state) => state.runtimes);
	const runKey = squad.runtime.runId ?? squad.id;
	const briefingDirty = input.trim() !== (squad.savedBriefing ?? "").trim();
	// Desktop roda tudo; fora dele, só squad 100% de API e com endpoint de execução disponível
	// (`vite dev`). Mesma regra do `requireRunner` no runtime — aqui só decide o que a UI mostra.
	const apiOnlySquad = isApiOnlySquad(squad, providers);
	const canRunOnThisDevice = runnerAvailable() || (runStepEndpointAvailable() && apiOnlySquad);

	const saveBriefing = async () => {
		try {
			await updateSquad.mutateAsync({ savedBriefing: input.trim() || null });
			notify.success("Briefing salvo — será reaproveitado nas próximas execuções.");
		} catch {
			// useUpdateSquad already shows the API error toast.
		}
	};

	const openHtmlPreview = (html: string) => {
		setPreviewItems([{ id: "inline", name: "preview.html", ext: ".html", srcDoc: html }]);
		setPreviewOpen(true);
	};

	// Abre o preview dos arquivos gerados pelos agents (workspace fixo do runner — `dir` vazio).
	const openWorkspaceFiles = async () => {
		if (!previewAvailable()) {
			notify.error("Preview de arquivos disponível apenas no app desktop.");
			return;
		}
		const rootId = await registerPreviewRoot({ executionId: squad.runtime.runId });
		if (!rootId) {
			notify.error("Nenhum arquivo em disco (agents sem execução de arquivos ou app precisa ser reiniciado).");
			return;
		}
		const files = await listWorkspaceFiles(squad.runtime.runId ?? "", false);
		if (files.length === 0) {
			notify.info("Nenhum arquivo gerado ainda — o resultado está no transcript acima.");
			return;
		}
		// Marca os arquivos criados/alterados neste run (via git diff) com o ponto "changed" na lista.
		const changed = await listWorkspaceFiles(squad.runtime.runId ?? "", true);
		const changedPaths = new Set(changed.map((f) => f.path));
		setPreviewItems(
			files.map((f, i) => ({
				id: `${i}-${f.path}`,
				name: f.path,
				ext: f.ext,
				isImage: f.isImage,
				url: buildPreviewUrl(rootId, f.path),
				rootId,
				relativePath: f.path,
				changed: changedPaths.has(f.path),
			})),
		);
		setPreviewOpen(true);
	};

	const { status } = squad.runtime;

	const submitStart = () => {
		if (!input.trim()) {
			notify.error("Descreva o briefing inicial.");
			return;
		}
		if (!canRunOnThisDevice) {
			notify.warning(
				"Execução disponível no app desktop",
				"Este squad usa provider de CLI local (Claude/Codex/GPT), que só roda no app desktop.",
				{
					label: "Baixar desktop",
					onClick: () => {
						window.location.assign("/download");
					},
				},
			);
			return;
		}
		// Cinto de segurança: revalida a prontidão aqui (ex.: provider deletado com o dialog aberto).
		const readiness = getSquadReadiness(squad, providers);
		if (readiness.length > 0) {
			notify.error(readiness.map(readinessMessage).join(" "));
			return;
		}
		startRun(squad.id, input.trim());
		setInput("");
	};

	return (
		<>
			<AppSheet
				open={open}
				onOpenChange={onOpenChange}
				title={`Rodar: ${squad.name}`}
				description="Acompanhe a execução do squad."
				contentClassName={status === "idle" ? "sm:max-w-3xl" : "sm:max-w-[72rem]"}
				bodyClassName={status === "idle" ? "overflow-hidden" : undefined}
				headerLeading={
					<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-xl">
						{renderSquadIcon(squad.icon, "size-5")}
					</div>
				}
				footer={
					status === "idle" ? (
						<>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!briefingDirty || updateSquad.isPending}
								onClick={saveBriefing}
							>
								<Save />
								Salvar briefing
							</Button>
							{canRunOnThisDevice ? (
								<Button type="button" size="sm" onClick={submitStart}>
									<Play />
									Iniciar execução
								</Button>
							) : (
								<Button type="button" size="sm" asChild>
									<a href="/download">
										<MonitorDown />
										Baixar desktop
									</a>
								</Button>
							)}
						</>
					) : (
						<RunStatusBar
							squad={squad}
							onPause={() => pauseRun(runKey)}
							onResume={() => resumeRun(runKey)}
							onStop={() => setStopConfirmOpen(true)}
							onReset={() => resetRun(runKey)}
							onNewRun={() => openRunDialog(squad.id, null)}
							onContinue={latestRun && latestRun.status !== "done" ? () => continueRun(squad.id, latestRun) : undefined}
							onRetryLastStep={
								latestRun && latestRun.steps.length > 0 ? () => retryLastStep(squad.id, latestRun) : undefined
							}
							onOpenFiles={previewAvailable() ? openWorkspaceFiles : undefined}
						/>
					)
				}
			>
				<div className="flex min-h-0 flex-1 flex-col gap-3">
					{status !== "idle" && runIds.length > 1 && (
						<div className="flex gap-2 overflow-x-auto pb-1">
							{runIds.map((runId, index) => {
								const item = runtimes[runId];
								const active = runId === squad.runtime.runId;
								return (
									<Button
										key={runId}
										type="button"
										size="sm"
										variant={active ? "default" : "outline"}
										className="shrink-0"
										onClick={() => openRunDialog(squad.id, runId)}
									>
										Execução {runIds.length - index} · {item?.status ?? "idle"}
									</Button>
								);
							})}
						</div>
					)}
					{status === "idle" ? (
						<div className="flex min-h-0 flex-1 flex-col gap-3">
							{!canRunOnThisDevice && (
								<div className="border-warning/30 bg-warning/10 text-foreground rounded-lg border px-4 py-3 text-sm">
									Este squad usa provider de CLI local (Claude/Codex/GPT), que precisa do binário instalado na máquina —
									só roda no app desktop. Squads que usam apenas providers de API rodam direto no navegador.
								</div>
							)}
							<FieldWrapper
								label="Briefing inicial"
								description="O que o squad deve fazer nesta execução? Use blocos, listas e títulos."
								className="min-h-0 flex-1 overflow-hidden"
							>
								<div className="border-input-border bg-background min-h-0 flex-1 overflow-y-auto rounded-lg border [&_.block-editor]:min-h-full [&_.block-editor-shell]:min-h-full [&_.bn-container]:min-h-full [&_.bn-editor]:min-h-full">
									<BlockEditor value={input} onChange={setInput} />
								</div>
							</FieldWrapper>
						</div>
					) : (
						<div className="flex min-h-0 flex-1 gap-4">
							<RunActivityMap
								squad={squad}
								className="border-border hidden w-52 shrink-0 overflow-y-auto border-r pr-3 md:block"
							/>

							<div className="flex min-h-0 flex-1 flex-col gap-3">
								<ScrollArea className="min-h-0 flex-1 rounded-lg border p-4">
									<RunTranscript squad={squad} onPreviewHtml={openHtmlPreview} />
								</ScrollArea>

								<RunInteractionPanel
									squad={squad}
									onApprove={() => resolveCheckpoint(runKey, true)}
									onReject={() => resolveCheckpoint(runKey, false)}
									onAnswer={(answer) => answerPrompt(runKey, answer)}
								/>
							</div>
						</div>
					)}
				</div>
			</AppSheet>

			<ConfirmDialog
				open={stopConfirmOpen}
				onOpenChange={setStopConfirmOpen}
				title="Parar execução?"
				description="A execução atual será abortada e registrada no histórico."
				confirmLabel="Parar"
				destructive
				onConfirm={() => stopRun(runKey)}
			/>

			<PreviewModal
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				title="Arquivos gerados"
				items={previewItems}
				archiveName={`${squad.name}-${new Date().toISOString()}-arquivos.zip`.replace(/[^\w.-]+/g, "-").toLowerCase()}
				// Aprovação só faz sentido quando o run está esperando resposta — vira a resposta do agent.
				onApprove={status === "awaiting_input" ? () => answerPrompt(runKey, "Aprovado.") : undefined}
				onRequestChanges={status === "awaiting_input" ? (feedback) => answerPrompt(runKey, feedback) : undefined}
			/>
		</>
	);
};
