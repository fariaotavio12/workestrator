import type { CSSProperties } from "react";
import { cn } from "@/app/utils/cn";

/**
 * Assets de cenário (pixel-art) do escritório vivem em /public/assets. Usa `BASE_URL` (não string crua
 * começando com "/") porque no build Electron o app é servido via `file://` — ver `characters.ts`.
 */
const base = () => import.meta.env.BASE_URL;

export const furnitureSrc = (name: string): string => `${base()}assets/furniture/${name}.png`;

/**
 * Mesa de trabalho com monitor, na orientação "up" (verso do monitor virado pra câmera, tela virada
 * pra quem senta atrás) — assim o personagem fica de frente pra nós e "olhando" pra própria tela.
 */
export const deskSrc = (): string => `${base()}assets/desks/desktop_set_black_up.png`;

type PixelSpriteProps = {
	src: string;
	/** Largura de exibição em px (o sprite nativo é reescalado com nitidez pixelada). */
	width: number;
	height: number;
	className?: string;
	style?: CSSProperties;
	alt?: string;
};

/** Renderiza um sprite pixel-art cru (sem moldura), reescalado com `image-rendering: pixelated`. */
export const PixelSprite = ({ src, width, height, className, style, alt = "" }: PixelSpriteProps) => (
	<img
		src={src}
		width={width}
		height={height}
		draggable={false}
		alt={alt}
		className={cn("pointer-events-none block select-none", className)}
		style={{ imageRendering: "pixelated", ...style }}
	/>
);
