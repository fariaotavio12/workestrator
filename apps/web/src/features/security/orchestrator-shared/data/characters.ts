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

/**
 * Pose do sprite derivada do estado de execução do agente — única fonte, reusada pelo escritório
 * (`squad-detail/office`) e pelo mapa do run (`run-activity-map`) para nunca divergirem.
 */
export const poseForStatus = (status: AgentStatus): AvatarPose => {
	if (status === "working") return "talk";
	if (status === "done") return "wave";
	return "blink";
};
