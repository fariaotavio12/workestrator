import type { DeskAnchor } from "./office-layout";

/** Assento mínimo necessário para posicionar — desacopla do tipo Seat completo do domínio. */
export type SeatLike = { id: string; col: number; row: number };

export type SeatBinding = { seatId: string; anchor: DeskAnchor };

export type SeatResolution = {
	bindings: SeatBinding[];
	/** Assentos sem âncora (layout com menos baias que cadeiras) — não renderizados na cena. */
	overflow: string[];
};

/**
 * Liga cada Seat a uma âncora de baia. Assentos são ordenados por (row, col) — exatamente a ordem em
 * que `nextSeatPosition` os cria — e casados com as âncoras ordenadas por `slot`. Assim squads
 * existentes caem em slots determinísticos, sem migração de dados. Excedente vai para `overflow`.
 */
export const resolveSeatAnchors = (seats: SeatLike[], anchors: DeskAnchor[]): SeatResolution => {
	const sortedSeats = [...seats].sort((a, b) => a.row - b.row || a.col - b.col);
	const sortedAnchors = [...anchors].sort((a, b) => a.slot - b.slot);

	const bindings: SeatBinding[] = [];
	const overflow: string[] = [];
	sortedSeats.forEach((seat, i) => {
		const anchor = sortedAnchors[i];
		if (anchor) bindings.push({ seatId: seat.id, anchor });
		else overflow.push(seat.id);
	});
	return { bindings, overflow };
};
