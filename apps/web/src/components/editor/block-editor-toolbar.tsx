import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { cn } from "@/app/utils/cn";
import { Button } from "@/components/button";
import { notify } from "@/components/toast/notify";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";
import {
	Bold,
	Code,
	Heading1,
	Heading2,
	Heading3,
	Image,
	Italic,
	Link,
	List,
	ListChecks,
	ListOrdered,
	Loader2,
	Paperclip,
	Quote,
	Redo2,
	Slash,
	Strikethrough,
	Table,
	Undo2,
} from "lucide-react";
import React, { useRef, type ReactNode } from "react";
import type { EditorBlockNoteEditor, EditorPartialBlock } from "./block-editor-schema";

type BlockEditorToolbarProps = {
	editor: EditorBlockNoteEditor;
	/** Há upload em andamento (controla spinner/desabilita os botões de arquivo). */
	uploading: boolean;
	/** Habilita os botões de inserir imagem/anexo (depende de haver uploadFile). */
	uploadEnabled: boolean;
	onUploadStart: () => void;
	onUploadEnd: () => void;
};

const keepEditorFocus = (e: React.MouseEvent, editor: EditorBlockNoteEditor) => {
	e.preventDefault();
	editor.focus();
};

export const BlockEditorToolbar = ({
	editor,
	uploading,
	uploadEnabled,
	onUploadStart,
	onUploadEnd,
}: BlockEditorToolbarProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const imageInputRef = useRef<HTMLInputElement>(null);

	const updateCurrentBlock = (type: string, props?: Record<string, unknown>) => {
		const block = editor.getTextCursorPosition().block;
		editor.updateBlock(block, (props ? { type, props } : { type }) as EditorPartialBlock);
		editor.focus();
	};

	const uploadSelectedFile = async (file: File | undefined) => {
		if (!file || !editor.uploadFile) return;

		const isImage = file.type.startsWith("image/");
		onUploadStart();
		try {
			const result = await editor.uploadFile(file);
			const uploadResult = typeof result === "string" ? { url: result, name: file.name } : result;
			// Imagens: bloco nativo (preview). Arquivos: bloco de anexo customizado.
			const newBlock: EditorPartialBlock = isImage
				? { type: "image", props: { ...uploadResult, caption: "", showPreview: true } }
				: { type: "attachment", props: { url: uploadResult.url, name: uploadResult.name, size: file.size } };
			const referenceBlock = editor.getTextCursorPosition().block;
			const insertedBlock =
				Array.isArray(referenceBlock.content) && referenceBlock.content.length === 0
					? editor.updateBlock(referenceBlock, newBlock)
					: editor.insertBlocks([newBlock], referenceBlock, "after")[0];
			editor.setTextCursorPosition(insertedBlock, "end");
		} catch (error) {
			notify.error(getApiErrorMessage(error, "Não foi possível enviar o arquivo."));
		} finally {
			onUploadEnd();
			editor.focus();
		}
	};

	const insertTable = () => {
		const block = editor.getTextCursorPosition().block;

		editor.insertBlocks(
			[
				{
					type: "table",
					content: {
						type: "tableContent",
						columnWidths: [undefined, undefined, undefined],
						headerRows: 1,
						rows: [{ cells: ["", "", ""] }, { cells: ["", "", ""] }, { cells: ["", "", ""] }],
					},
				},
			],
			block,
			"after",
		);
		editor.focus();
	};

	return (
		<TooltipProvider>
			<div className="block-editor-toolbar">
				<ToolbarButton editor={editor} title="Comandos" shortcut="/" onClick={() => editor.openSuggestionMenu("/")}>
					<Slash className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarDivider />
				<ToolbarButton
					editor={editor}
					title="Título 1"
					shortcut="Ctrl+Alt+1"
					onClick={() => updateCurrentBlock("heading", { level: 1 })}
				>
					<Heading1 className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					title="Título 2"
					shortcut="Ctrl+Alt+2"
					onClick={() => updateCurrentBlock("heading", { level: 2 })}
				>
					<Heading2 className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					title="Título 3"
					shortcut="Ctrl+Alt+3"
					onClick={() => updateCurrentBlock("heading", { level: 3 })}
				>
					<Heading3 className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarDivider />
				<ToolbarButton
					editor={editor}
					title="Negrito"
					shortcut="Ctrl+B"
					onClick={() => editor.toggleStyles({ bold: true })}
				>
					<Bold className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					title="Itálico"
					shortcut="Ctrl+I"
					onClick={() => editor.toggleStyles({ italic: true })}
				>
					<Italic className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					title="Tachado"
					shortcut="Ctrl+Shift+S"
					onClick={() => editor.toggleStyles({ strike: true })}
				>
					<Strikethrough className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					title="Código"
					shortcut="Ctrl+E"
					onClick={() => editor.toggleStyles({ code: true })}
				>
					<Code className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					title="Link"
					shortcut="Ctrl+K"
					onClick={() => {
						editor.createLink("https://");
						editor.focus();
					}}
				>
					<Link className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarDivider />
				<ToolbarButton
					editor={editor}
					title="Lista"
					shortcut="- + espaço"
					onClick={() => updateCurrentBlock("bulletListItem")}
				>
					<List className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					title="Lista numerada"
					shortcut="1. + espaço"
					onClick={() => updateCurrentBlock("numberedListItem")}
				>
					<ListOrdered className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					title="Checklist"
					shortcut="[ ] + espaço"
					onClick={() => updateCurrentBlock("checkListItem")}
				>
					<ListChecks className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton
					editor={editor}
					title="Citação"
					shortcut='"> " + espaço'
					onClick={() => updateCurrentBlock("quote")}
				>
					<Quote className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton editor={editor} title="Tabela" shortcut="Via /" onClick={insertTable}>
					<Table className="h-4 w-4" />
				</ToolbarButton>
				{uploadEnabled && (
					<>
						<ToolbarDivider />
						<ToolbarButton
							title={uploading ? "Enviando..." : "Imagem"}
							shortcut="Via /"
							disabled={uploading}
							onClick={() => imageInputRef.current?.click()}
						>
							{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
						</ToolbarButton>
						<ToolbarButton
							title={uploading ? "Enviando..." : "Anexo"}
							shortcut="Via /"
							disabled={uploading}
							onClick={() => fileInputRef.current?.click()}
						>
							{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
						</ToolbarButton>
					</>
				)}
				<ToolbarDivider />
				<ToolbarButton editor={editor} title="Desfazer" shortcut="Ctrl+Z" onClick={() => editor.undo()}>
					<Undo2 className="h-4 w-4" />
				</ToolbarButton>
				<ToolbarButton editor={editor} title="Refazer" shortcut="Ctrl+Y" onClick={() => editor.redo()}>
					<Redo2 className="h-4 w-4" />
				</ToolbarButton>
				{uploadEnabled && (
					<>
						<input
							ref={imageInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(event) => {
								void uploadSelectedFile(event.target.files?.[0]);
								event.target.value = "";
							}}
						/>
						<input
							ref={fileInputRef}
							type="file"
							className="hidden"
							onChange={(event) => {
								void uploadSelectedFile(event.target.files?.[0]);
								event.target.value = "";
							}}
						/>
					</>
				)}
			</div>
		</TooltipProvider>
	);
};

type ToolbarButtonProps = {
	title: string;
	shortcut?: string;
	editor?: EditorBlockNoteEditor;
	onClick: () => void;
	disabled?: boolean;
	children: ReactNode;
};

const ToolbarButton = ({ title, shortcut, editor, onClick, disabled, children }: ToolbarButtonProps) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				disabled={disabled}
				className={cn("text-muted-foreground hover:text-foreground h-8 w-8")}
				onMouseDown={editor ? (e) => keepEditorFocus(e, editor) : undefined}
				onClick={onClick}
			>
				{children}
			</Button>
		</TooltipTrigger>
		<TooltipContent side="bottom" className="flex flex-col items-center gap-0.5">
			<span>{title}</span>
			{shortcut && <span className="text-muted-foreground">{shortcut}</span>}
		</TooltipContent>
	</Tooltip>
);

const ToolbarDivider = () => <span className="bg-border mx-1 h-5 w-px shrink-0" />;
