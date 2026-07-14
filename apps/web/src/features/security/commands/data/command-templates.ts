import type { LucideIcon } from "lucide-react";
import { Boxes, Code2, Library, Plug, Sparkles, Terminal } from "lucide-react";

export type CommandTemplateKind = "assistant" | "squad" | "knowledge" | "script" | "mcp";

export type CommandTemplate = {
	id: string;
	title: string;
	description: string;
	prompt: string;
	kind: CommandTemplateKind;
	tags: string[];
	icon: LucideIcon;
};

export const commandTemplates: CommandTemplate[] = [
	{
		id: "create-skill",
		title: "Criar skill",
		description: "Transforma uma necessidade em uma skill reutilizavel com gatilhos, passos e checklist.",
		prompt:
			"Me ajude a criar uma skill nova. Quero objetivo, gatilhos, entradas, passos, exemplos e checklist de qualidade.",
		kind: "assistant",
		tags: ["skill", "produto"],
		icon: Sparkles,
	},
	{
		id: "plan-community-asset",
		title: "Planejar recurso publico",
		description: "Estrutura como publicar um squad, skill, conhecimento ou script para a comunidade.",
		prompt:
			"Transforme este recurso em um asset publico do Workestrator, com descricao, tags, permissoes, riscos e criterio de importacao: ",
		kind: "assistant",
		tags: ["community", "explore"],
		icon: Library,
	},
	{
		id: "run-squad-briefing",
		title: "Rodar squad com briefing",
		description: "Prepara uma execucao de squad com objetivo, contexto e resultado esperado.",
		prompt: "Rode o squad mais adequado para este briefing, explicando antes quais agentes devem participar: ",
		kind: "squad",
		tags: ["squad", "execucao"],
		icon: Boxes,
	},
	{
		id: "attach-knowledge",
		title: "Responder com conhecimento",
		description: "Orienta o assistente a usar uma base de conhecimento como fonte principal.",
		prompt: "Use a base de conhecimento mais relevante como fonte principal e responda com passos claros: ",
		kind: "knowledge",
		tags: ["rag", "conhecimento"],
		icon: Library,
	},
	{
		id: "prepare-script",
		title: "Preparar script seguro",
		description: "Cria um plano de script com entradas, saidas, riscos e validacao antes de executar.",
		prompt: "Prepare um script seguro para esta tarefa. Liste entradas, saidas, riscos, validacoes e o comando final: ",
		kind: "script",
		tags: ["script", "seguranca"],
		icon: Terminal,
	},
	{
		id: "mcp-preset",
		title: "Criar preset MCP",
		description: "Desenha um preset MCP importavel com ferramentas, escopos e configuracao.",
		prompt: "Crie um preset MCP para esta integracao, incluindo tools, permissoes, variaveis e exemplo de uso: ",
		kind: "mcp",
		tags: ["mcp", "integracao"],
		icon: Plug,
	},
	{
		id: "code-change",
		title: "Planejar mudanca de codigo",
		description: "Converte uma ideia tecnica em tarefas de implementacao e validacao.",
		prompt: "Planeje esta mudanca de codigo com arquivos provaveis, etapas, riscos, testes e ordem de execucao: ",
		kind: "assistant",
		tags: ["codigo", "planejamento"],
		icon: Code2,
	},
];

export const COMMAND_KIND_LABEL: Record<CommandTemplateKind, string> = {
	assistant: "Assistente",
	squad: "Squad",
	knowledge: "Conhecimento",
	script: "Script",
	mcp: "MCP",
};
