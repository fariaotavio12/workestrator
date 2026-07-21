import { useState } from "react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { AppSheet } from "@/components/sheet";
import { notify } from "@/components/toast/notify";
import { Typography } from "@/components/typography";
import { Download, FileSearch, Loader2 } from "lucide-react";
import { savePreviewArchive } from "@/features/security/orchestrator-shared/runtime/model-client";
import { ApprovalBar } from "./approval-bar";
import { FileList } from "./file-list";
import { FilePreview, type PreviewFile } from "./file-preview";

export type PreviewModalItem = PreviewFile & { id: string; changed?: boolean };

export type PreviewModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	items: PreviewModalItem[];
	archiveName?: string;
	/** Quando ambos sao passados, mostra a barra de aprovacao no rodape. */
	onApprove?: () => void;
	onRequestChanges?: (feedback: string) => void;
};

/** Preview em AppSheet: lista de arquivos + visualizador + barra de aprovacao. */
export const PreviewModal = ({
	open,
	onOpenChange,
	title = "Preview",
	items,
	archiveName = "arquivos-do-run.zip",
	onApprove,
	onRequestChanges,
}: PreviewModalProps) => {
	const [selectedId, setSelectedId] = useState<string | undefined>(items[0]?.id);
	const [savingArchive, setSavingArchive] = useState(false);

	const selected = items.find((item) => item.id === selectedId) ?? items[0];
	const showApproval = Boolean(onApprove && onRequestChanges);
	const fileCountLabel = `${items.length} ${items.length === 1 ? "arquivo" : "arquivos"}`;
	const archiveRootId = items.find((item) => item.rootId)?.rootId;

	const downloadArchive = async () => {
		if (!archiveRootId) return;
		setSavingArchive(true);
		try {
			const result = await savePreviewArchive({ rootId: archiveRootId, suggestedName: archiveName });
			if (result.saved) notify.success("Arquivos salvos em ZIP.");
		} catch (error) {
			notify.error(error instanceof Error ? error.message : "Nao foi possivel salvar o ZIP.");
		} finally {
			setSavingArchive(false);
		}
	};

	return (
		<AppSheet
			open={open}
			onOpenChange={onOpenChange}
			title={title}
			description="Revise os arquivos gerados antes de aprovar ou pedir ajustes."
			contentClassName="sm:max-w-5xl"
			bodyClassName="gap-0 overflow-hidden p-0"
			headerLeading={
				<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
					<FileSearch className="size-5" />
				</div>
			}
			headerTrailing={
				<div className="flex shrink-0 items-center gap-2">
					{archiveRootId && (
						<Button type="button" variant="outline" size="sm" onClick={downloadArchive} disabled={savingArchive}>
							{savingArchive ? <Loader2 className="animate-spin" /> : <Download />}
							Baixar tudo
						</Button>
					)}
					<Badge variant="outline" className="shrink-0">
						{fileCountLabel}
					</Badge>
				</div>
			}
			showFooter={showApproval}
			footer={
				showApproval ? (
					<ApprovalBar
						className="w-full"
						onApprove={() => {
							onApprove?.();
							onOpenChange(false);
						}}
						onRequestChanges={(feedback) => {
							onRequestChanges?.(feedback);
							onOpenChange(false);
						}}
					/>
				) : undefined
			}
		>
			<div className="bg-background flex min-h-0 flex-1 flex-col md:flex-row">
				{items.length > 1 && (
					<div className="border-border bg-muted/30 flex min-h-0 shrink-0 flex-col border-b p-3 md:w-64 md:border-r md:border-b-0">
						<Typography variant="caption" className="text-muted-foreground px-2 pb-2">
							Arquivos do preview
						</Typography>
						<FileList
							items={items}
							selectedId={selected?.id}
							onSelect={setSelectedId}
							className="max-h-40 min-h-0 md:max-h-none md:flex-1"
						/>
					</div>
				)}

				<div className="flex min-h-0 flex-1 flex-col p-4">
					<div className="border-border bg-card flex min-h-0 flex-1 flex-col rounded-lg border p-3">
						{selected ? (
							<FilePreview file={selected} className="min-h-0 flex-1" />
						) : (
							<div className="flex min-h-80 flex-1 items-center justify-center text-center">
								<Typography variant="body-sm" className="text-muted-foreground">
									Nenhum arquivo para pre-visualizar.
								</Typography>
							</div>
						)}
					</div>
				</div>
			</div>
		</AppSheet>
	);
};
