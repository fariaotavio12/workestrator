import Phaser from "phaser";

/**
 * Ajusta a câmera para caber o mundo inteiro no viewport (fit-to-bounds), centralizado. O zoom é
 * quantizado em passos de 1/16 para reduzir tremor de pixel-art durante o resize do layout flex.
 */
export const fitCamera = (scene: Phaser.Scene, world: { w: number; h: number }): number => {
	const cam = scene.cameras.main;
	const vw = scene.scale.width;
	const vh = scene.scale.height;
	if (vw === 0 || vh === 0 || world.w === 0 || world.h === 0) return cam.zoom;

	const raw = Math.min(vw / world.w, vh / world.h);
	const zoom = Math.max(1 / 16, Math.floor(raw * 16) / 16);
	cam.setZoom(zoom);
	cam.centerOn(world.w / 2, world.h / 2);
	return zoom;
};
