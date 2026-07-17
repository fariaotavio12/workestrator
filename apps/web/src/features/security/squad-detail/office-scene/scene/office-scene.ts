import Phaser from "phaser";
import type { OfficeBus, ProjectionMap, Rect, SeatVisual } from "../event-bus";
import {
	CELL,
	cellBaseline,
	worldSize,
	type Door,
	type GlassRun,
	type OfficeLayout,
	type WallRun,
} from "../layout/office-layout";
import { getProp, propDisplayHeight } from "../assets/prop-manifest";
import {
	WALL_CAP_H,
	WALL_CAP_ID,
	WALL_FACE_H,
	WALL_PILLAR_ID,
	WALL_SIDE_W,
	wallBodyId,
	wallTexKey,
	type WallKind,
} from "../assets/wall-manifest";
import { fitCamera } from "./camera-fit";
import { CoordinatorModule } from "./coordinator-module";
import { DEPTH } from "./depth";
import { readPalette, type OfficePalette } from "./palette";
import { addProp, propTexKey, TRIM_FRAME } from "./render";
import { WorkstationModule } from "./workstation-module";

const FLOOR_TILE_SCALE = 0.8;

const FLOOR_PROP: Record<string, string> = {
	wood: "42_wood-floor-tile",
	"meeting-carpet": "43_meeting-carpet-tile",
};

/** Cena do escritório: monta o layout estático e sincroniza baias/coordenador com o estado (via bus). */
export class OfficeScene extends Phaser.Scene {
	private bus!: OfficeBus;
	private layout!: OfficeLayout;
	private palette!: OfficePalette;
	private world = { w: 0, h: 0 };
	private readonly desks = new Map<string, WorkstationModule>();
	private coordinator!: CoordinatorModule;
	private readonly unsub: Array<() => void> = [];

	constructor() {
		super("office");
	}

	create(): void {
		this.bus = this.game.registry.get("bus") as OfficeBus;
		this.layout = this.game.registry.get("layout") as OfficeLayout;
		this.palette = (this.game.registry.get("palette") as OfficePalette) ?? readPalette();
		this.world = worldSize(this.layout.grid);
		this.cameras.main.setBackgroundColor(this.palette.background);

		this.buildFloors();
		this.buildWalls();
		this.buildGlass();
		this.buildDoors();
		this.buildFurniture();
		this.buildCoordinator();

		fitCamera(this, this.world);

		this.unsub.push(this.bus.on("state:seats", (seats) => this.syncSeats(seats)));
		this.unsub.push(this.bus.on("state:coordinator", ({ thinking }) => this.coordinator.setThinking(thinking)));
		this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

		this.bus.emit("scene:ready", undefined);
		// worldView/matriz ficam prontos após o 1º render — emite projeções no próximo tick.
		this.time.delayedCall(0, () => this.emitProjections());
	}

	private buildFloors(): void {
		this.layout.floors.forEach((zone, i) => {
			const prop = FLOOR_PROP[zone.texture];
			if (!this.textures.exists(propTexKey(prop))) return;
			const x = zone.rect.x * CELL;
			const y = zone.rect.y * CELL;
			const w = zone.rect.w * CELL;
			const h = zone.rect.h * CELL;
			const tile = this.add.tileSprite(x, y, w, h, propTexKey(prop), TRIM_FRAME).setOrigin(0, 0);
			tile.setTileScale(FLOOR_TILE_SCALE, FLOOR_TILE_SCALE);
			tile.setDepth(i === 0 ? DEPTH.floorBase : DEPTH.floorZone + i);
		});
	}

	private buildWalls(): void {
		for (const run of this.layout.walls) this.placeWall(run, "wall");
	}

	private buildGlass(): void {
		for (const run of this.layout.glass) {
			this.placeWall(run, run.frame === "cream" ? "glass_cream" : "glass_dark");
		}
	}

	private placeWall(run: WallRun | GlassRun, kind: WallKind): void {
		const horizontal = run.from.y === run.to.y;
		const c0 = horizontal ? Math.min(run.from.x, run.to.x) : Math.min(run.from.y, run.to.y);
		const c1 = horizontal ? Math.max(run.from.x, run.to.x) : Math.max(run.from.y, run.to.y);
		const bodyKey = wallTexKey(wallBodyId(kind, horizontal));
		if (!this.textures.exists(bodyKey)) return;
		const span = (c1 - c0 + 1) * CELL;

		if (horizontal) {
			// Na fileira 0 a parede desce do topo do mundo; nas outras, apoia no fim da própria fileira.
			const bottom = run.from.y === 0 ? WALL_FACE_H : (run.from.y + 1) * CELL;
			const top = bottom - WALL_FACE_H;
			const x = c0 * CELL;
			const depth = bottom - 1;
			this.add.tileSprite(x, top, span, WALL_FACE_H, bodyKey).setOrigin(0, 0).setDepth(depth);
			this.add.image(x, top, wallTexKey(WALL_PILLAR_ID)).setOrigin(0, 0).setDepth(depth);
			this.add.image(x + span, top, wallTexKey(WALL_PILLAR_ID)).setOrigin(1, 0).setDepth(depth);
			return;
		}

		// Na última coluna a parede encosta na borda direita do mundo (não no início da célula) e
		// espelha, para a face interna (sombreada) olhar o salão.
		const rightEdge = run.from.x === this.layout.grid.cols - 1;
		const x = rightEdge ? (run.from.x + 1) * CELL - WALL_SIDE_W : run.from.x * CELL;
		const y = c0 * CELL;
		const body = this.add.tileSprite(x, y, WALL_SIDE_W, span, bodyKey).setOrigin(0, 0);
		body.setDepth(DEPTH.wallSide);
		if (rightEdge) body.setFlipX(true);
		for (const cap of [y, y + span - WALL_CAP_H]) {
			this.add.image(x, cap, wallTexKey(WALL_CAP_ID)).setOrigin(0, 0).setDepth(DEPTH.wallSide + 1);
		}
	}

	private buildDoors(): void {
		const propFor: Record<Door["kind"], string> = {
			"glass-single": "46_glass-meeting-door",
			"glass-double": "47_glass-entrance-double-door",
		};
		for (const door of this.layout.doors) {
			const base = cellBaseline(door.cell);
			// Porta dupla preenche um vão de 2 células (célula da porta + a seguinte à direita).
			const dbl = door.kind === "glass-double";
			addProp(this, propFor[door.kind], base.x + (dbl ? CELL / 2 : 0), base.y, {
				displayW: dbl ? CELL * 2 : CELL,
				depth: base.y,
			});
		}
	}

	private buildFurniture(): void {
		for (const item of this.layout.furniture) {
			const spec = this.textures.exists(propTexKey(item.propId));
			if (!spec) continue;
			const base = cellBaseline(item.cell);
			const x = base.x + (item.offset?.x ?? 0) * CELL;
			const y = base.y + (item.offset?.y ?? 0) * CELL;
			addProp(this, item.propId, x, y, { flip: item.flip, angle: item.angle, depth: this.propDepth(item.propId, y) });
		}
	}

	/**
	 * Tapetes (categoria floor) colam no piso — nunca sobre móveis. Peças penduradas desenham sobre a
	 * face da parede (depth logo abaixo do pixel mais baixo da arte). O resto ordena pela baseline Y.
	 */
	private propDepth(propId: string, y: number): number {
		const spec = getProp(propId);
		if (spec.category === "floor") return DEPTH.rug + (spec.depthOffset ?? 0);
		if (!spec.wallMounted) return y;
		return Math.ceil((y + propDisplayHeight(spec) / 2) / CELL) * CELL - 0.5;
	}

	private buildCoordinator(): void {
		const base = cellBaseline(this.layout.coordinator.cell);
		this.coordinator = new CoordinatorModule(this, this.palette, base.x, base.y, this.layout.coordinator.facing);
	}

	private syncSeats(seats: SeatVisual[]): void {
		const incoming = new Map(seats.map((s) => [s.seatId, s]));
		let structural = false;

		for (const [id, view] of this.desks) {
			if (!incoming.has(id)) {
				view.destroy();
				this.desks.delete(id);
				structural = true;
			}
		}
		for (const seat of seats) {
			let view = this.desks.get(seat.seatId);
			if (!view) {
				const base = cellBaseline(seat.cell);
				view = new WorkstationModule(this, this.palette, base.x, base.y, seat.facing);
				this.desks.set(seat.seatId, view);
				structural = true;
			}
			view.update(seat.personKey, seat.status);
		}
		if (structural) this.emitProjections();
	}

	private handleResize(): void {
		fitCamera(this, this.world);
		this.emitProjections();
	}

	private emitProjections(): void {
		const cam = this.cameras.main;
		const zoom = cam.zoom;
		const topLeft = cam.getWorldPoint(0, 0);
		const toScreen = (wx: number, wy: number) => ({ x: (wx - topLeft.x) * zoom, y: (wy - topLeft.y) * zoom });
		const rectToScreen = (r: Rect): Rect => {
			const p = toScreen(r.x, r.y);
			return { x: p.x, y: p.y, w: r.w * zoom, h: r.h * zoom };
		};

		const desks: Record<string, Rect> = {};
		const bubbleAnchors: ProjectionMap["bubbleAnchors"] = {};
		for (const [seatId, view] of this.desks) {
			desks[seatId] = rectToScreen(view.rectWorld());
			const b = view.bubbleAnchorWorld();
			bubbleAnchors[seatId] = toScreen(b.x, b.y);
		}
		const cb = this.coordinator.bubbleAnchorWorld();
		bubbleAnchors.coordinator = toScreen(cb.x, cb.y);

		this.bus.emit("scene:projections", {
			zoom,
			desks,
			coordinator: rectToScreen(this.coordinator.rectWorld()),
			bubbleAnchors,
		});
	}

	private cleanup(): void {
		this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
		this.unsub.forEach((off) => off());
		this.unsub.length = 0;
		this.desks.forEach((v) => v.destroy());
		this.desks.clear();
	}
}
