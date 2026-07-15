import Phaser from "phaser";
import { COORDINATOR_PERSON } from "../../office/office-assets";
import type { Facing } from "../layout/office-layout";
import type { OfficePalette } from "./palette";
import { addCharacter, addGlow, addProp, type CharacterObject } from "./render";

const PERSON_Z = 0.2;
const PERSON_H = 84;

/** Estação do gerente (coordenador): mesa + monitores duplos + cadeira + pessoa navy + spotlight. */
export class CoordinatorModule {
	private readonly scene: Phaser.Scene;
	private readonly px: number;
	private readonly py: number;
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
		const flipL = dir < 0;

		addProp(scene, "18_manager-chair-teal", this.px, this.py + 6, { flip: flipL, depth: this.py + 0.1, displayW: 54 });
		this.person = addCharacter(scene, COORDINATOR_PERSON, "seated_idle", this.px, this.py, PERSON_H, flipL);
		this.person.setDepth(this.py + PERSON_Z);
		addProp(scene, "03_manager-desk-empty", this.px, this.py + 26, { depth: this.py + 0.3, displayW: 116 });
		addProp(scene, "20_manager-monitor-left", this.px - 24 * dir, this.py + 18, { depth: this.py + 0.4, displayW: 46 });
		addProp(scene, "21_manager-monitor-right", this.px + 24 * dir, this.py + 18, { depth: this.py + 0.4, displayW: 46 });
	}

	setThinking(thinking: boolean): void {
		if (thinking === this.thinking) return;
		this.thinking = thinking;
		this.glowTween?.remove();
		this.glowTween = undefined;
		this.glow?.destroy();
		this.glow = undefined;
		if (!thinking) return;
		this.glow = addGlow(this.scene, this.px, this.py + 6, this.primary, 96);
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
		return { x: this.px, y: this.py - PERSON_H - 6 };
	}

	rectWorld(): { x: number; y: number; w: number; h: number } {
		return { x: this.px - 44, y: this.py - PERSON_H - 4, w: 88, h: PERSON_H + 44 };
	}
}
