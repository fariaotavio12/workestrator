import { Loader2, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Typography } from "@/components/typography";
import { AnimatedPerson } from "./animated-person";
import { COORDINATOR_PERSON, officeProp } from "./office-assets";

type Props = {
	position: { x: number; y: number };
	model: string;
	thinking: boolean;
	onClick?: () => void;
};

/**
 * Caixa da estação (largura x altura) e posição de cada peça, em px, com origem no canto superior
 * esquerdo — mesmo padrão de `workstation.tsx`, numa estação maior para a mesa/monitores do gerente.
 */
// As peças do gerente são quase quadradas (~136x123), então a mesa cresce muito em altura quando
// larga — por isso ela fica menor e mais baixa que a pessoa, senão enterra o personagem. A pessoa
// (49x90, cabeça no topo do tile) fica alta o bastante para aparecer acima da mesa e dos monitores.
const BOX = { w: 190, h: 210 };
type Layer = { file: string; cx: number; cy: number; w: number; z: number };
const LAYERS: Layer[] = [
	{ file: "18_manager-chair-teal", cx: 95, cy: 80, w: 98, z: 10 },
	// pessoa entra aqui (z: 20)
	{ file: "03_manager-desk-empty", cx: 95, cy: 146, w: 150, z: 30 },
	{ file: "20_manager-monitor-left", cx: 74, cy: 116, w: 52, z: 40 },
	{ file: "21_manager-monitor-right", cx: 116, cy: 116, w: 52, z: 40 },
];
const PERSON = { cx: 95, cy: 80, w: 60, z: 20 };

const layerStyle = (cx: number, cy: number, w: number, z: number): CSSProperties => ({
	position: "absolute",
	left: cx,
	top: cy,
	width: w,
	transform: "translate(-50%, -50%)",
	imageRendering: "pixelated",
	zIndex: z,
});

/**
 * Estação transparente do coordenador — mesa e monitores do gerente montados a partir das peças
 * pixel-art, com o personagem navy (`COORDINATOR_PERSON`) sentado e animado. Reusa o balão
 * "decidindo…" e o spotlight pulsante da versão antiga (`coordinator-desk.tsx`).
 */
export const CoordinatorStation = ({ position, model, thinking, onClick }: Props) => {
	const reducedMotion = useReducedMotion();

	return (
		<button
			type="button"
			onClick={onClick}
			style={{ left: `${position.x}%`, top: `${position.y}%` }}
			aria-label={`Coordenador — ${thinking ? "decidindo o próximo passo" : "aguardando"}`}
			className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus-visible:outline-none"
		>
			<span className="relative block" style={{ width: BOX.w, height: BOX.h }}>
				{/* Balão "decidindo…". */}
				<AnimatePresence>
					{thinking && (
						<motion.span
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 6 }}
							transition={{ duration: reducedMotion ? 0 : 0.18 }}
							className="bg-primary text-primary-foreground absolute bottom-[88%] left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap"
						>
							<Loader2 className="size-3 animate-spin" />
							<Typography variant="caption" as="span">
								decidindo…
							</Typography>
						</motion.span>
					)}
				</AnimatePresence>

				{/* Spotlight no chão enquanto pensando. */}
				<motion.span
					aria-hidden
					className="bg-primary/30 absolute bottom-6 left-1/2 h-6 w-32 -translate-x-1/2 rounded-[50%] blur-lg"
					style={{ zIndex: 5 }}
					animate={thinking && !reducedMotion ? { opacity: [0.5, 0.95, 0.5], scale: [1, 1.12, 1] } : { opacity: 0 }}
					transition={
						thinking && !reducedMotion ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }
					}
				/>

				{LAYERS.filter((l) => l.z < PERSON.z).map((l) => (
					<img
						key={l.file}
						src={officeProp(l.file)}
						alt=""
						draggable={false}
						style={layerStyle(l.cx, l.cy, l.w, l.z)}
						className="pointer-events-none select-none"
					/>
				))}

				<AnimatedPerson
					personKey={COORDINATOR_PERSON}
					pose="seated"
					anim="idle"
					displayWidth={PERSON.w}
					className="pointer-events-none select-none"
					style={layerStyle(PERSON.cx, PERSON.cy, PERSON.w, PERSON.z)}
				/>

				{LAYERS.filter((l) => l.z > PERSON.z).map((l) => (
					<img
						key={l.file}
						src={officeProp(l.file)}
						alt=""
						draggable={false}
						style={layerStyle(l.cx, l.cy, l.w, l.z)}
						className="pointer-events-none select-none"
					/>
				))}
			</span>

			{/* Rótulo. */}
			<span className="-mt-2 flex flex-col items-center rounded-md bg-black/30 px-2.5 py-0.5 backdrop-blur-[1px]">
				<span className="flex items-center gap-1">
					<span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden />
					<Typography variant="caption" as="span" className="font-medium text-white">
						Coordenador
					</Typography>
				</span>
				<span className="flex items-center gap-1 text-white/75">
					<Sparkles className="size-2.5 shrink-0" />
					<Typography variant="caption" as="span" className="max-w-28 truncate font-mono">
						{model}
					</Typography>
				</span>
			</span>
		</button>
	);
};
