import Phaser from "phaser";
import type { AgentStatus } from "@/features/security/orchestrator-shared/types";
import type { PersonKey } from "@/features/security/orchestrator-shared/data/characters";
import type { Facing } from "../layout/office-layout";
import type { OfficePalette } from "./palette";
import { addCharacter, addGlow, addProp, type CharacterObject } from "./render";

/**
 * Peças da mesa padrão relativas à pessoa (world px) + ordem (z) + largura de exibição. Pessoa sentada
 * de perfil: mesa/monitor à direita, cadeira atrás. Tamanhos calibrados para a cabeça/tronco do boneco
 * aparecerem acima da mesa. `flip` é o espelhamento no layout canônico (facing right); virada para a
 * esquerda, a baia espelha posições e flips juntos.
 */
const PERSON_Z = 0.2;
const PERSON_H = 85;
/** Pessoa e cadeira deslocadas em direção à mesa — as mãos lêem "sobre o teclado". */
const PERSON_DX = 10;
const PIECES = [
	{ prop: "07_office-chair-teal", dx: PERSON_DX - 4, dy: 6, z: 0.1, w: 52, flip: false },
	{ prop: "01_workstation-desk-l-empty", dx: 36, dy: 20, z: 0.3, w: 92, flip: true },
	{ prop: "08_computer-monitor-black", dx: 47, dy: 4, z: 0.4, w: 46, flip: false },
	{ prop: "13_desk-plant-small", dx: 10, dy: 4, z: 0.45, w: 26, flip: false },
] as const;

const STATION_DX = -30;

/** X da pessoa sentada numa baia ancorada em `px`. Fonte única — baia e coordenador usam esta conta. */
export const stationPersonX = (px: number, dir: number): number => px + (PERSON_DX + STATION_DX) * dir;

/** Mobília da mesa padrão montada em volta da âncora (px, py) — usada pelas baias e pelo coordenador. */
export const buildStandardDesk = (
	scene: Phaser.Scene,
	px: number,
	py: number,
	dir: number,
): Phaser.GameObjects.Image[] =>
	PIECES.map((piece) =>
		addProp(scene, piece.prop, px + (piece.dx + STATION_DX) * dir, py + piece.dy, {
			flip: dir < 0 ? !piece.flip : piece.flip,
			depth: py + piece.z,
			displayW: piece.w,
		}),
	);

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
	private readonly personX: number;
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
		this.personX = stationPersonX(this.px, this.dir);
		this.furniture.push(...buildStandardDesk(scene, this.px, this.py, this.dir));
	}

	/** Sincroniza personagem e halo de status (diff barato). */
	update(personKey: PersonKey | null, status: AgentStatus): void {
		if (personKey !== this.personKey) {
			this.person?.destroy();
			this.person = undefined;
			if (personKey) {
				this.person = addCharacter(this.scene, personKey, "seated_idle", this.personX, this.py, PERSON_H, this.dir < 0);
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
		this.glow = addGlow(this.scene, this.personX, this.py + 4, this.palette[token]);
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
		return { x: this.personX, y: this.py - PERSON_H - 6 };
	}

	/** Retângulo de clique (mundo) cobrindo a baia — centrada na âncora, logo simétrica. */
	rectWorld(): { x: number; y: number; w: number; h: number } {
		return { x: this.px - 50, y: this.py - PERSON_H - 4, w: 100, h: PERSON_H + 40 };
	}

	destroy(): void {
		this.furniture.forEach((f) => f.destroy());
		this.person?.destroy();
		this.glow?.destroy();
	}
}
