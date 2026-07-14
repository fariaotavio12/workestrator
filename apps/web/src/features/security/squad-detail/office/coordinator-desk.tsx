import { Loader2, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Typography } from "@/components/typography";
import { COORDINATOR_PERSON, officeProp, personSrc } from "./office-assets";
import { COORDINATOR_POINT } from "./office-geometry";
import type { CoordinatorScene } from "./use-office-choreography";

type Props = {
	scene: CoordinatorScene;
	model: string;
	onClick?: () => void;
};

const BOX = { w: 214, h: 210 };
type Layer = { file: string; cx: number; cy: number; w: number; z: number; flip?: boolean };

const LAYERS: Layer[] = [
	{ file: "18_manager-chair-teal", cx: 107, cy: 74, w: 116, z: 5 },
	{ file: "03_manager-desk-empty", cx: 107, cy: 134, w: 176, z: 30 },
	{ file: "08_computer-monitor-black", cx: 107, cy: 116, w: 82, z: 45 },
];

const PERSON = { cx: 107, cy: 66, w: 62, z: 18 };

const layerStyle = (cx: number, cy: number, w: number, z: number, flip?: boolean): CSSProperties => ({
	position: "absolute",
	left: cx,
	top: cy,
	width: w,
	transform: `translate(-50%, -50%)${flip ? " scaleX(-1)" : ""}`,
	imageRendering: "pixelated",
	clipPath: "inset(1px)",
	zIndex: z,
});

/** Estacao do coordenador, montada com os sprites novos e maior que as baias dos agents. */
export const CoordinatorDesk = ({ scene, model, onClick }: Props) => {
	const reducedMotion = useReducedMotion();
	const { thinking } = scene;

	return (
		<button
			type="button"
			onClick={onClick}
			style={{ left: `${COORDINATOR_POINT.x}%`, top: `${COORDINATOR_POINT.y}%` }}
			aria-label={`Coordenador - ${thinking ? "decidindo o proximo passo" : "aguardando"}`}
			className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 appearance-none flex-col items-center border-0 bg-transparent p-0 text-inherit focus-visible:outline-none"
		>
			<span className="relative block" style={{ width: BOX.w, height: BOX.h }}>
				<AnimatePresence>
					{thinking && (
						<motion.span
							initial={{ opacity: 0, y: 6, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 6, scale: 0.95 }}
							transition={{ duration: reducedMotion ? 0 : 0.18 }}
							className="bg-primary text-primary-foreground absolute bottom-[94%] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2.5 py-1 whitespace-nowrap shadow-sm"
						>
							<Loader2 className="size-3 animate-spin" />
							<Typography variant="caption" as="span">
								decidindo...
							</Typography>
						</motion.span>
					)}
				</AnimatePresence>

				<motion.span
					aria-hidden
					className="bg-primary/30 absolute bottom-8 left-1/2 h-8 w-36 -translate-x-1/2 rounded-[50%] blur-lg"
					animate={thinking && !reducedMotion ? { opacity: [0.45, 0.9, 0.45], scale: [1, 1.12, 1] } : { opacity: 0.18 }}
					transition={
						thinking && !reducedMotion ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }
					}
					style={{ zIndex: 1 }}
				/>

				{LAYERS.filter((l) => l.z < PERSON.z).map((l) => (
					<img
						key={l.file}
						src={officeProp(l.file)}
						alt=""
						draggable={false}
						style={layerStyle(l.cx, l.cy, l.w, l.z, l.flip)}
						className="pointer-events-none select-none"
					/>
				))}

				<img
					src={personSrc(COORDINATOR_PERSON, "front")}
					alt=""
					draggable={false}
					style={layerStyle(PERSON.cx, PERSON.cy, PERSON.w, PERSON.z)}
					className="pointer-events-none drop-shadow-[0_2px_1px_rgba(0,0,0,0.25)] select-none"
				/>

				{LAYERS.filter((l) => l.z > PERSON.z).map((l) => (
					<img
						key={l.file}
						src={officeProp(l.file)}
						alt=""
						draggable={false}
						style={layerStyle(l.cx, l.cy, l.w, l.z, l.flip)}
						className="pointer-events-none select-none"
					/>
				))}
			</span>

			<span className="-mt-5 flex flex-col items-center rounded-md bg-black/35 px-2.5 py-0.5 backdrop-blur-[1px]">
				<span className="flex items-center gap-1">
					<span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden />
					<Typography variant="caption" as="span" className="font-medium text-white">
						Coordenador
					</Typography>
				</span>
				<span className="flex items-center gap-1 text-white/75">
					<Sparkles className="size-2.5 shrink-0" />
					<Typography variant="caption" as="span" className="max-w-32 truncate font-mono">
						{model}
					</Typography>
				</span>
			</span>
		</button>
	);
};
