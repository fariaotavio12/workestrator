// Limites e paleta de dados do orquestrador.
import type { CharacterName, ScriptKind } from "../types";

/** Máximo de cadeiras por squad — cabe bem no escritório 2D. */
export const MAX_SEATS = 16;

/** Personagem fixo que ilustra o coordenador — mesmo avatar no escritório e no mapa do run. */
export const COORDINATOR_CHARACTER: CharacterName = "Male1";

/** Rótulo em pt-BR de cada `ScriptKind` — fonte única usada em tabelas, badges e o formulário. */
export const SCRIPT_KIND_LABEL: Record<ScriptKind, string> = {
	command: "Comando",
	inline: "Script inline",
	file: "Arquivo",
	http: "HTTP",
	mcp: "MCP",
	connector: "Conector",
};

/** Cores de destaque disponíveis para um agent (valor de dado, aplicado inline). */
export const ACCENT_COLORS = [
	"#6366f1",
	"#0ea5e9",
	"#10b981",
	"#f59e0b",
	"#ef4444",
	"#ec4899",
	"#8b5cf6",
	"#14b8a6",
] as const;

export const newId = (): string =>
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const nowIso = (): string => new Date().toISOString();
