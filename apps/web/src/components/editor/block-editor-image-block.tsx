import { Typography } from "@/components/typography";
import { createImageBlockConfig, imageParse } from "@blocknote/core";
import { createReactBlockSpec, ImageToExternalHTML, ResizableFileBlockWrapper, useResolveUrl } from "@blocknote/react";
import { Image as ImageIcon, ImageOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

type ImagePreviewProps = {
	url: string;
	name: string;
	caption: string;
};

/** Cartão exibido quando a imagem falha ao carregar, no lugar do ícone quebrado do navegador. */
const BrokenImage = ({ url, name, caption }: ImagePreviewProps) => {
	const detail = caption || name || "O arquivo não foi encontrado no servidor.";

	return (
		<div
			contentEditable={false}
			className="border-border bg-muted/30 my-1 flex max-w-md items-start gap-3 rounded-lg border border-dashed px-4 py-3"
		>
			<span className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
				<ImageOff className="h-4 w-4" />
			</span>
			<div className="min-w-0 flex-1">
				<Typography variant="body-sm" as="p" className="text-foreground font-medium">
					Imagem indisponível
				</Typography>
				<Typography variant="body-sm" as="p" className="text-muted-foreground truncate text-xs">
					{detail}
				</Typography>
				{url && <span className="text-muted-foreground/70 mt-0.5 block truncate text-[11px]">{url}</span>}
			</div>
		</div>
	);
};

/** Preview da imagem; troca para o cartão de indisponível em caso de erro de carregamento. */
const ImagePreview = ({ url, name, caption }: ImagePreviewProps) => {
	const resolved = useResolveUrl(url);
	const [erroredUrl, setErroredUrl] = useState<string | null>(null);

	if (erroredUrl === url || resolved.loadingState === "error") {
		return <BrokenImage url={url} name={name} caption={caption} />;
	}

	const src = resolved.loadingState === "loading" ? url : resolved.downloadUrl;

	return (
		<img
			className="bn-visual-media"
			src={src}
			alt={caption || "Imagem"}
			contentEditable={false}
			draggable={false}
			onError={() => setErroredUrl(url)}
		/>
	);
};

/** Bloco de imagem custom: bloco nativo do BlockNote com preview tolerante a falhas. */
export const editorImageBlock = createReactBlockSpec(createImageBlockConfig, (config) => ({
	meta: { fileBlockAccept: ["image/*"] },
	render: (props) => {
		// Cast ao tipo do wrapper: os genéricos "image"/"file" não casam (o BlockNote faz o mesmo).
		const wrapperProps = props as unknown as ComponentProps<typeof ResizableFileBlockWrapper>;
		return (
			<ResizableFileBlockWrapper {...wrapperProps} buttonIcon={<ImageIcon className="h-5 w-5" />}>
				<ImagePreview url={props.block.props.url} name={props.block.props.name} caption={props.block.props.caption} />
			</ResizableFileBlockWrapper>
		);
	},
	parse: imageParse(config),
	toExternalHTML: ImageToExternalHTML,
	runsBefore: ["file"],
}))();
