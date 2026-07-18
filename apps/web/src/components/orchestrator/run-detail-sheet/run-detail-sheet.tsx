import {
	AppSheet,
	Badge,
	Button,
	notify,
	PreviewModal,
	type PreviewModalItem,
	Typography,
} from "@/components";
import {
	buildPreviewUrl,
	previewAvailable,
	registerPreviewRoot,
} from "@/features/security/orchestrator-shared/runtime/model-client";
import { continueRun, retryLastStep } from "@/features/security/orchestrator-shared/runtime/orchestrator-runtime";
import type { RunRecord, Squad } from "@/features/security/orchestrator-shared/types";
import { Download, Eye, FileCode, FileText, Image as ImageIcon, Play, RotateCw } from "lucide-react";
import { useState } from "react";
import { renderSquadIcon } from "../icon-picker/render-squad-icon";
import { AgentTurn, formatAgentArtifactContent } from "../run-transcript";
import { ScriptFormDialog } from "../script-form-dialog";
import { BUSY_STATUSES, formatFileSize, formatRunDuration, runStatusLabel, runStatusVariant } from "./run-meta";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	squad: Squad;
	run: RunRecord;
	/** Chamado após continuar/refazer o run — o histórico fecha e o RunDialog assume. */
	onRan: () => void;
};

export const RunDetailSheet = ({ open, onOpenChange, squad, run, onRan }: Props) => {
	const [scriptPrefill, setScriptPrefill] = useState<{ name?: string; content?: string } | null>(null);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewItems, setPreviewItems] = useState<PreviewModalItem[]>([]);

	const isSquadBusy = BUSY_STATUSES.has(squad.runtime.status);
	const files = run.files ?? [];

	const openHtmlPreview = (html: string) => {
		setPreviewItems([{ id: "inline", name: "preview.html", ext: ".html", srcDoc: html }]);
		setPreviewOpen(true);
	};

	// Abre o preview dos arquivos gerados por este run — registra o snapshot `.runs/<runId>` do runner.
	const openRunFiles = async () => {
		if (files.length === 0) return;
		if (!previewAvailable()) {
			notify.error("Preview de arquivos disponível apenas no app desktop.");
			return;
		}
		const rootId = await registerPreviewRoot({ runId: run.id });
		if (!rootId) {
			notify.error("Os arquivos deste run não estão mais disponíveis em disco.");
			return;
		}
		setPreviewItems(
			files.map((f, i) => ({
				id: `${i}-${f.path}`,
				name: f.path,
				ext: f.ext,
				isImage: f.isImage,
				url: buildPreviewUrl(rootId, f.path),
				changed: true,
			})),
		);
		setPreviewOpen(true);
	};

	const exportRun = () => {
		const parts = [
			`# ${squad.name} — ${run.input}`,
			`Status: ${runStatusLabel[run.status]}`,
			`Início: ${new Date(run.startedAt).toLocaleString()}`,
			run.endedAt ? `Fim: ${new Date(run.endedAt).toLocaleString()}` : null,
			files.length > 0 ? `Arquivos gerados: ${files.map((f) => f.path).join(", ")}` : null,
			...run.steps.map(
				(s, i) =>
					`## Passo ${i + 1}\n\n${s.artifact ? formatAgentArtifactContent(s.artifact.content) : "Sem artefato registrado."}`,
			),
		].filter((line): line is string => line !== null);

		const blob = new Blob([parts.join("\n\n")], { type: "text/markdown;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `${squad.name}-${run.startedAt}.md`.replace(/[^\w.-]+/g, "-").toLowerCase();
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const footer = (
		<div className="flex flex-wrap justify-end gap-2">
			{files.length > 0 && (
				<Button type="button" variant="outline" size="sm" onClick={openRunFiles}>
					<Eye />
					Ver arquivos
				</Button>
			)}
			<Button type="button" variant="outline" size="sm" onClick={exportRun}>
				<Download />
				Exportar run
			</Button>
			{!isSquadBusy && run.steps.length > 0 && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => {
						retryLastStep(squad.id, run);
						onRan();
					}}
				>
					<RotateCw />
					Refazer último passo
				</Button>
			)}
			{!isSquadBusy && run.status !== "done" && (
				<Button
					type="button"
					size="sm"
					onClick={() => {
						continueRun(squad.id, run);
						onRan();
					}}
				>
					<Play />
					Continuar de onde parou
				</Button>
			)}
		</div>
	);

	return (
		<>
			<AppSheet
				open={open}
				onOpenChange={onOpenChange}
				title={
					<span className="block truncate" title={run.input}>
						{run.input}
					</span>
				}
				description={`${runStatusLabel[run.status]} · ${formatRunDuration(run.startedAt, run.endedAt)} · ${new Date(run.startedAt).toLocaleString()}`}
				contentClassName="sm:max-w-3xl"
				headerLeading={
					<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-xl">
						{renderSquadIcon(squad.icon, "size-5")}
					</div>
				}
				headerTrailing={<Badge variant={runStatusVariant[run.status]}>{runStatusLabel[run.status]}</Badge>}
				footer={footer}
			>
				<div className="flex flex-col gap-5">
					{files.length > 0 && (
						<section className="flex flex-col gap-2 rounded-lg border p-4">
							<div className="flex items-center gap-2">
								<Typography variant="ui-header">Arquivos gerados</Typography>
								<Badge variant="secondary">{files.length}</Badge>
							</div>
							<div className="flex flex-col gap-1">
								{files.map((f) => (
									<button
										key={f.path}
										type="button"
										onClick={openRunFiles}
										className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
									>
										{f.isImage ? (
											<ImageIcon className="text-muted-foreground size-4 shrink-0" />
										) : (
											<FileText className="text-muted-foreground size-4 shrink-0" />
										)}
										<Typography variant="body-sm" className="min-w-0 flex-1 truncate">
											{f.path}
										</Typography>
										<Typography variant="caption" className="text-muted-foreground shrink-0">
											{formatFileSize(f.size)}
										</Typography>
									</button>
								))}
							</div>
						</section>
					)}

					<div className="flex flex-col gap-4">
						{run.steps.map((s) => {
							const agent = s.agentId ? squad.agents.find((a) => a.id === s.agentId) : undefined;
							return (
								<div key={s.stepId} className="flex flex-col gap-1">
									<AgentTurn
										name={agent?.name ?? "Agent"}
										role={agent?.role}
										character={agent?.character}
										accentColor={agent?.accentColor}
										content={s.artifact ? s.artifact.content : "Sem artefato registrado."}
										artifactKind={s.artifact?.kind}
										onPreviewHtml={openHtmlPreview}
									/>
									{s.artifact && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="self-start"
											onClick={() =>
												setScriptPrefill({
													name: `${squad.name} — ${run.input}`.slice(0, 60),
													content: s.artifact?.content,
												})
											}
										>
											<FileCode />
											Salvar como ferramenta
										</Button>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</AppSheet>

			<ScriptFormDialog
				open={Boolean(scriptPrefill)}
				onOpenChange={(next) => !next && setScriptPrefill(null)}
				prefill={scriptPrefill ?? undefined}
			/>

			<PreviewModal open={previewOpen} onOpenChange={setPreviewOpen} title="Arquivos gerados" items={previewItems} />
		</>
	);
};
