import { cn } from "@/app/utils/cn";
import { personForCharacter, personSrc, type PersonKey } from "@/features/security/orchestrator-shared/data/characters";
import type { CharacterName } from "@/features/security/orchestrator-shared/types";

type Props = (
	| { character: CharacterName; personKey?: never }
	// `personKey` pula o mapeamento de `character` — usado pelo coordenador, que não tem um `CharacterName`
	// próprio e é sempre ilustrado pelo sprite fixo do gerente (`COORDINATOR_PERSON`).
	| { character?: never; personKey: PersonKey }
) & {
	accentColor?: string;
	size?: number;
	className?: string;
};

/**
 * Preview do bonequinho do agent num quadro com borda de destaque. Reaproveitado em toda a app — sempre
 * o mesmo sprite que fica sentado no escritório (`squad-detail`), pra nunca divergir do que o usuário
 * escolhe no seletor de personagem.
 */
export const AgentAvatar = ({ character, personKey, accentColor, size = 64, className }: Props) => (
	<div
		className={cn("bg-muted/40 flex shrink-0 items-end justify-center overflow-hidden rounded-xl border-2", className)}
		style={{ width: size, height: size, borderColor: accentColor }}
	>
		<img
			src={personSrc(personKey ?? personForCharacter(character), "front")}
			alt={character ?? "Coordenador"}
			draggable={false}
			className="pointer-events-none h-[80%] w-auto select-none"
			style={{ imageRendering: "pixelated" }}
		/>
	</div>
);
