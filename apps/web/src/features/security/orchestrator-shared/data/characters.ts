import type { AgentStatus, CharacterName, Gender } from "../types";

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

// Personagens que só têm um frame de aceno (nome de arquivo diferente).
const SINGLE_WAVE = new Set<CharacterName>(["Male3", "Male4", "Female3", "Female4", "Female5", "Female6"]);

export type AvatarPose = "talk" | "blink" | "wave";

/**
 * Caminho público do sprite do personagem. Assets em /public/assets/avatars.
 * Usa `import.meta.env.BASE_URL` (não uma string crua começando com "/") porque no build do
 * Electron o app é servido via `file://` — um caminho absoluto de raiz vira raiz do sistema de
 * arquivos, não a raiz do app, e a imagem quebra. `BASE_URL` já resolve certo pra cada modo do Vite.
 */
export const avatarSrc = (name: CharacterName, pose: AvatarPose = "talk"): string => {
	const base = import.meta.env.BASE_URL;
	if (pose === "wave") {
		return SINGLE_WAVE.has(name) ? `${base}assets/avatars/${name}_wave.png` : `${base}assets/avatars/${name}_1wave.png`;
	}
	return `${base}assets/avatars/${name}_${pose}.png`;
};

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

/**
 * Caminho público do sprite pixel-art do escritório (diferente do `avatarSrc` acima — é a arte que
 * de fato aparece sentada no escritório, `squad-detail`). Assets em /public/bonecos_transparentes.
 */
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

/**
 * Pose do sprite derivada do estado de execução do agente — única fonte, reusada pelo escritório
 * (`squad-detail/office`) e pelo mapa do run (`run-activity-map`) para nunca divergirem.
 */
export const poseForStatus = (status: AgentStatus): AvatarPose => {
	if (status === "working") return "talk";
	if (status === "done") return "wave";
	return "blink";
};
