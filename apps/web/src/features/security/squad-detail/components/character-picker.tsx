import { cn } from "@/app/utils/cn";
import {
	PICKABLE_CHARACTERS,
	personForCharacter,
	personSrc,
} from "@/features/security/orchestrator-shared/data/characters";
import type { CharacterName } from "@/features/security/orchestrator-shared/types";

type Props = {
	value: CharacterName;
	onChange: (name: CharacterName) => void;
	/** Personagens já usados por OUTROS agents deste squad — marcados para incentivar uma escolha distinta. */
	usedNames?: ReadonlySet<CharacterName>;
};

/**
 * Grade de personagens para escolher o bonequinho do agent. Só oferece os que têm sprite único no
 * escritório (`PICKABLE_CHARACTERS`) — sem sentido listar uma identidade que nasce clonada de outra.
 */
export const CharacterPicker = ({ value, onChange, usedNames }: Props) => (
	<div className="grid grid-cols-6 gap-2">
		{PICKABLE_CHARACTERS.map((c) => {
			const selected = value === c.name;
			const isUsed = !selected && usedNames?.has(c.name);
			return (
				<button
					type="button"
					key={c.name}
					onClick={() => onChange(c.name)}
					aria-pressed={selected}
					aria-label={isUsed ? `${c.name} — já usado por outro agent` : c.name}
					title={isUsed ? "Já usado por outro agent deste squad" : undefined}
					className={cn(
						"bg-muted/40 hover:border-ring relative flex items-end justify-center rounded-lg border p-1 transition-all",
						selected && "border-primary ring-primary/30 ring-2",
						isUsed && "opacity-50",
					)}
				>
					{isUsed && (
						<span
							className="border-background bg-warning absolute top-1 right-1 size-2 rounded-full border"
							aria-hidden="true"
						/>
					)}
					<img
						src={personSrc(personForCharacter(c.name), "front")}
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
