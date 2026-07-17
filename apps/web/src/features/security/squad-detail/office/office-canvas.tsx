import { lazy, Suspense } from "react";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { cn } from "@/app/utils/cn";
import { Skeleton } from "@/components";
import type { Squad } from "@/features/security/orchestrator-shared/types";
import { OfficeCompactList } from "./office-compact-list";
import type { CoordinatorView, OfficeSeatView } from "./office-types";

export type { OfficeSeatView, CoordinatorView } from "./office-types";

/** Alavanca de rollback: `false` volta ao fallback DOM (lista compacta) em qualquer largura. */
const USE_PHASER_OFFICE = true;

/** Escritório espacial (Phaser) carregado sob demanda — só este import puxa o phaser p/ um chunk async. */
const OfficeStage = lazy(() => import("../office-scene").then((m) => ({ default: m.OfficeStage })));

type Props = {
	squad: Squad;
	seats: OfficeSeatView[];
	coordinator: CoordinatorView;
	onCoordinatorClick?: () => void;
	onSeatClick?: (seatId: string) => void;
	onAnswerQuestion?: (answer: string) => void;
	onApproveCheckpoint?: () => void;
	onRejectCheckpoint?: () => void;
	className?: string;
};

/**
 * Escritório do squad: em desktop renderiza a cena espacial em Phaser (config + execução ao vivo);
 * em telas pequenas cai na lista vertical compacta. Todo o comportamento vem do `Runtime` via
 * `useOfficeChoreography` — este componente só decide qual superfície montar.
 */
export const OfficeCanvas = (props: Props) => {
	const isDesktop = useMediaQuery("(min-width: 640px)");

	if (isDesktop && USE_PHASER_OFFICE) {
		return (
			<Suspense fallback={<Skeleton className={cn("h-full min-h-[34rem] w-full rounded-xl", props.className)} />}>
				<OfficeStage {...props} />
			</Suspense>
		);
	}

	return <OfficeCompactList {...props} />;
};
