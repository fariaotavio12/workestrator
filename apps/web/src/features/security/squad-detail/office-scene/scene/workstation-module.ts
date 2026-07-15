import Phaser from "phaser";
import type { AgentStatus } from "@/features/security/orchestrator-shared/types";
import type { PersonKey } from "../../office/office-assets";
import type { Facing } from "../layout/office-layout";
import type { OfficePalette } from "./palette";
import { addCharacter, addGlow, addProp, type CharacterObject } from "./render";

/**
 * Peças da baia relativas à pessoa (world px) + ordem (z) + largura de exibição. Pessoa sentada de
 * perfil olhando à direita: mesa/monitor à direita, cadeira/divisória atrás. Tamanhos calibrados para
 * a cabeça/tronco do boneco aparecerem acima da mesa.
 */
const PERSON_Z = 0.2;
const PERSON_H = 76;
const PIECES = [
	{ prop: "11_acoustic-divider-teal", dx: -16, dy: -8, z: 0.05, w: 30, flipL: false },
	{ prop: "07_office-chair-teal", dx: -2, dy: 6, z: 0.1, w: 52, flipL: true },
	{ prop: "12_drawer-pedestal-gray", dx: 30, dy: 22, z: 0.25, w: 44, flipL: true },
	{ prop: "01_workstation-desk-l-empty", dx: 34, dy: 20, z: 0.3, w: 92, flipL: true },
	{ prop: "08_computer-monitor-black", dx: 40, dy: 4, z: 0.4, w: 46, flipL: true },
	{ prop: "13_desk-plant-small", dx: 56, dy: 10, z: 0.45, w: 26, flipL: false },
] as const;

const GLOW_COLOR: Partial<Record<AgentStatus, keyof OfficePalette>> = {
	working: "primary",
	checkpoint: "warning",
	done: "success",
};

/** Uma baia montada na cena: mobília estática + pessoa (troca com o agente) + halo de status. */
export class WorkstationModule {
	private readonly scene: Phaser.Scene;
	private readonly palette: OfficePalette;
	private readonly px: number;
	private readonly py: number;
	private readonly dir: number;
	private readonly furniture: Phaser.GameObjects.Image[] = [];
	private person?: CharacterObject;
	private glow?: Phaser.GameObjects.Ellipse;
	private personKey: PersonKey | null = null;
	private status: AgentStatus = "idle";

	constructor(scene: Phaser.Scene, palette: OfficePalette, worldX: number, worldY: number, facing: Facing) {
		this.scene = scene;
		this.palette = palette;
		this.px = worldX;
		this.py = worldY;
		this.dir = facing === "right" ? 1 : -1;

		for (const piece of PIECES) {
			const x = this.px + piece.dx * this.dir;
			const y = this.py + piece.dy;
			const flip = this.dir < 0 && piece.flipL;
			this.furniture.push(addProp(scene, piece.prop, x, y, { flip, depth: this.py + piece.z, displayW: piece.w }));
		}
	}

	/** Sincroniza personagem e halo de status (diff barato). */
	update(personKey: PersonKey | null, status: AgentStatus): void {
		if (personKey !== this.personKey) {
			this.person?.destroy();
			this.person = undefined;
			if (personKey) {
				this.person = addCharacter(this.scene, personKey, "seated_idle", this.px, this.py, PERSON_H, this.dir < 0);
				this.person.setDepth(this.py + PERSON_Z);
			}
			this.personKey = personKey;
		}
		if (status !== this.status) {
			this.applyGlow(status);
			this.status = status;
		}
	}

	private applyGlow(status: AgentStatus): void {
		this.glow?.destroy();
		this.glow = undefined;
		const token = GLOW_COLOR[status];
		if (!token || !this.personKey) return;
		this.glow = addGlow(this.scene, this.px, this.py + 4, this.palette[token]);
		if (status === "working" || status === "checkpoint") {
			this.scene.tweens.add({
				targets: this.glow,
				alpha: { from: 0.28, to: 0.75 },
				scaleX: { from: 0.9, to: 1.12 },
				duration: 900,
				yoyo: true,
				repeat: -1,
				ease: "Sine.inOut",
			});
		}
	}

	/** Ponto (mundo) acima da cabeça — âncora do balão. */
	bubbleAnchorWorld(): { x: number; y: number } {
		return { x: this.px, y: this.py - PERSON_H - 6 };
	}

	/** Retângulo de clique (mundo) cobrindo a baia. */
	rectWorld(): { x: number; y: number; w: number; h: number } {
		return { x: this.px - 34, y: this.py - PERSON_H - 4, w: 108, h: PERSON_H + 40 };
	}

	destroy(): void {
		this.furniture.forEach((f) => f.destroy());
		this.person?.destroy();
		this.glow?.destroy();
	}
}
