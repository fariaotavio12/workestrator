import { cn } from "@/app/utils/cn";
import { avatarSrc, CHARACTERS } from "@/features/security/orchestrator-shared/data/characters";
import type { CharacterName } from "@/features/security/orchestrator-shared/types";

type Props = {
	value: CharacterName;
	onChange: (name: CharacterName) => void;
};

/** Grade de personagens para escolher o bonequinho do agent. */
export const CharacterPicker = ({ value, onChange }: Props) => (
	<div className="grid grid-cols-5 gap-2">
		{CHARACTERS.map((c) => {
			const selected = value === c.name;
			return (
				<button
					type="button"
					key={c.name}
					onClick={() => onChange(c.name)}
					aria-pressed={selected}
					aria-label={c.name}
					className={cn(
						"bg-muted/40 hover:border-ring flex items-end justify-center rounded-lg border p-1 transition-all",
						selected && "border-primary ring-primary/30 ring-2",
					)}
				>
					<img
						src={avatarSrc(c.name)}
						alt={c.name}
						draggable={false}
						className="pointer-events-none h-10 w-auto select-none"
						style={{ imageRendering: "pixelated" }}
					/>
				</button>
			);
		})}
	</div>
);
