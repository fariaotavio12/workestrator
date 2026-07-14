import { api } from "@/app/api/clients/api";
import { getApiErrorMessage } from "@/app/utils/getApiErrorMessage";
import { IconFile } from "@/components/file/iconFile";
import { notify } from "@/components/toast/notify";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import type { MouseEvent } from "react";
import { editorImageBlock } from "./block-editor-image-block";

const BYTES_PER_UNIT = 1024;
const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * Formata um tamanho em bytes para a unidade legível mais próxima.
 * @param bytes Quantidade de bytes.
 * @returns Tamanho legível (ex.: "1.5 MB").
 */
const formatBytes = (bytes: number): string => {
	if (!bytes || bytes <= 0) return "0 B";

	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(BYTES_PER_UNIT)), SIZE_UNITS.length - 1);
	const value = bytes / BYTES_PER_UNIT ** exponent;

	return `${value.toFixed(exponent === 0 ? 0 : 1)} ${SIZE_UNITS[exponent]}`;
};

/** Extrai um MIME aproximado a partir da extensão do nome do arquivo (para IconFile). */
const mimeFromFileName = (fileName: string): string | undefined => {
	const extension = fileName.split(".").pop()?.toLowerCase();
	if (!extension) return undefined;

	const map: Record<string, string> = {
		pdf: "application/pdf",
		txt: "text/plain",
		csv: "text/csv",
		json: "application/json",
		xml: "application/xml",
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		gif: "image/gif",
		webp: "image/webp",
		svg: "image/svg+xml",
		doc: "application/msword",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		xls: "application/vnd.ms-excel",
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		zip: "application/zip",
		rar: "application/x-rar-compressed",
	};

	return map[extension];
};

/**
 * Baixa o anexo do bloco. URLs `data:`/`blob:` usam navegação direta do `<a>`;
 * demais URLs (endpoints autenticados) são baixadas como blob via cliente
 * autenticado (envia o Bearer), pois a navegação direta do `<a>` não autentica.
 * @param url URL do anexo.
 * @param fileName Nome de download sugerido.
 */
const downloadAttachment = async (url: string, fileName: string) => {
	if (/^(data|blob):/i.test(url)) {
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		link.remove();
		return;
	}

	const response = await api.get<Blob>(url, { responseType: "blob" });
	const blobUrl = window.URL.createObjectURL(response.data);
	const link = document.createElement("a");

	link.href = blobUrl;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	window.URL.revokeObjectURL(blobUrl);
};

/**
 * Bloco de anexo customizado: substitui o bloco "file" nativo para arquivos
 * (não-imagem), com a aparência de ícone do tipo + nome + tamanho. Imagens
 * continuam no bloco "image" nativo (preview).
 *
 * Serializa para markdown/HTML como um link `[nome](url)`; a fidelidade do
 * bloco (tipo/props) é preservada pelo contentRich (JSON).
 */
const attachmentBlock = createReactBlockSpec(
	{
		type: "attachment",
		propSchema: {
			url: { default: "" },
			name: { default: "" },
			size: { default: 0 },
		},
		content: "none",
	},
	{
		render: ({ block }) => {
			const { url, name, size } = block.props;
			// A navegação direta do <a> não autentica endpoints protegidos, então
			// baixamos como blob autenticado. O href continua para semântica/menu.
			const handleDownload = (event: MouseEvent<HTMLAnchorElement>) => {
				event.preventDefault();
				if (!url) return;
				downloadAttachment(url, name || "anexo").catch((error) =>
					notify.error(getApiErrorMessage(error, "Não foi possível baixar o anexo.")),
				);
			};
			return (
				<a
					href={url || undefined}
					onClick={handleDownload}
					rel="noopener noreferrer"
					contentEditable={false}
					draggable={false}
					className="bg-card hover:bg-muted/50 my-1 flex items-center gap-3 rounded-md border p-3 text-sm no-underline transition-colors"
				>
					<IconFile type={mimeFromFileName(name)} size="sm" />
					<span className="text-foreground min-w-0 flex-1 truncate">{name || "Anexo"}</span>
					{size > 0 && <span className="text-muted-foreground shrink-0 text-xs">{formatBytes(size)}</span>}
				</a>
			);
		},
		toExternalHTML: ({ block }) => <a href={block.props.url}>{block.props.name || "anexo"}</a>,
	},
)();

/** Schema do editor: blocos padrão + blocos de anexo e imagem customizados. */
export const editorSchema = BlockNoteSchema.create({
	blockSpecs: {
		...defaultBlockSpecs,
		image: editorImageBlock,
		attachment: attachmentBlock,
	},
});

export type EditorBlockNoteEditor = typeof editorSchema.BlockNoteEditor;
export type EditorBlock = typeof editorSchema.Block;
export type EditorPartialBlock = typeof editorSchema.PartialBlock;
