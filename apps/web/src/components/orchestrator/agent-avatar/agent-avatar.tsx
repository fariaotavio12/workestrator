import { cn } from "@/app/utils/cn";
import {
	avatarSrc,
	personForCharacter,
	personSrc,
	type AvatarPose,
} from "@/features/security/orchestrator-shared/data/characters";
import type { CharacterName } from "@/features/security/orchestrator-shared/types";

type Props = {
	character: CharacterName;
	accentColor?: string;
	/** Só passe isto quando precisar do sprite animado por status (ex.: mapa de atividade do run) — o
	 * conjunto de sprites do escritório não tem poses de talk/blink/wave, só o retrato estático. Sem
	 * `pose`, mostra o mesmo bonequinho que fica sentado no escritório (`squad-detail`). */
	pose?: AvatarPose;
	size?: number;
	className?: string;
};

/** Preview do bonequinho do agent num quadro com borda de destaque. Reaproveitado em toda a app. */
export const AgentAvatar = ({ character, accentColor, pose, size = 64, className }: Props) => (
	<div
		className={cn("bg-muted/40 flex shrink-0 items-end justify-center overflow-hidden rounded-xl border-2", className)}
		style={{ width: size, height: size, borderColor: accentColor }}
	>
		<img
			src={pose ? avatarSrc(character, pose) : personSrc(personForCharacter(character), "front")}
			alt={character}
			draggable={false}
			className="pointer-events-none h-[80%] w-auto select-none"
			style={{ imageRendering: "pixelated" }}
		/>
	</div>
);
