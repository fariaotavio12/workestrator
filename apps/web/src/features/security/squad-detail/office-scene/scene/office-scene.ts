import Phaser from "phaser";
import type { OfficeBus, ProjectionMap, Rect, SeatVisual } from "../event-bus";
import {
	CELL,
	cellBaseline,
	worldSize,
	type Cell,
	type Door,
	type GlassRun,
	type OfficeLayout,
	type WallRun,
} from "../layout/office-layout";
import { fitCamera } from "./camera-fit";
import { CoordinatorModule } from "./coordinator-module";
import { DEPTH } from "./depth";
import { readPalette, type OfficePalette } from "./palette";
import { addProp, propTexKey, TRIM_FRAME } from "./render";
import { WorkstationModule } from "./workstation-module";

const WALL_THICK = 22;
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

	private wallSpan(run: WallRun | GlassRun): { x: number; y: number; w: number; h: number } {
		const horizontal = run.from.y === run.to.y;
		if (horizontal) {
			const x0 = Math.min(run.from.x, run.to.x) * CELL;
			const x1 = (Math.max(run.from.x, run.to.x) + 1) * CELL;
			return { x: x0, y: run.from.y * CELL, w: x1 - x0, h: WALL_THICK };
		}
		const y0 = Math.min(run.from.y, run.to.y) * CELL;
		const y1 = (Math.max(run.from.y, run.to.y) + 1) * CELL;
		return { x: run.from.x * CELL, y: y0, w: WALL_THICK, h: y1 - y0 };
	}

	private buildWalls(): void {
		for (const run of this.layout.walls) {
			const s = this.wallSpan(run);
			const g = this.add.graphics();
			g.fillStyle(this.palette.wallFace, 1);
			g.fillRect(s.x, s.y, s.w, s.h);
			g.fillStyle(this.palette.wallCap, 1);
			g.fillRect(s.x, s.y, s.w, Math.min(6, s.h));
			g.setDepth(s.y + s.h - 1);
		}
	}

	private buildGlass(): void {
		for (const run of this.layout.glass) {
			const horizontal = run.from.y === run.to.y;
			const from = horizontal ? Math.min(run.from.x, run.to.x) : Math.min(run.from.y, run.to.y);
			const to = horizontal ? Math.max(run.from.x, run.to.x) : Math.max(run.from.y, run.to.y);
			for (let i = from; i <= to; i++) {
				const cell: Cell = horizontal ? { x: i, y: run.from.y } : { x: run.from.x, y: i };
				const base = cellBaseline(cell);
				addProp(this, "45_glass-wall-panel", base.x, base.y, { displayW: CELL, depth: base.y });
			}
		}
	}

	private buildDoors(): void {
		const propFor: Record<Door["kind"], string> = {
			"glass-single": "46_glass-meeting-door",
			"glass-double": "47_glass-entrance-double-door",
		};
		for (const door of this.layout.doors) {
			const base = cellBaseline(door.cell);
			addProp(this, propFor[door.kind], base.x, base.y, { displayW: CELL, depth: base.y });
		}
	}

	private buildFurniture(): void {
		for (const item of this.layout.furniture) {
			const spec = this.textures.exists(propTexKey(item.propId));
			if (!spec) continue;
			const base = cellBaseline(item.cell);
			const x = base.x + (item.offset?.x ?? 0) * CELL;
			const y = base.y + (item.offset?.y ?? 0) * CELL;
			addProp(this, item.propId, x, y, { flip: item.flip, depth: this.propDepth(item.propId, y) });
		}
	}

	/** Peças de parede ficam atrás dos atores; o resto ordena pela baseline Y. */
	private propDepth(propId: string, y: number): number {
		return propId.match(/^(22|29|48|49|50)_/) ? -200 : y;
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
