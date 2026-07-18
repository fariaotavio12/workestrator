import { useEffect, useMemo } from "react";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { personForCharacter } from "@/features/security/orchestrator-shared/data/characters";
import type { OfficeSeatView } from "../office/office-types";
import { useOfficeChoreography, type ActorScene } from "../office/use-office-choreography";
import type { OfficeBus, SeatVisual } from "./event-bus";
import type { OfficeLayout } from "./layout/office-layout";
import { resolveSeatAnchors } from "./layout/seat-anchor-resolution";

type BridgeResult = { actors: ActorScene[]; coordinatorThinking: boolean };

/**
 * Ponte entre o estado React (coreografia derivada do Runtime) e a cena Phaser: resolve seat→âncora,
 * monta os `SeatVisual` e os empurra pelo bus. Só emite depois que a cena avisa `ready` (senão o
 * primeiro estado se perde), e re-emite a cada mudança. Devolve os atores/coordenador p/ o overlay.
 */
export const useOfficeBridge = (
	bus: OfficeBus,
	squad: Squad,
	seats: OfficeSeatView[],
	layout: OfficeLayout,
	ready: boolean,
): BridgeResult => {
	const { actors, coordinator } = useOfficeChoreography(squad, seats);

	const seatVisuals = useMemo<SeatVisual[]>(() => {
		const { bindings } = resolveSeatAnchors(squad.seats, layout.deskAnchors);
		const actorBySeat = new Map(actors.map((a) => [a.seatId, a]));
		return bindings.map(({ seatId, anchor }) => {
			const actor = actorBySeat.get(seatId);
			return {
				seatId,
				slot: anchor.slot,
				cell: anchor.cell,
				facing: anchor.facing,
				personKey: actor?.agent ? personForCharacter(actor.agent.character) : null,
				status: actor?.status ?? "idle",
			};
		});
	}, [squad.seats, layout.deskAnchors, actors]);

	useEffect(() => {
		if (ready) bus.emit("state:seats", seatVisuals);
	}, [bus, seatVisuals, ready]);

	useEffect(() => {
		if (ready) bus.emit("state:coordinator", { thinking: coordinator.thinking });
	}, [bus, coordinator.thinking, ready]);

	return { actors, coordinatorThinking: coordinator.thinking };
};
