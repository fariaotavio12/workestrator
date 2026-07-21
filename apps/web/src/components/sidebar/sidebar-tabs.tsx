import { Rotas } from "@/app/routing/variables";
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/sidebar";
import { Typography } from "@/components/typography";
import { useSidebarViewStore, type SidebarView } from "@/features/security/orchestrator-shared/model";
import { Bot, Boxes, History } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

type Tab = {
	view: SidebarView;
	label: string;
	icon: typeof Bot;
	/** Presente = navega direto pra rota (Link). Ausente = só troca o painel da sidebar (Assistente). */
	url?: string;
	/** Match exato de pathname em vez de `startsWith` — necessário pra Execução, cuja rota é a raiz do dashboard. */
	exact?: boolean;
};

const TABS: Tab[] = [
	{ view: "assistant", label: "Assistente", icon: Bot },
	{ view: "squad", label: "Squads", icon: Boxes, url: Rotas.protegidas.orchestrator.squads },
	{ view: "squad", label: "Execução", icon: History, url: Rotas.protegidas.orchestrator.executions, exact: true },
];

/**
 * Nav principal (Assistente / Squads / Execução). Squads e Execução navegam direto pra rota — antes
 * exigiam trocar pro painel "squad" e clicar de novo num link idêntico logo abaixo, duplicando o
 * item visualmente. Assistente segue só trocando o painel (lista de sessões), sem rota fixa própria.
 */
export const SidebarViewTabs = () => {
	const view = useSidebarViewStore((state) => state.view);
	const setView = useSidebarViewStore((state) => state.setView);
	const { pathname } = useLocation();

	return (
		<SidebarGroup className="pb-0">
			<SidebarMenu>
				{TABS.map((tab) => {
					const isActive = tab.url
						? tab.exact
							? pathname === tab.url
							: pathname.startsWith(tab.url)
						: view === tab.view;
					const Icon = tab.icon;
					const content = (
						<>
							<Icon className="size-4" />
							<Typography variant="nav-link" as="span" className="group-data-[collapsible=icon]:hidden">
								{tab.label}
							</Typography>
						</>
					);

					return (
						<SidebarMenuItem key={tab.label}>
							{tab.url ? (
								<SidebarMenuButton asChild tooltip={tab.label} isActive={isActive}>
									<Link to={tab.url} aria-current={isActive ? "page" : undefined} onClick={() => setView(tab.view)}>
										{content}
									</Link>
								</SidebarMenuButton>
							) : (
								<SidebarMenuButton
									type="button"
									tooltip={tab.label}
									isActive={isActive}
									aria-pressed={isActive}
									onClick={() => setView(tab.view)}
								>
									{content}
								</SidebarMenuButton>
							)}
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
};
