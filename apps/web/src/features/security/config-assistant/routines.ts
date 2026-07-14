import type { SlashCommand } from "@/components";

/** Rotina do assistente: um slash-command que preenche o composer com um pedido guiado. */
export type AssistantRoutine = SlashCommand & {
	title: string;
	/** Texto inserido no composer ao escolher a rotina. */
	template: string;
};

export const ASSISTANT_ROUTINES: AssistantRoutine[] = [
	{
		id: "criar-squad",
		title: "Criar squad",
		label: "/criar-squad",
		hint: "Monta um squad novo com agents",
		template: 'Crie um squad chamado "" com os seguintes agents: ',
	},
	{
		id: "rodar-squad",
		title: "Rodar squad",
		label: "/rodar-squad",
		hint: "Inicia a execução de um squad",
		template: 'Rode o squad "" com o briefing: ',
	},
	{
		id: "listar-squads",
		title: "Ver squads",
		label: "/listar-squads",
		hint: "Lista todos os seus squads",
		template: "Liste meus squads e o que cada um faz.",
	},
	{
		id: "listar-execucoes",
		title: "Ver execuções",
		label: "/listar-execucoes",
		hint: "Mostra o histórico de execuções de um squad",
		template: 'Liste as execuções do squad "".',
	},
	{
		id: "adicionar-agent",
		title: "Adicionar agent",
		label: "/adicionar-agent",
		hint: "Adiciona um agent a um squad",
		template: 'Adicione um agent ao squad "".',
	},
];
