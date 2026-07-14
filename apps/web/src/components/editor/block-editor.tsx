import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { useHotkey } from "@/app/hooks/useHotkey";
import { useTheme } from "@/app/providers/useThemeContext";
import { cn } from "@/app/utils/cn";
import { ContextMenu, ContextMenuTrigger } from "@/components/context-menu";
import { notify } from "@/components/toast/notify";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { Loader2 } from "lucide-react";
import { TextSelection, type Selection } from "prosemirror-state";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BlockEditorContextMenu } from "./block-editor-context-menu";
import {
	editorSchema,
	type EditorBlock,
	type EditorBlockNoteEditor,
	type EditorPartialBlock,
} from "./block-editor-schema";
import { BlockEditorToolbar } from "./block-editor-toolbar";
import type { BlockEditorHandle, BlockEditorProps } from "./block-editor.types";
import "./block-editor.css";

const emptyDocument: EditorPartialBlock[] = [{ type: "paragraph", content: "" }];
const THEME_STORAGE_KEY = "vite-ui-theme";
const ATTACHMENT_URL_REGEX = /\/attachments\/(\d+)\/download/;

/** Percorre os blocos (incluindo filhos) coletando os ids de anexo referenciados. */
const collectAttachmentIds = (blocks: EditorBlock[]): Set<number> => {
	const ids = new Set<number>();
	const walk = (list: EditorBlock[]) => {
		for (const block of list) {
			const url = (block.props as { url?: string } | undefined)?.url;
			const match = typeof url === "string" ? url.match(ATTACHMENT_URL_REGEX) : null;
			if (match) ids.add(Number(match[1]));
			if (block.children?.length) walk(block.children);
		}
	};
	walk(blocks);
	return ids;
};

/** Blocos que referenciam um anexo específico (para remoção). */
const collectAttachmentBlocks = (blocks: EditorBlock[], attachmentId: number): EditorBlock[] => {
	const result: EditorBlock[] = [];
	const walk = (list: EditorBlock[]) => {
		for (const block of list) {
			const url = (block.props as { url?: string } | undefined)?.url;
			const match = typeof url === "string" ? url.match(ATTACHMENT_URL_REGEX) : null;
			if (match && Number(match[1]) === attachmentId) result.push(block);
			if (block.children?.length) walk(block.children);
		}
	};
	walk(blocks);
	return result;
};

const getResolvedBlockNoteTheme = (theme: "dark" | "light" | "system") => {
	const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
	const shouldFollowSystem = theme === "system" || storedTheme === "system";

	if (shouldFollowSystem) {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	}

	return theme === "dark" ? "dark" : "light";
};

const getFilesFromTransferItems = (items: DataTransferItemList | undefined) => {
	if (!items) return [];

	return Array.from(items)
		.filter((item) => item.kind === "file")
		.map((item) => item.getAsFile())
		.filter((file): file is File => file !== null);
};

const getFilesFromFileList = (files: FileList | undefined) => {
	if (!files) return [];

	return Array.from(files);
};

const hasTransferFiles = (dataTransfer: DataTransfer | null) => {
	if (!dataTransfer) return false;

	return Array.from(dataTransfer.types).includes("Files");
};

const moveCursorToDropPoint = (editor: EditorBlockNoteEditor, event: { clientX: number; clientY: number }) => {
	const position = editor.prosemirrorView.posAtCoords({
		left: event.clientX,
		top: event.clientY,
	});

	if (!position) return;

	const selection = TextSelection.near(editor.prosemirrorView.state.doc.resolve(position.pos));
	editor.prosemirrorView.dispatch(editor.prosemirrorView.state.tr.setSelection(selection));
};

let _lastDropTimestamp = -1;

// Sobe o arquivo e insere o bloco final no cursor. O feedback de progresso é o
// skeleton flutuante (estado de upload no componente), não um bloco de texto.
const uploadAndInsertFile = async (editor: EditorBlockNoteEditor, file: File) => {
	if (!editor.uploadFile) return;

	const isImage = file.type.startsWith("image/");
	const uploadResult = await editor.uploadFile(file);
	const normalizedUploadResult =
		typeof uploadResult === "string" ? { url: uploadResult, name: file.name } : uploadResult;
	// Imagens usam o bloco nativo (preview); arquivos usam o bloco de anexo customizado.
	const newBlock: EditorPartialBlock = isImage
		? { type: "image", props: { ...normalizedUploadResult, caption: "", showPreview: true } }
		: {
				type: "attachment",
				props: {
					url: normalizedUploadResult.url,
					name: normalizedUploadResult.name,
					size: file.size,
				},
			};

	const referenceBlock = editor.getTextCursorPosition().block;
	const insertedBlock =
		Array.isArray(referenceBlock.content) && referenceBlock.content.length === 0
			? editor.updateBlock(referenceBlock, newBlock)
			: editor.insertBlocks([newBlock], referenceBlock, "after")[0];

	editor.setTextCursorPosition(insertedBlock, "end");
	editor.focus();
};

export const BlockEditor = forwardRef<BlockEditorHandle, BlockEditorProps>(
	({ value = "", valueRich, editable = true, onChange, onChangeRich, onAttachmentRemoved, uploadFile }, ref) => {
		const { theme } = useTheme();
		const [blockNoteTheme, setBlockNoteTheme] = useState<"dark" | "light">(() => getResolvedBlockNoteTheme(theme));
		const readyToEmitChanges = useRef(false);
		const contextTargetBlock = useRef<EditorBlock | null>(null);
		const contextSavedSelection = useRef<Selection | null>(null);
		const loadedMarkdown = useRef<string | null>(null);
		const lastEmittedMarkdown = useRef<string | null>(null);
		const loadedRich = useRef<string | null>(null);
		const lastEmittedRich = useRef<string | null>(null);
		// Anexos referenciados no conteúdo na última emissão/carga — para detectar
		// remoções de blocos de anexo e disparar a exclusão correspondente.
		const previousAttachmentIds = useRef<Set<number>>(new Set());
		// Uploads em andamento (drop/paste/toolbar) — controla o skeleton flutuante.
		const [uploadingCount, setUploadingCount] = useState(0);
		const beginUpload = useCallback(() => setUploadingCount((count) => count + 1), []);
		const endUpload = useCallback(() => setUploadingCount((count) => Math.max(0, count - 1)), []);
		const uploadEnabled = Boolean(uploadFile);

		const editor = useCreateBlockNote({
			schema: editorSchema,
			initialContent: emptyDocument,
			uploadFile,
			defaultStyles: true,
			tables: {
				splitCells: true,
				cellBackgroundColor: true,
				cellTextColor: true,
				headers: true,
			},
			placeholders: {
				default: "Digite / para inserir blocos, imagens ou anexos...",
				emptyDocument: "Comece escrevendo ou digite / para inserir um bloco...",
			},
		});

		// Serializa o conteúdo atual e propaga ao estado externo. Emite o JSON rico
		// (fonte de verdade) e o markdown derivado (busca/validação/compat) a partir
		// do mesmo `editor.document`. Necessário também após edições programáticas
		// (upload de imagem/arquivo), que não disparam o onChange do BlockNoteView.
		const emitContent = useCallback(async () => {
			const rich = JSON.stringify(editor.document);
			// Não reemite quando o conteúdo não mudou (evita realimentar o ciclo de carga).
			if (rich === lastEmittedRich.current) return;

			// Detecta anexos removidos do conteúdo (bloco apagado) e propaga a exclusão.
			const currentAttachmentIds = collectAttachmentIds(editor.document);
			for (const id of previousAttachmentIds.current) {
				if (!currentAttachmentIds.has(id)) onAttachmentRemoved?.(id);
			}
			previousAttachmentIds.current = currentAttachmentIds;

			const markdown = await editor.blocksToMarkdownLossy(editor.document);
			lastEmittedRich.current = rich;
			lastEmittedMarkdown.current = markdown;
			onChangeRich?.(rich);
			onChange?.(markdown);
		}, [editor, onChange, onChangeRich, onAttachmentRemoved]);

		// Permite que a seção de Anexos remova o bloco correspondente do conteúdo.
		// Tira o id do set antes de emitir para não disparar onAttachmentRemoved de
		// novo (a exclusão do anexo já é feita pelo chamador).
		useImperativeHandle(
			ref,
			() => ({
				removeAttachmentBlock: (attachmentId: number) => {
					const blocks = collectAttachmentBlocks(editor.document, attachmentId);
					if (blocks.length === 0) return;
					previousAttachmentIds.current.delete(attachmentId);
					editor.removeBlocks(blocks);
					void emitContent();
				},
			}),
			[editor, emitContent],
		);

		// Atalhos de teclado para títulos: Ctrl+Alt+1/2/3 aplicam H1/H2/H3 e Ctrl+Alt+0
		// volta a parágrafo. Usa "set" idempotente (não toggle) para conviver sem conflito
		// com atalhos nativos do editor. Só age quando o cursor está dentro do editor.
		const applyBlockShortcut = useCallback(
			(event: KeyboardEvent) => {
				const dom = editor.prosemirrorView?.dom;
				if (!dom || !dom.contains(document.activeElement)) return;

				const block = editor.getTextCursorPosition().block;
				const digit = event.code.replace("Digit", "");
				const update =
					digit === "0"
						? { type: "paragraph" as const }
						: { type: "heading" as const, props: { level: Number(digit) as 1 | 2 | 3 } };

				editor.updateBlock(block, update);
				editor.focus();
			},
			[editor],
		);

		useHotkey({ code: ["Digit1", "Digit2", "Digit3", "Digit0"], ctrl: true, alt: true }, applyBlockShortcut, {
			enabled: editable,
			ignoreWhenTyping: false,
			preventDefault: true,
		});

		const shellRef = useRef<HTMLDivElement>(null);

		useEffect(() => {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			const updateTheme = () => setBlockNoteTheme(getResolvedBlockNoteTheme(theme));

			updateTheme();
			mediaQuery.addEventListener("change", updateTheme);

			return () => mediaQuery.removeEventListener("change", updateTheme);
		}, [theme]);

		useEffect(() => {
			if (!editable) return;

			const preventFileNavigation = (event: globalThis.DragEvent) => {
				if (!hasTransferFiles(event.dataTransfer)) return;

				event.preventDefault();
			};

			window.addEventListener("dragover", preventFileNavigation);
			window.addEventListener("drop", preventFileNavigation);

			return () => {
				window.removeEventListener("dragover", preventFileNavigation);
				window.removeEventListener("drop", preventFileNavigation);
			};
		}, [editable]);

		// Intercepta drop e paste no document em capture — isso dispara ANTES de qualquer
		// listener do ProseMirror/BlockNote (inclusive os registrados em nível de document).
		// Handlers React e listeners no elemento filho não conseguem barrar o ProseMirror;
		// só document-capture garante prioridade absoluta. Sem uploadFile, vira no-op.
		useEffect(() => {
			const shell = shellRef.current;
			if (!shell || !editable || !uploadEnabled) return;

			const handleDrop = (event: globalThis.DragEvent) => {
				if (!shell.contains(event.target as Node)) return;
				if (!hasTransferFiles(event.dataTransfer)) return;
				if (event.timeStamp === _lastDropTimestamp) return;
				_lastDropTimestamp = event.timeStamp;

				const files = getFilesFromTransferItems(event.dataTransfer?.items);
				const fallbackFiles = files.length > 0 ? files : getFilesFromFileList(event.dataTransfer?.files ?? undefined);

				if (fallbackFiles.length === 0) return;

				event.preventDefault();
				event.stopPropagation();
				event.stopImmediatePropagation();
				moveCursorToDropPoint(editor, event);

				void (async () => {
					beginUpload();
					try {
						for (const file of fallbackFiles) {
							await uploadAndInsertFile(editor, file);
						}
						await emitContent();
					} finally {
						endUpload();
					}
				})().catch((error) => {
					notify.error(getApiErrorMessage(error, "Não foi possível inserir o arquivo no documento."));
				});
			};

			const handlePaste = (event: ClipboardEvent) => {
				if (!shell.contains(event.target as Node)) return;
				if (!event.clipboardData) return;

				const files = getFilesFromTransferItems(event.clipboardData.items);
				if (files.length === 0) return;

				event.preventDefault();
				event.stopPropagation();
				event.stopImmediatePropagation();

				void (async () => {
					beginUpload();
					try {
						for (const file of files) {
							await uploadAndInsertFile(editor, file);
						}
						await emitContent();
					} finally {
						endUpload();
					}
				})().catch((error) => {
					notify.error(getApiErrorMessage(error, "Não foi possível colar o arquivo no documento."));
				});
			};

			document.addEventListener("drop", handleDrop, { capture: true });
			document.addEventListener("paste", handlePaste, { capture: true });

			return () => {
				document.removeEventListener("drop", handleDrop, { capture: true });
				document.removeEventListener("paste", handlePaste, { capture: true });
			};
		}, [editable, editor, emitContent, beginUpload, endUpload, uploadEnabled]);

		// Captura mudanças de conteúdo direto do editor (API canônica do BlockNote),
		// em vez de depender do onChange do BlockNoteView. Garante que digitar marque
		// o documento como alterado e dispare o autosave.
		useEffect(() => {
			if (!editable) return;

			const unsubscribe = editor.onChange(() => {
				if (!readyToEmitChanges.current) return;
				void emitContent();
			});

			return () => unsubscribe?.();
		}, [editor, editable, emitContent]);

		// Carrega o conteúdo no editor preferindo o JSON rico (fonte de verdade,
		// sem perda); cai no parse de markdown para documentos legados (sem rich).
		// Evita recarregar quando o valor recebido foi o último emitido por nós.
		useEffect(() => {
			if (!editor) return;

			const hasRich = typeof valueRich === "string" && valueRich.trim() !== "";

			if (hasRich) {
				if (valueRich === loadedRich.current || valueRich === lastEmittedRich.current) {
					// Conteúdo já está no editor; garantir que o gate de emissão esteja aberto.
					// Necessário no React StrictMode, onde o cleanup da run anterior cancela o
					// setTimeout que abriria o gate, e a segunda run retorna aqui sem reabri-lo.
					readyToEmitChanges.current = true;
					return;
				}
			} else if (value === loadedMarkdown.current || value === lastEmittedMarkdown.current) {
				readyToEmitChanges.current = true;
				return;
			}

			let cancelled = false;

			const loadContent = async () => {
				readyToEmitChanges.current = false;

				try {
					const blocks: EditorPartialBlock[] = hasRich
						? (JSON.parse(valueRich as string) as EditorPartialBlock[])
						: value.trim()
							? await editor.tryParseMarkdownToBlocks(value)
							: emptyDocument;

					if (cancelled) return;

					editor.replaceBlocks(editor.document, blocks.length > 0 ? blocks : emptyDocument);
					previousAttachmentIds.current = collectAttachmentIds(editor.document);
					loadedRich.current = hasRich ? (valueRich as string) : null;
					loadedMarkdown.current = value;
				} catch {
					if (!cancelled) {
						editor.replaceBlocks(editor.document, emptyDocument);
						previousAttachmentIds.current = collectAttachmentIds(editor.document);
						loadedRich.current = hasRich ? (valueRich as string) : null;
						loadedMarkdown.current = value;
						notify.error("Não foi possível carregar o conteúdo do editor.");
					}
				} finally {
					window.setTimeout(() => {
						if (!cancelled) readyToEmitChanges.current = true;
					}, 0);
				}
			};

			void loadContent();

			return () => {
				cancelled = true;
			};
		}, [editor, value, valueRich]);

		return (
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div
						ref={shellRef}
						className="block-editor-shell relative"
						onContextMenu={(event) => {
							if (!editable) return;
							const pmSelection = editor.prosemirrorView.state.selection;
							if (pmSelection.empty) {
								moveCursorToDropPoint(editor, event);
							}
							contextTargetBlock.current = editor.getTextCursorPosition().block;
							contextSavedSelection.current = editor.prosemirrorView.state.selection;
						}}
						onDragOverCapture={(event) => {
							if (!editable || !uploadEnabled || !hasTransferFiles(event.dataTransfer)) return;
							event.preventDefault();
							event.dataTransfer.dropEffect = "copy";
						}}
					>
						{editable && (
							// display:contents — o wrapper não gera caixa, então a toolbar fica
							// como filha direta do shell (alto), dando "curso" para o sticky.
							<div className="kb-print-hide" style={{ display: "contents" }}>
								<BlockEditorToolbar
									editor={editor}
									uploading={uploadingCount > 0}
									uploadEnabled={uploadEnabled}
									onUploadStart={beginUpload}
									onUploadEnd={endUpload}
								/>
							</div>
						)}
						<BlockNoteView
							className={cn("block-editor min-h-[16rem] w-full", !editable && "block-editor-readonly")}
							editor={editor}
							theme={blockNoteTheme}
							editable={editable}
						/>
						{uploadingCount > 0 && (
							<div className="bg-card/95 absolute right-4 bottom-4 z-10 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg">
								<Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin" />
								<div className="space-y-1.5">
									<div className="bg-muted h-2 w-28 animate-pulse rounded" />
									<div className="bg-muted h-2 w-20 animate-pulse rounded" />
								</div>
							</div>
						)}
					</div>
				</ContextMenuTrigger>
				{editable && (
					<BlockEditorContextMenu
						editor={editor}
						uploadEnabled={uploadEnabled}
						getContextBlock={() => contextTargetBlock.current}
						restoreSelection={() => {
							const saved = contextSavedSelection.current;
							if (!saved) return;
							editor.prosemirrorView.dispatch(editor.prosemirrorView.state.tr.setSelection(saved));
							editor.focus();
						}}
					/>
				)}
			</ContextMenu>
		);
	},
);

BlockEditor.displayName = "BlockEditor";
