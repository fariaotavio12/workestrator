import { AlertTriangle, Check, Loader2, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/app/utils/cn";
import { Typography } from "@/components/typography";
import type { AgentStatus } from "@/features/security/orchestrator-shared/types";
import { AnimatedPerson } from "./animated-person";
import { officeProp, type PersonKey } from "./office-assets";
import { SpeechBubble } from "./speech-bubble";
import type { ActorBubble } from "./use-office-choreography";

type Props = {
	position: { x: number; y: number };
	personKey: PersonKey | null;
	status: AgentStatus;
	accentColor: string;
	name?: string;
	role?: string;
	issue?: string;
	bubble?: ActorBubble;
	onClick?: () => void;
	onAnswer?: (answer: string) => void;
	onApproveCheckpoint?: () => void;
	onRejectCheckpoint?: () => void;
	disabled?: boolean;
};

/**
 * Caixa da baia (largura x altura) e posição de cada peça, em px, com origem no canto superior
 * esquerdo. `cx`/`cy` é o CENTRO da peça (cada sprite vem centralizado no próprio canvas). Ajuste
 * fino da montagem é feito só aqui.
 */
const BOX = { w: 176, h: 210 };
type Layer = { file: string; cx: number; cy: number; w: number; z: number; flip?: boolean };
const LAYERS: Layer[] = [
	{ file: "11_acoustic-divider-teal", cx: 158, cy: 104, w: 96, z: 0 },
	{ file: "07_office-chair-teal", cx: 58, cy: 92, w: 120, z: 10 },
	// pessoa entra aqui (z: 20)
	{ file: "12_drawer-pedestal-gray", cx: 96, cy: 156, w: 132, z: 25 },
	{ file: "01_workstation-desk-l-empty", cx: 94, cy: 132, w: 150, z: 30, flip: true },
	{ file: "08_computer-monitor-black", cx: 106, cy: 98, w: 92, z: 40 },
	{ file: "13_desk-plant-small", cx: 124, cy: 118, w: 40, z: 45 },
];
const PERSON = { cx: 66, cy: 86, w: 58, z: 20 };

const layerStyle = (cx: number, cy: number, w: number, z: number, flip?: boolean): CSSProperties => ({
	position: "absolute",
	left: cx,
	top: cy,
	width: w,
	transform: `translate(-50%, -50%)${flip ? " scaleX(-1)" : ""}`,
	imageRendering: "pixelated",
	zIndex: z,
});

const GLOW: Partial<Record<AgentStatus, string>> = {
	working: "bg-primary/35",
	checkpoint: "bg-warning/45",
	done: "bg-success/30",
};

const STATUS_LABEL = (status: AgentStatus, role?: string): string => {
	if (status === "working") return "Trabalhando";
	if (status === "checkpoint") return "Aguardando aprovação";
	if (status === "done") return "Concluído";
	return role ?? "Ocioso";
};

/** Uma baia montada a partir das peças pixel-art, com a pessoa sentada de perfil olhando o monitor. */
export const Workstation = ({
	position,
	personKey,
	status,
	accentColor,
	name,
	role,
	issue,
	bubble,
	onClick,
	onAnswer,
	onApproveCheckpoint,
	onRejectCheckpoint,
	disabled,
}: Props) => {
	const reducedMotion = useReducedMotion();
	const working = status === "working";

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={issue}
			aria-label={name ? `${name} — ${STATUS_LABEL(status, role)}` : "Sentar agente"}
			style={{ left: `${position.x}%`, top: `${position.y}%` }}
			className={cn(
				"group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus-visible:outline-none",
				reducedMotion ? "transition-none" : "transition-[left,top] duration-[900ms] ease-in-out",
				working && "z-20",
				"disabled:pointer-events-none",
			)}
		>
			{/* Balão. */}
			<AnimatePresence>
				{bubble && (
					<motion.div
						className="absolute bottom-[94%] left-1/2 z-30 -translate-x-1/2"
						initial={{ opacity: 0, y: 6, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 6, scale: 0.95 }}
						transition={{ duration: reducedMotion ? 0 : 0.18 }}
					>
						<SpeechBubble
							bubble={bubble}
							onAnswer={onAnswer}
							onApproveCheckpoint={onApproveCheckpoint}
							onRejectCheckpoint={onRejectCheckpoint}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			<span className="relative block" style={{ width: BOX.w, height: BOX.h }}>
				{/* Halo no chão. */}
				{GLOW[status] && (
					<span
						aria-hidden
						className={cn(
							"absolute bottom-4 left-1/2 h-6 w-28 -translate-x-1/2 rounded-[50%] blur-md",
							GLOW[status],
							(working || status === "checkpoint") && !reducedMotion && "animate-pulse",
						)}
						style={{ zIndex: 5 }}
					/>
				)}

				{/* Cadeira + divisória + gavetas ficam antes/depois da pessoa conforme o z. */}
				{LAYERS.filter((l) => l.z < PERSON.z).map((l) => (
					<img key={l.file} src={officeProp(l.file)} alt="" draggable={false} style={layerStyle(l.cx, l.cy, l.w, l.z, l.flip)} className="pointer-events-none select-none" />
				))}

				{/* Pessoa sentada (ou convite pra sentar). */}
				{personKey ? (
					<AnimatedPerson
						personKey={personKey}
						pose="seated"
						anim="idle"
						displayWidth={PERSON.w}
						className="pointer-events-none select-none"
						style={layerStyle(PERSON.cx, PERSON.cy, PERSON.w, PERSON.z)}
					/>
				) : (
					<span
						className="absolute flex size-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 bg-background/70 text-muted-foreground group-hover:border-ring group-hover:text-foreground"
						style={{ left: PERSON.cx, top: PERSON.cy, transform: "translate(-50%,-50%)", zIndex: PERSON.z }}
					>
						<Plus className="size-4" />
					</span>
				)}

				{LAYERS.filter((l) => l.z > PERSON.z).map((l) => (
					<img key={l.file} src={officeProp(l.file)} alt="" draggable={false} style={layerStyle(l.cx, l.cy, l.w, l.z, l.flip)} className="pointer-events-none select-none" />
				))}

				{/* Selo de concluído / aviso. */}
				{issue && (
					<AlertTriangle
						className="text-warning bg-background absolute size-4 rounded-full"
						style={{ left: PERSON.cx, top: 8, zIndex: 50 }}
					/>
				)}
				<AnimatePresence>
					{status === "done" && (
						<motion.span
							initial={{ scale: 0, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0, opacity: 0 }}
							className="bg-success text-success-foreground absolute flex size-4 items-center justify-center rounded-full"
							style={{ left: PERSON.cx, top: 8, zIndex: 50 }}
						>
							<Check className="size-2.5" />
						</motion.span>
					)}
				</AnimatePresence>
			</span>

			{/* Rótulo. */}
			<span className="-mt-2 flex flex-col items-center rounded-md bg-black/30 px-2 py-0.5 backdrop-blur-[1px]">
				<span className="flex items-center gap-1">
					<span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accentColor }} aria-hidden />
					<Typography variant="caption" as="span" className="max-w-28 truncate font-medium text-white">
						{name ?? "Sentar agente"}
					</Typography>
				</span>
				{name && (
					<Typography
						variant="caption"
						as="span"
						className={cn("flex items-center gap-1", working ? "text-primary-foreground" : "text-white/70")}
					>
						{working && <Loader2 className="size-2.5 shrink-0 animate-spin" />}
						{STATUS_LABEL(status, role)}
					</Typography>
				)}
			</span>
		</button>
	);
};
