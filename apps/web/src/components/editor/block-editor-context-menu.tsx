import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
} from "@/components/context-menu";
import {
	Bold,
	ChevronRight,
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
	Paperclip,
	Pilcrow,
	Quote,
	Redo2,
	Strikethrough,
	Table,
	Undo2,
} from "lucide-react";
import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { EditorBlock, EditorBlockNoteEditor, EditorPartialBlock } from "./block-editor-schema";

type Props = {
	editor: EditorBlockNoteEditor;
	getContextBlock: () => EditorBlock | null;
	restoreSelection: () => void;
	/** Habilita os itens de inserir imagem/anexo (depende de haver uploadFile). */
	uploadEnabled: boolean;
};

export const BlockEditorContextMenu = ({ editor, getContextBlock, restoreSelection, uploadEnabled }: Props) => {
	const imageInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const resolveBlock = () => getContextBlock() ?? editor.getTextCursorPosition().block;

	const updateBlock = (type: string, props?: Record<string, unknown>) => {
		const block = resolveBlock();
		editor.updateBlock(block, (props ? { type, props } : { type }) as EditorPartialBlock);
		editor.focus();
	};

	const uploadAndInsert = async (file: File | undefined) => {
		if (!file || !editor.uploadFile) return;
		const result = await editor.uploadFile(file);
		const uploadResult = typeof result === "string" ? { url: result, name: file.name } : result;
		const block = resolveBlock();
		const blockType = file.type.startsWith("image/") ? "image" : "file";
		editor.insertBlocks(
			[{ type: blockType, props: { ...uploadResult, caption: "", showPreview: true } } as EditorPartialBlock],
			block,
			"after",
		);
		editor.focus();
	};

	const insertTable = () => {
		const block = resolveBlock();
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
		<>
			<ContextMenuContent className="w-52">
				<ContextMenuLabel>Formatação de texto</ContextMenuLabel>
				<MenuItem
					icon={<Bold className="h-4 w-4" />}
					shortcut="Ctrl+B"
					onSelect={() => {
						restoreSelection();
						editor.toggleStyles({ bold: true });
					}}
				>
					Negrito
				</MenuItem>
				<MenuItem
					icon={<Italic className="h-4 w-4" />}
					shortcut="Ctrl+I"
					onSelect={() => {
						restoreSelection();
						editor.toggleStyles({ italic: true });
					}}
				>
					Itálico
				</MenuItem>
				<MenuItem
					icon={<Strikethrough className="h-4 w-4" />}
					shortcut="Ctrl+Shift+S"
					onSelect={() => {
						restoreSelection();
						editor.toggleStyles({ strike: true });
					}}
				>
					Tachado
				</MenuItem>
				<MenuItem
					icon={<Code className="h-4 w-4" />}
					shortcut="Ctrl+E"
					onSelect={() => {
						restoreSelection();
						editor.toggleStyles({ code: true });
					}}
				>
					Código
				</MenuItem>
				<MenuItem
					icon={<Link className="h-4 w-4" />}
					shortcut="Ctrl+K"
					onSelect={() => {
						restoreSelection();
						editor.createLink("https://");
						editor.focus();
					}}
				>
					Link
				</MenuItem>

				<ContextMenuSeparator />

				<ContextMenuSub>
					<ContextMenuSubTrigger className="flex items-center gap-2 text-sm">
						<ChevronRight className="text-muted-foreground h-4 w-4" />
						Transformar em
					</ContextMenuSubTrigger>
					<ContextMenuSubContent className="w-44">
						<MenuItem icon={<Pilcrow className="h-4 w-4" />} onSelect={() => updateBlock("paragraph")}>
							Parágrafo
						</MenuItem>
						<MenuItem icon={<Heading1 className="h-4 w-4" />} shortcut="Ctrl+Alt+1" onSelect={() => updateBlock("heading", { level: 1 })}>
							Título 1
						</MenuItem>
						<MenuItem icon={<Heading2 className="h-4 w-4" />} shortcut="Ctrl+Alt+2" onSelect={() => updateBlock("heading", { level: 2 })}>
							Título 2
						</MenuItem>
						<MenuItem icon={<Heading3 className="h-4 w-4" />} shortcut="Ctrl+Alt+3" onSelect={() => updateBlock("heading", { level: 3 })}>
							Título 3
						</MenuItem>
						<ContextMenuSeparator />
						<MenuItem icon={<List className="h-4 w-4" />} onSelect={() => updateBlock("bulletListItem")}>
							Lista
						</MenuItem>
						<MenuItem icon={<ListOrdered className="h-4 w-4" />} onSelect={() => updateBlock("numberedListItem")}>
							Lista numerada
						</MenuItem>
						<MenuItem icon={<ListChecks className="h-4 w-4" />} onSelect={() => updateBlock("checkListItem")}>
							Checklist
						</MenuItem>
						<MenuItem icon={<Quote className="h-4 w-4" />} onSelect={() => updateBlock("quote")}>
							Citação
						</MenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>

				<ContextMenuSeparator />

				<ContextMenuLabel>Inserir</ContextMenuLabel>
				<MenuItem icon={<Table className="h-4 w-4" />} onSelect={insertTable}>
					Tabela
				</MenuItem>
				{uploadEnabled && (
					<>
						<MenuItem icon={<Image className="h-4 w-4" />} onSelect={() => imageInputRef.current?.click()}>
							Imagem
						</MenuItem>
						<MenuItem icon={<Paperclip className="h-4 w-4" />} onSelect={() => fileInputRef.current?.click()}>
							Anexo
						</MenuItem>
					</>
				)}

				<ContextMenuSeparator />

				<MenuItem icon={<Undo2 className="h-4 w-4" />} shortcut="Ctrl+Z" onSelect={() => editor.undo()}>
					Desfazer
				</MenuItem>
				<MenuItem icon={<Redo2 className="h-4 w-4" />} shortcut="Ctrl+Y" onSelect={() => editor.redo()}>
					Refazer
				</MenuItem>
			</ContextMenuContent>

			{uploadEnabled &&
				createPortal(
					<>
						<input
							ref={imageInputRef}
							type="file"
							accept="image/*"
							className="hidden"
							onChange={(event) => {
								void uploadAndInsert(event.target.files?.[0]);
								event.target.value = "";
							}}
						/>
						<input
							ref={fileInputRef}
							type="file"
							className="hidden"
							onChange={(event) => {
								void uploadAndInsert(event.target.files?.[0]);
								event.target.value = "";
							}}
						/>
					</>,
					document.body,
				)}
		</>
	);
};

type MenuItemProps = {
	icon: ReactNode;
	shortcut?: string;
	onSelect: () => void;
	children: ReactNode;
};

const MenuItem = ({ icon, shortcut, onSelect, children }: MenuItemProps) => (
	<ContextMenuItem className="flex items-center gap-2 text-sm" onSelect={onSelect}>
		<span className="text-muted-foreground">{icon}</span>
		{children}
		{shortcut && <ContextMenuShortcut>{shortcut}</ContextMenuShortcut>}
	</ContextMenuItem>
);
