import type { CharacterName, Gender } from "../types";

export const CHARACTERS: { name: CharacterName; gender: Gender }[] = [
	{ name: "Male1", gender: "male" },
	{ name: "Male2", gender: "male" },
	{ name: "Male3", gender: "male" },
	{ name: "Male4", gender: "male" },
	{ name: "Female1", gender: "female" },
	{ name: "Female2", gender: "female" },
	{ name: "Female3", gender: "female" },
	{ name: "Female4", gender: "female" },
	{ name: "Female5", gender: "female" },
	{ name: "Female6", gender: "female" },
];

export const genderOf = (name: CharacterName): Gender => CHARACTERS.find((c) => c.name === name)?.gender ?? "male";

/** Chave de um personagem do escritório (prefixo do arquivo em /public/bonecos_transparentes). */
export type PersonKey =
	| "01_manager-navy"
	| "02_orange-yellow"
	| "03_dark-purple"
	| "04_brown-green"
	| "05_black-charcoal"
	| "06_blond-blue"
	| "07_brown-red";

export type PersonPose = "seated" | "front" | "back" | "side";

/** Caminho público do sprite pixel-art do escritório. Assets em /public/bonecos_transparentes. */
export const personSrc = (key: PersonKey, pose: PersonPose): string =>
	`${import.meta.env.BASE_URL}bonecos_transparentes/${key}_${pose}.png`;

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

/**
 * Mapeia o `character` do agente para um dos 6 sprites físicos do escritório, de forma estável. Só
 * existem 6 sprites de agent (mais o do coordenador) — a partir do 7º `CharacterName` escolhido o
 * mapeamento repete um sprite já usado (limite de asset, não bug).
 */
export const personForCharacter = (character: CharacterName): PersonKey => {
	const idx = Math.max(
		0,
		CHARACTERS.findIndex((c) => c.name === character),
	);
	return AGENT_PEOPLE[idx % AGENT_PEOPLE.length];
};

/**
 * Subconjunto de `CHARACTERS` com sprite único no escritório (os 6 primeiros — do 7º em diante
 * `personForCharacter` já repete). Usado pelo seletor (`CharacterPicker`) e pelo default de agent novo
 * pra nunca oferecer/escolher uma identidade que nasce clonada de outra.
 */
export const PICKABLE_CHARACTERS = CHARACTERS.slice(0, AGENT_PEOPLE.length);
