import type { ReactNode } from "react";
import { cn } from "@/app/utils/cn";

type Props = { children: ReactNode; className?: string };

/**
 * Escritorio top-down: chao de madeira (repeat) e parede fechada. Sem objetos decorativos — foco
 * total no coordenador e nas bancadas dos agents, renderizados por cima no `OfficeCanvas`.
 */
export const OfficeFloor = ({ children, className }: Props) => (
	<div
		className={cn("relative h-full min-h-[38rem] w-full overflow-hidden rounded-xl border shadow-sm", className)}
		style={{
			backgroundColor: "#3a2416",
			backgroundImage: `url(${import.meta.env.BASE_URL}floor.png)`,
			backgroundRepeat: "repeat",
			backgroundSize: "150px 150px",
			imageRendering: "pixelated",
		}}
	>
		{/* Vinheta para dar profundidade de "sala". */}
		<div
			className="pointer-events-none absolute inset-0"
			style={{ boxShadow: "inset 0 0 130px 28px rgba(0,0,0,0.45)" }}
		/>

		{/* Parede fechada (moldura do comodo) — madeira escura. */}
		<div className="absolute inset-x-3 top-3 h-3 rounded-sm" style={{ backgroundColor: "#2a1a0e", boxShadow: "inset 0 -1px 0 rgba(255,196,120,0.35)" }} />
		<div className="absolute inset-y-3 left-3 w-3 rounded-sm" style={{ backgroundColor: "#2a1a0e", boxShadow: "inset -1px 0 0 rgba(255,196,120,0.35)" }} />
		<div className="absolute inset-y-3 right-3 w-3 rounded-sm" style={{ backgroundColor: "#2a1a0e", boxShadow: "inset 1px 0 0 rgba(255,196,120,0.35)" }} />
		<div className="absolute inset-x-3 bottom-3 h-3 rounded-sm" style={{ backgroundColor: "#2a1a0e", boxShadow: "inset 0 1px 0 rgba(255,196,120,0.35)" }} />

		{children}
	</div>
);
