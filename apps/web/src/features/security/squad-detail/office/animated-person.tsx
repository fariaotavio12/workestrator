import type { CSSProperties } from "react";
import { getAnimatedSheet, type AnimName } from "./animated-people";
import { AnimatedSprite } from "./animated-sprite";
import { personSrc, type PersonKey, type PersonPose } from "./office-assets";

type Props = {
	personKey: PersonKey;
	pose: PersonPose;
	anim?: AnimName;
	displayWidth: number;
	className?: string;
	style?: CSSProperties;
};

/**
 * Ponto único de troca estático ↔ animado para um personagem do escritório. Personagens com folha de
 * sprite pronta (ver `animated-people.ts`) animam; os demais caem automaticamente no retrato estático
 * (`personSrc`), sem `if` espalhado pelos componentes que os usam.
 */
export const AnimatedPerson = ({ personKey, pose, anim = "idle", displayWidth, className, style }: Props) => {
	const sheet = getAnimatedSheet(personKey, pose, anim);

	if (sheet) {
		return <AnimatedSprite sheet={sheet} displayWidth={displayWidth} className={className} style={style} />;
	}

	return (
		<img
			src={personSrc(personKey, pose)}
			alt=""
			draggable={false}
			width={displayWidth}
			style={{ imageRendering: "pixelated", ...style }}
			className={className}
		/>
	);
};
