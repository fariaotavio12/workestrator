import { Rotas } from "@/app/routing/variables";
import { ConfirmDialog } from "@/components/orchestrator";
import { Badge, Button, EmptyState, ErrorState, FileUI, PageHeader, Typography, notify } from "@/components";
import {
	useCollectionsQuery,
	useDeleteDocument,
	useDocumentsQuery,
	useUploadDocument,
	type DocumentStatus,
	type KnowledgeDocument,
} from "@/features/security/knowledge/api";
import { ArrowLeft, FileText, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const ACCEPTED = [".pdf", ".docx", ".doc", ".pptx", ".txt", ".md", ".csv", ".html"];

const STATUS_META: Record<DocumentStatus, { label: string; variant: "secondary" | "success" | "warning" | "destructive" }> = {
	pending: { label: "Na fila", variant: "warning" },
	processing: { label: "Processando", variant: "warning" },
	ready: { label: "Pronto", variant: "success" },
	failed: { label: "Falhou", variant: "destructive" },
};

const formatBytes = (bytes: number) => {
	if (bytes < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (kb < 1024) return `${kb.toFixed(1)} KB`;
	return `${(kb / 1024).toFixed(1)} MB`;
};

export const PageKnowledgeDetail = () => {
	const navigate = useNavigate();
	const { id = "" } = useParams<{ id: string }>();
	const { data: collections = [] } = useCollectionsQuery();
	const collection = collections.find((c) => c.id === id);

	const { data: documents = [], isLoading, isError, refetch } = useDocumentsQuery(id);
	const uploadDocument = useUploadDocument(id);
	const deleteDocument = useDeleteDocument(id);
	const [toDelete, setToDelete] = useState<KnowledgeDocument | null>(null);

	const handleAddFiles = async (files: File[]) => {
		for (const file of files) {
			try {
				await uploadDocument.mutateAsync(file);
				notify.success(`"${file.name}" enviado — ingestão em andamento`);
			} catch {
				notify.error(`Falha ao enviar "${file.name}"`);
			}
		}
	};

	return (
		<div className="flex w-full flex-col gap-6">
			<PageHeader
				title={collection?.name ?? "Base de conhecimento"}
				description={collection?.description || "Envie documentos para esta base."}
				actions={
					<Button variant="outline" onClick={() => navigate(Rotas.protegidas.orchestrator.knowledge)}>
						<ArrowLeft />
						Voltar
					</Button>
				}
			/>

			<section className="flex flex-col gap-4 px-4">
				<FileUI.Input
					label="Enviar documento"
					placeholder="Clique ou arraste um arquivo"
					helperText="PDF, DOCX, PPTX, TXT, MD, CSV ou HTML."
					acceptedFileTypes={ACCEPTED}
					multiple
					maxFiles={10}
					disabled={uploadDocument.isPending}
					onAddFiles={handleAddFiles}
				/>

				{isError ? (
					<ErrorState message="Não foi possível carregar os documentos." onRetry={() => refetch()} />
				) : !isLoading && documents.length === 0 ? (
					<EmptyState
						icon={FileText}
						title="Nenhum documento"
						message="Os documentos enviados aparecem aqui com o status da ingestão."
					/>
				) : (
					<ul className="flex flex-col gap-2">
						{documents.map((doc) => {
							const status = STATUS_META[doc.status];
							return (
								<li
									key={doc.id}
									className="border-border flex items-center gap-3 rounded-lg border px-4 py-3"
								>
									<div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
										{doc.status === "processing" || doc.status === "pending" ? (
											<Loader2 className="size-5 animate-spin" />
										) : (
											<FileText className="size-5" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<Typography variant="body-sm" className="truncate font-medium">
											{doc.filename}
										</Typography>
										<Typography variant="caption" className="text-muted-foreground">
											{formatBytes(doc.sizeBytes)}
											{doc.status === "ready" ? ` • ${doc.chunkCount} trecho(s)` : ""}
											{doc.status === "failed" && doc.errorMessage ? ` • ${doc.errorMessage}` : ""}
										</Typography>
									</div>
									<Badge variant={status.variant}>{status.label}</Badge>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										className="text-destructive"
										aria-label={`Excluir ${doc.filename}`}
										onClick={() => setToDelete(doc)}
									>
										<Trash2 />
									</Button>
								</li>
							);
						})}
					</ul>
				)}
			</section>

			<ConfirmDialog
				open={Boolean(toDelete)}
				onOpenChange={(next) => !next && setToDelete(null)}
				title="Excluir documento?"
				description={toDelete ? `"${toDelete.filename}" e seus trechos serão removidos da base.` : undefined}
				confirmLabel="Excluir"
				destructive
				onConfirm={async () => {
					if (!toDelete) return;
					await deleteDocument.mutateAsync(toDelete.id);
					notify.success("Documento excluído");
					setToDelete(null);
				}}
			/>
		</div>
	);
};
