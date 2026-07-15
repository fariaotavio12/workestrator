import Phaser from "phaser";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/app/utils/cn";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import type { CoordinatorView, OfficeSeatView } from "../office/office-types";
import { createOfficeBus } from "./event-bus";
import { PRESET_CLASSIC_OFFICE } from "./layout/preset-classic-office";
import { OfficeOverlay } from "./office-overlay";
import { BootScene } from "./scene/boot-scene";
import { OfficeScene } from "./scene/office-scene";
import { readPalette } from "./scene/palette";
import { useOfficeBridge } from "./use-office-bridge";

export type OfficeStageProps = {
	squad: Squad;
	seats: OfficeSeatView[];
	coordinator: CoordinatorView;
	onCoordinatorClick?: () => void;
	onSeatClick?: (seatId: string) => void;
	onAnswerQuestion?: (answer: string) => void;
	onApproveCheckpoint?: () => void;
	onRejectCheckpoint?: () => void;
	className?: string;
};

/**
 * Monta o jogo Phaser (renderer) e o overlay DOM (interação) sobre o mesmo container. Efeito simétrico
 * create/destroy (seguro no StrictMode/HMR) e resize via ResizeObserver. Estado flui React→cena pela
 * ponte; cliques e balões ficam no overlay. Este módulo é o único que importa Phaser (chunk lazy).
 */
export const OfficeStage = ({
	squad,
	seats,
	coordinator,
	onCoordinatorClick,
	onSeatClick,
	onAnswerQuestion,
	onApproveCheckpoint,
	onRejectCheckpoint,
	className,
}: OfficeStageProps) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const bus = useMemo(() => createOfficeBus(), []);
	const [ready, setReady] = useState(false);
	const layout = PRESET_CLASSIC_OFFICE;

	const { actors, coordinatorThinking } = useOfficeBridge(bus, squad, seats, layout, ready);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		let disposed = false;
		const offReady = bus.on("scene:ready", () => {
			if (!disposed) setReady(true);
		});

		const palette = readPalette(el);
		const game = new Phaser.Game({
			type: Phaser.WEBGL,
			parent: el,
			width: Math.max(1, el.clientWidth),
			height: Math.max(1, el.clientHeight),
			transparent: false,
			backgroundColor: palette.background,
			pixelArt: true,
			roundPixels: true,
			scale: { mode: Phaser.Scale.NONE },
			scene: [BootScene, OfficeScene],
			audio: { noAudio: true },
			banner: false,
		});
		game.registry.set("bus", bus);
		game.registry.set("layout", layout);
		game.registry.set("palette", palette);
		if (import.meta.env.DEV) (window as unknown as { __officeGame?: Phaser.Game }).__officeGame = game;

		let raf = 0;
		const ro = new ResizeObserver((entries) => {
			const cr = entries[0]?.contentRect;
			if (!cr) return;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				if (!disposed && cr.width > 0 && cr.height > 0) game.scale.resize(cr.width, cr.height);
			});
		});
		ro.observe(el);

		return () => {
			disposed = true;
			offReady();
			cancelAnimationFrame(raf);
			ro.disconnect();
			game.destroy(true);
			setReady(false);
		};
	}, [bus, layout]);

	return (
		<div className={cn("bg-muted/40 relative h-full min-h-[34rem] w-full overflow-hidden rounded-xl border", className)}>
			<div ref={containerRef} className="absolute inset-0" />
			<OfficeOverlay
				bus={bus}
				actors={actors}
				coordinatorThinking={coordinatorThinking}
				coordinatorModel={coordinator.model}
				onCoordinatorClick={onCoordinatorClick}
				onSeatClick={onSeatClick}
				onAnswerQuestion={onAnswerQuestion}
				onApproveCheckpoint={onApproveCheckpoint}
				onRejectCheckpoint={onRejectCheckpoint}
			/>
		</div>
	);
};
