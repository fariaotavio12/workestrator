import Phaser from "phaser";
import {
	CHARACTER_SHEETS,
	FALLBACK_POSES,
	PERSON_KEYS,
	sheetKey,
	sheetUrl,
	staticPoseKey,
	staticPoseUrl,
	type OfficeAnim,
} from "../assets/character-manifest";
import { PROP_MANIFEST } from "../assets/prop-manifest";
import { WALL_ASSETS, wallTexKey } from "../assets/wall-manifest";
import { propTexKey, TRIM_FRAME } from "./render";

/** Animações carregadas por enquanto — só idle sentado (agentes parados). Walk entra no futuro. */
const LOADED_ANIMS: OfficeAnim[] = ["seated_idle"];

/**
 * Cena de carregamento: enfileira as texturas dos manifests, registra o frame trimado de cada peça
 * e cria as animações dos sheets carregados. Tolera ser destruída no meio (StrictMode/HMR).
 */
export class BootScene extends Phaser.Scene {
	constructor() {
		super("boot");
	}

	preload(): void {
		// Phaser 4.2 tem um quirk: quando o total passa de maxParallelDownloads (padrão 32), o loader
		// carrega o 1º lote e não refila o restante da fila (trava em 32/N). Carregamos tudo num único
		// lote grande para evitar o passo de refill. O navegador ainda serializa em ~6 conexões.
		this.load.maxParallelDownloads = 256;

		for (const spec of Object.values(PROP_MANIFEST)) {
			this.load.image(propTexKey(spec.id), spec.url);
		}
		// Paredes prontas (PNG exato, sem trim).
		for (const spec of Object.values(WALL_ASSETS)) {
			this.load.image(wallTexKey(spec.id), spec.url);
		}
		// Poses estáticas (fallback) de todos os personagens — arquivos pequenos.
		for (const key of PERSON_KEYS) {
			for (const pose of FALLBACK_POSES) {
				this.load.image(staticPoseKey(key, pose), staticPoseUrl(key, pose));
			}
		}
		// Sheets animados disponíveis (só idle sentado hoje).
		for (const key of PERSON_KEYS) {
			const anims = CHARACTER_SHEETS[key];
			if (!anims) continue;
			for (const anim of LOADED_ANIMS) {
				const spec = anims[anim];
				if (!spec) continue;
				this.load.spritesheet(sheetKey(key, anim), sheetUrl(spec), {
					frameWidth: spec.frameW,
					frameHeight: spec.frameH,
				});
			}
		}
	}

	create(): void {
		// Registra o frame trimado (conteúdo real) de cada peça.
		for (const spec of Object.values(PROP_MANIFEST)) {
			const tex = this.textures.get(propTexKey(spec.id));
			if (tex && !tex.has(TRIM_FRAME)) {
				tex.add(TRIM_FRAME, 0, spec.trim.x, spec.trim.y, spec.trim.w, spec.trim.h);
			}
		}
		// Cria as animações dos sheets carregados.
		for (const key of PERSON_KEYS) {
			const anims = CHARACTER_SHEETS[key];
			if (!anims) continue;
			for (const anim of LOADED_ANIMS) {
				const spec = anims[anim];
				const animKey = sheetKey(key, anim);
				if (!spec || !this.textures.exists(animKey) || this.anims.exists(animKey)) continue;
				this.anims.create({
					key: animKey,
					frames: this.anims.generateFrameNumbers(animKey, { start: spec.frames.start, end: spec.frames.end }),
					frameRate: spec.fps,
					repeat: spec.loop ? -1 : 0,
				});
			}
		}

		// Transiciona para a cena do escritório. Sem guard de isActive() aqui: durante create() a cena
		// está em CREATING (não RUNNING), então isActive() seria false e o start nunca dispararia.
		// Se o jogo for destruído no meio (StrictMode/HMR), game.destroy() impede create() de rodar.
		this.scene.start("office");
	}
}
