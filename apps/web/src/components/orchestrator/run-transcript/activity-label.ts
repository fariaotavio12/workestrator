import { Brain, FileText, Globe, Plug, Search, SquareTerminal, Wrench, type LucideIcon } from "lucide-react";
import type { LiveActivityItem } from "@/features/security/orchestrator-shared/types";

const short = (value: string, max = 64): string => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

/** Tenta ler o input (JSON) de uma tool pra extrair um resumo amigável; vazio se não parsear. */
const parseInput = (detail?: string): Record<string, unknown> => {
	if (!detail) return {};
	try {
		const value = JSON.parse(detail) as unknown;
		return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
	} catch {
		return {};
	}
};

const asString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/**
 * Rótulo humano e GENÉRICO de uma ação — derivado do tipo da tool, não do domínio. Serve pra qualquer
 * arquivo/tarefa: escreveu/leu arquivo, rodou comando, buscou, chamou ferramenta MCP.
 */
export const activityLabel = (item: LiveActivityItem): string => {
	if (item.kind === "thinking") return "Pensando";
	if (item.kind === "output") return "Resultado";
	const tool = item.toolName ?? "ferramenta";
	const input = parseInput(item.detail);
	const path = asString(input.file_path) ?? asString(input.path);
	switch (tool) {
		case "Write":
			return path ? `Escreveu ${path}` : "Escreveu arquivo";
		case "Edit":
		case "MultiEdit":
			return path ? `Editou ${path}` : "Editou arquivo";
		case "Read":
			return path ? `Leu ${path}` : "Leu arquivo";
		case "Bash":
			return asString(input.command) ? `Rodou: ${short(asString(input.command) as string)}` : "Rodou comando";
		case "Glob":
		case "Grep":
			return asString(input.pattern) ? `Buscou ${short(asString(input.pattern) as string)}` : "Buscou";
		default:
			if (tool.startsWith("mcp__")) return short((tool.split("__").pop() ?? tool).replace(/_/g, " "));
			return tool;
	}
};

/** Ícone (lucide) por família de ação — arquivo, terminal, busca, navegador, MCP, fallback. */
export const activityIcon = (item: LiveActivityItem): LucideIcon => {
	if (item.kind === "thinking") return Brain;
	if (item.kind === "output") return SquareTerminal;
	const tool = item.toolName ?? "";
	if (["Write", "Edit", "MultiEdit", "Read"].includes(tool)) return FileText;
	if (tool === "Bash") return SquareTerminal;
	if (tool === "Glob" || tool === "Grep") return Search;
	if (tool.includes("browser") || tool.includes("screenshot") || tool.includes("navigate")) return Globe;
	if (tool.startsWith("mcp__")) return Plug;
	return Wrench;
};
