import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/sidebar";
import { Typography } from "@/components/typography";
import { useSidebarViewStore, type SidebarView } from "@/features/security/orchestrator-shared/model";
import { Bot, Boxes } from "lucide-react";

const TABS: { value: SidebarView; label: string; icon: typeof Bot }[] = [
	{ value: "assistant", label: "Assistente", icon: Bot },
	{ value: "squad", label: "Squads", icon: Boxes },
];

/** Nav principal (Assistente / Squads) — lista plana com estado ativo, sem cara de tab bar. */
export const SidebarViewTabs = () => {
	const view = useSidebarViewStore((state) => state.view);
	const setView = useSidebarViewStore((state) => state.setView);

	return (
		<SidebarGroup className="pb-0">
			<SidebarMenu>
				{TABS.map((tab) => {
					const isActive = view === tab.value;
					const Icon = tab.icon;
					return (
						<SidebarMenuItem key={tab.value}>
							<SidebarMenuButton
								type="button"
								tooltip={tab.label}
								isActive={isActive}
								aria-pressed={isActive}
								onClick={() => setView(tab.value)}
							>
								<Icon className="size-4" />
								<Typography variant="nav-link" as="span" className="group-data-[collapsible=icon]:hidden">
									{tab.label}
								</Typography>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
};
