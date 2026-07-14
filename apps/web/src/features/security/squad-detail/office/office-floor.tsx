import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/app/utils/cn";
import { furnitureSrc, PixelSprite } from "./office-sprites";

type Props = { children: ReactNode; className?: string };

/** Peça de decoração posicionada em % — fica na camada de fundo (atrás dos atores). */
const Decor = ({
	name,
	width,
	height,
	style,
	className,
}: {
	name: string;
	width: number;
	height: number;
	style: CSSProperties;
	className?: string;
}) => (
	<PixelSprite
		src={furnitureSrc(name)}
		width={width}
		height={height}
		className={cn("absolute drop-shadow-[0_3px_2px_rgba(0,0,0,0.18)]", className)}
		style={style}
	/>
);

/**
 * Piso do escritório: um cômodo top-down com chão neutro (tokens do app) e decoração pixel-art
 * (plantas, sofá, estante, bebedouro). Os atores/mesas se posicionam em % por cima (ver `office-geometry`).
 */
export const OfficeFloor = ({ children, className }: Props) => (
	<div
		className={cn(
			"bg-muted/40 relative h-full min-h-[34rem] w-full overflow-hidden rounded-xl border",
			"[background-image:radial-gradient(circle_at_50%_-10%,var(--card),transparent_70%)]",
			className,
		)}
	>
		{/* Parede do fundo (rodapé) — dá o limite do cômodo, em superfície neutra. */}
		<div className="bg-card/70 border-border absolute inset-x-0 top-0 h-[14%] border-b" />

		{/* Decoração de parede (topo). */}
		<Decor name="window_blinds_open" width={76} height={76} style={{ left: "7%", top: "1%" }} />
		<Decor name="bookshelf" width={150} height={75} style={{ right: "6%", top: "1%" }} />

		{/* Tapete sob a estação do coordenador (fica atrás dele). */}
		<Decor
			name="fancy_rug_wide"
			width={224}
			height={128}
			className="opacity-90 drop-shadow-none"
			style={{ left: "calc(50% - 112px)", top: "12%" }}
		/>

		{/* Bebedouro na parede direita. */}
		<Decor name="water_cooler_better" width={38} height={76} style={{ right: "3%", top: "24%" }} />

		{/* Área de descanso no canto inferior esquerdo. */}
		<Decor name="couch_tan_down" width={92} height={46} style={{ left: "2%", bottom: "16%" }} />
		<Decor name="coffee_table" width={70} height={35} style={{ left: "4%", bottom: "6%" }} />

		{/* Plantas nos cantos para aquecer o ambiente. */}
		<Decor name="monstera" width={44} height={88} style={{ right: "4%", bottom: "4%" }} />
		<Decor name="plant1" width={40} height={80} style={{ left: "1%", top: "20%" }} />

		{children}
	</div>
);
