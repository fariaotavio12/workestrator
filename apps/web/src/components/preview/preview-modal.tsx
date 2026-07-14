import { useState } from "react";
import { Badge } from "@/components/badge";
import { AppSheet } from "@/components/sheet";
import { Typography } from "@/components/typography";
import { FileSearch } from "lucide-react";
import { ApprovalBar } from "./approval-bar";
import { FileList } from "./file-list";
import { FilePreview, type PreviewFile } from "./file-preview";

export type PreviewModalItem = PreviewFile & { id: string; changed?: boolean };

export type PreviewModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title?: string;
	items: PreviewModalItem[];
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
	onApprove,
	onRequestChanges,
}: PreviewModalProps) => {
	const [selectedId, setSelectedId] = useState<string | undefined>(items[0]?.id);

	const selected = items.find((item) => item.id === selectedId) ?? items[0];
	const showApproval = Boolean(onApprove && onRequestChanges);
	const fileCountLabel = `${items.length} ${items.length === 1 ? "arquivo" : "arquivos"}`;

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
				<Badge variant="outline" className="shrink-0">
					{fileCountLabel}
				</Badge>
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
