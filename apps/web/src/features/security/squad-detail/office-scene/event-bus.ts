import type { AgentStatus } from "@/features/security/orchestrator-shared/types";
import type { PersonKey } from "../office/office-assets";
import type { Cell, Facing } from "./layout/office-layout";

/** Emissor tipado mínimo — ponte React↔Phaser. Não depende de Phaser (o lado React importa daqui). */
type Handler<T> = (payload: T) => void;

class TypedEmitter<Events extends Record<string, unknown>> {
	private handlers: { [K in keyof Events]?: Set<Handler<Events[K]>> } = {};

	on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
		(this.handlers[event] ??= new Set()).add(handler);
		return () => this.off(event, handler);
	}

	off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
		this.handlers[event]?.delete(handler);
	}

	emit<K extends keyof Events>(event: K, payload: Events[K]): void {
		this.handlers[event]?.forEach((h) => h(payload));
	}

	clear(): void {
		this.handlers = {};
	}
}

/** Estado visual de uma cadeira que a cena precisa para montar/atualizar a baia. */
export type SeatVisual = {
	seatId: string;
	slot: number;
	cell: Cell;
	facing: Facing;
	/** Personagem sentado, ou null quando a cadeira está vazia. */
	personKey: PersonKey | null;
	status: AgentStatus;
};

export type Rect = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };

/**
 * Projeções mundo→tela (px relativos ao container) que a cena publica p/ o overlay DOM posicionar
 * botões de clique, rótulos e balões. Recalculado só quando a câmera reajusta (cena estática).
 */
export type ProjectionMap = {
	zoom: number;
	/** Retângulo de clique de cada baia por seatId. */
	desks: Record<string, Rect>;
	coordinator: Rect;
	/** Ponto acima da cabeça (âncora do balão) por seatId e "coordinator". */
	bubbleAnchors: Record<string, Point>;
};

export type OfficeBusEvents = {
	// React → cena
	"state:seats": SeatVisual[];
	"state:coordinator": { thinking: boolean };
	// cena → React
	"scene:ready": undefined;
	"scene:projections": ProjectionMap;
};

export type OfficeBus = TypedEmitter<OfficeBusEvents>;

export const createOfficeBus = (): OfficeBus => new TypedEmitter<OfficeBusEvents>();
