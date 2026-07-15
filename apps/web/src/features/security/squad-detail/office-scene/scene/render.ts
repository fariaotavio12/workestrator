import Phaser from "phaser";
import type { PersonKey } from "../../office/office-assets";
import { resolveCharacterVisual, type OfficeAnim } from "../assets/character-manifest";
import { getProp } from "../assets/prop-manifest";

/** Chave de textura de uma peça no cache do Phaser. */
export const propTexKey = (id: string): string => `prop:${id}`;

/** Nome do frame trimado registrado no BootScene (conteúdo sem a margem/artefato dos PNGs). */
export const TRIM_FRAME = "trim";

type PropOpts = { flip?: boolean; depth?: number; displayW?: number; alpha?: number };

/** Adiciona uma peça (frame trimado) na cena com origem baseline e depth por Y. */
export const addProp = (
	scene: Phaser.Scene,
	propId: string,
	worldX: number,
	worldY: number,
	opts: PropOpts = {},
): Phaser.GameObjects.Image => {
	const spec = getProp(propId);
	const img = scene.add.image(worldX, worldY, propTexKey(propId), TRIM_FRAME);
	img.setOrigin(spec.origin.x, spec.origin.y);
	const displayW = opts.displayW ?? spec.displayW;
	img.setDisplaySize(displayW, (displayW * spec.trim.h) / spec.trim.w);
	if (opts.flip) img.setFlipX(true);
	if (opts.alpha !== undefined) img.setAlpha(opts.alpha);
	img.setDepth(opts.depth ?? worldY + (spec.depthOffset ?? 0));
	return img;
};

export type CharacterObject = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

/**
 * Adiciona um personagem em `anim`: sprite animado se o sheet existir e a anim estiver registrada,
 * senão imagem estática (pose equivalente). Origem baseline (pés), escalado para `displayH` px.
 */
export const addCharacter = (
	scene: Phaser.Scene,
	personKey: PersonKey,
	anim: OfficeAnim,
	worldX: number,
	worldY: number,
	displayH: number,
	flip = false,
): CharacterObject => {
	const visual = resolveCharacterVisual(personKey, anim);
	if (visual.kind === "sheet" && scene.textures.exists(visual.textureKey)) {
		const sprite = scene.add.sprite(worldX, worldY, visual.textureKey);
		if (scene.anims.exists(visual.animKey)) sprite.play(visual.animKey);
		// Âncora/escala pelo boneco real dentro do frame (frames têm muita margem transparente).
		const { cx, feetY, hFrac } = visual.spec.content;
		sprite.setOrigin(cx, feetY);
		sprite.setScale(displayH / (hFrac * visual.spec.frameH));
		if (visual.flipX !== flip) sprite.setFlipX(true);
		sprite.setDepth(worldY);
		return sprite;
	}
	const key = scene.textures.exists(visual.textureKey) ? visual.textureKey : undefined;
	const img = scene.add.image(worldX, worldY, key ?? "__MISSING__");
	img.setOrigin(0.5, 0.98);
	if (visual.flipX !== flip) img.setFlipX(true);
	img.setScale(displayH / (img.height || displayH));
	img.setDepth(worldY);
	return img;
};

/** Halo elíptico no chão sob um ator (status). Retorna o objeto p/ animar/pulsar/remover. */
export const addGlow = (
	scene: Phaser.Scene,
	worldX: number,
	worldY: number,
	color: number,
	width = 70,
): Phaser.GameObjects.Ellipse => {
	const glow = scene.add.ellipse(worldX, worldY, width, width * 0.42, color, 0.5);
	glow.setDepth(worldY - 1);
	return glow;
};
