import { Rotas } from "@/app/routing/variables";
import { Boxes, Cpu, History, KeyRound, Library, Sparkles, Terminal, type LucideIcon } from "lucide-react";

export type SidebarNavSubItem = {
	title: string;
	url: string;
};

export type SidebarNavItem = {
	title: string;
	url: string;
	icon?: LucideIcon;
	isActive?: boolean;
	items?: SidebarNavSubItem[];
	disabled?: boolean;
	isLoading?: boolean;
	showInMobileNav?: boolean;
};

export type SidebarNavGroup = {
	groupLabel?: string;
	items: SidebarNavItem[];
};

/** Itens fixos da aba "Squad" — a lista dinâmica de squads vem do `OrchestratorSquadsSidebar`. */
export const squadNavItems: SidebarNavItem[] = [
	{
		title: "Squads",
		url: Rotas.protegidas.orchestrator.squads,
		icon: Boxes,
		showInMobileNav: true,
	},
	{
		title: "Execução",
		url: Rotas.protegidas.orchestrator.executions,
		icon: History,
		showInMobileNav: true,
	},
];

/** Áreas de configuração — movidas do nav principal para o dropdown do usuário (rodapé da sidebar). */
export const userMenuNavItems: SidebarNavItem[] = [
	{ title: "Scripts", url: Rotas.protegidas.orchestrator.scripts, icon: Terminal },
	{ title: "Modelos", url: Rotas.protegidas.orchestrator.models, icon: Cpu },
	{ title: "Conhecimento", url: Rotas.protegidas.orchestrator.knowledge, icon: Library },
	{ title: "Segredos", url: Rotas.protegidas.orchestrator.secrets, icon: KeyRound },
];

/** Nav inferior do mobile — sem tabs; expõe as áreas principais como links diretos. */
export const getMobileSidebarItems = (): SidebarNavItem[] => [
	{ title: "Assistente", url: Rotas.protegidas.orchestrator.assistant, icon: Sparkles },
	...squadNavItems,
];
