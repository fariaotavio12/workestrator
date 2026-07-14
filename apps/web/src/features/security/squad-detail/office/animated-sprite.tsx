import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/app/utils/cn";
import type { SpriteSheet } from "./animated-people";

type Props = {
	sheet: SpriteSheet;
	displayWidth: number;
	className?: string;
	style?: CSSProperties;
	alt?: string;
};

/** Avança o índice do frame (0..frames-1) em intervalos fixos; fica parado no frame 0 se `paused`. */
const useSpriteFrame = (frames: number, durationMs: number, paused: boolean): number => {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		if (paused || frames <= 1) return;
		const id = setInterval(() => setFrame((f) => (f + 1) % frames), durationMs / frames);
		return () => clearInterval(id);
	}, [frames, durationMs, paused]);

	return paused ? 0 : frame;
};

/**
 * Player genérico de uma folha de sprite horizontal (frames lado a lado), reescalada com nitidez
 * pixelada. Congela no frame 0 quando `prefers-reduced-motion` está ativo.
 */
export const AnimatedSprite = ({ sheet, displayWidth, className, style, alt = "" }: Props) => {
	const reducedMotion = useReducedMotion();
	const frame = useSpriteFrame(sheet.frames, sheet.durationMs, Boolean(reducedMotion));
	const displayHeight = displayWidth * (sheet.tileH / sheet.tileW);

	return (
		<span
			aria-hidden={alt ? undefined : true}
			aria-label={alt || undefined}
			className={cn("pointer-events-none block select-none bg-no-repeat", className)}
			style={{
				width: displayWidth,
				height: displayHeight,
				backgroundImage: `url(${sheet.src})`,
				backgroundSize: `${sheet.frames * displayWidth}px ${displayHeight}px`,
				backgroundPositionX: -(frame * displayWidth),
				backgroundPositionY: 0,
				imageRendering: "pixelated",
				...style,
			}}
		/>
	);
};
