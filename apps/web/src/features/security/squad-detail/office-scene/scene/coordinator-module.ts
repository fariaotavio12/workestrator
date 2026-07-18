import Phaser from "phaser";
import { COORDINATOR_PERSON } from "@/features/security/orchestrator-shared/data/characters";
import type { Facing } from "../layout/office-layout";
import type { OfficePalette } from "./palette";
import { addCharacter, addGlow, type CharacterObject } from "./render";
import { buildStandardDesk, stationPersonX } from "./workstation-module";

const PERSON_Z = 0.2;
const PERSON_H = 84;

/** Estação do gerente (coordenador): mesa padrão de baia + pessoa navy + spotlight. */
export class CoordinatorModule {
	private readonly scene: Phaser.Scene;
	private readonly px: number;
	private readonly py: number;
	/** X da pessoa/cadeira dentro da baia (a baia é centrada na âncora). */
	private readonly personX: number;
	private readonly person: CharacterObject;
	private glow?: Phaser.GameObjects.Ellipse;
	private glowTween?: Phaser.Tweens.Tween;
	private thinking = false;
	private readonly primary: number;

	constructor(scene: Phaser.Scene, palette: OfficePalette, worldX: number, worldY: number, facing: Facing) {
		this.scene = scene;
		this.px = worldX;
		this.py = worldY;
		this.primary = palette.primary;
		const dir = facing === "right" ? 1 : -1;
		this.personX = stationPersonX(this.px, dir);

		buildStandardDesk(scene, this.px, this.py, dir);
		this.person = addCharacter(scene, COORDINATOR_PERSON, "seated_idle", this.personX, this.py, PERSON_H, dir < 0);
		this.person.setDepth(this.py + PERSON_Z);
	}

	setThinking(thinking: boolean): void {
		if (thinking === this.thinking) return;
		this.thinking = thinking;
		this.glowTween?.remove();
		this.glowTween = undefined;
		this.glow?.destroy();
		this.glow = undefined;
		if (!thinking) return;
		this.glow = addGlow(this.scene, this.personX, this.py + 6, this.primary, 96);
		this.glowTween = this.scene.tweens.add({
			targets: this.glow,
			alpha: { from: 0.5, to: 0.95 },
			scaleX: { from: 1, to: 1.14 },
			duration: 1400,
			yoyo: true,
			repeat: -1,
			ease: "Sine.inOut",
		});
	}

	bubbleAnchorWorld(): { x: number; y: number } {
		return { x: this.personX, y: this.py - PERSON_H - 6 };
	}

	rectWorld(): { x: number; y: number; w: number; h: number } {
		// Mesmo footprint da baia padrão (centrada na âncora).
		return { x: this.px - 50, y: this.py - PERSON_H - 4, w: 100, h: PERSON_H + 44 };
	}
}
