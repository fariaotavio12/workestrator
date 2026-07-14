import { cn } from "@/app/utils/cn";
import { avatarSrc, type AvatarPose } from "@/features/security/orchestrator-shared/data/characters";
import type { CharacterName } from "@/features/security/orchestrator-shared/types";

type Props = {
	character: CharacterName;
	accentColor?: string;
	pose?: AvatarPose;
	size?: number;
	className?: string;
};

/** Preview do bonequinho (sprite pixel-art) num quadro com borda de destaque. */
export const AgentAvatar = ({ character, accentColor, pose = "talk", size = 64, className }: Props) => (
	<div
		className={cn("bg-muted/40 flex shrink-0 items-end justify-center overflow-hidden rounded-xl border-2", className)}
		style={{ width: size, height: size, borderColor: accentColor }}
	>
		<img
			src={avatarSrc(character, pose)}
			alt={character}
			draggable={false}
			className="pointer-events-none h-[80%] w-auto select-none"
			style={{ imageRendering: "pixelated" }}
		/>
	</div>
);
