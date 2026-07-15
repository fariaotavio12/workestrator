import type { CharacterName } from "@/features/security/orchestrator-shared/types";

/**
 * Assets do escritório novo (pixel-art) — peças da sala em /public/assets_office_transparente e
 * personagens em /public/bonecos_transparentes. Usa `BASE_URL` (não string crua com "/") porque no
 * build Electron o app roda via `file://` — ver `characters.ts`.
 */
const base = () => import.meta.env.BASE_URL;

export type PersonPose = "seated" | "front" | "back" | "side";

/** Chave de um personagem (prefixo do arquivo em /public/bonecos_transparentes). */
export type PersonKey =
	| "01_manager-navy"
	| "02_orange-yellow"
	| "03_dark-purple"
	| "04_brown-green"
	| "05_black-charcoal"
	| "06_blond-blue"
	| "07_brown-red";

export const personSrc = (key: PersonKey, pose: PersonPose): string =>
	`${base()}bonecos_transparentes/${key}_${pose}.png`;

/** O coordenador é sempre o gerente de terno navy. */
export const COORDINATOR_PERSON: PersonKey = "01_manager-navy";

/** Personagens disponíveis para agentes (o navy fica reservado ao coordenador). */
const AGENT_PEOPLE: PersonKey[] = [
	"02_orange-yellow",
	"03_dark-purple",
	"04_brown-green",
	"05_black-charcoal",
	"06_blond-blue",
	"07_brown-red",
];

const CHARACTER_ORDER: CharacterName[] = [
	"Male1",
	"Male2",
	"Male3",
	"Male4",
	"Female1",
	"Female2",
	"Female3",
	"Female4",
	"Female5",
	"Female6",
];

/** Mapeia o `character` legado do agente para um dos personagens novos, de forma estável. */
export const personForCharacter = (character: CharacterName): PersonKey => {
	const idx = Math.max(0, CHARACTER_ORDER.indexOf(character));
	return AGENT_PEOPLE[idx % AGENT_PEOPLE.length];
};
