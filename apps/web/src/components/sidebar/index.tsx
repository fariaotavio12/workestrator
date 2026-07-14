"use client";

import * as React from "react";

import { AppBrandIcon, appBrand } from "@/app/config/branding";
import { NavMain } from "@/components/sidebar/navMain";
import { NavUser } from "@/components/sidebar/navUser";
import { SidebarViewTabs } from "@/components/sidebar/sidebar-tabs";
import { ModeSwitcher } from "@/components/sidebar/themeMode";
import { squadNavItems } from "@/components/sidebar/variables";
import { AssistantSessionsSidebar, OrchestratorSquadsSidebar } from "@/components/orchestrator";
import { useSidebarViewStore } from "@/features/security/orchestrator-shared/model";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, SidebarTrigger } from "./sidebar";

export * from "./sidebar";

export const AppSidebar = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
	const view = useSidebarViewStore((state) => state.view);

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader className="flex flex-row items-center gap-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-4">
				<AppBrandIcon className="aspect-square size-9 group-data-[collapsible=icon]:hidden" />
				<span className="truncate text-left text-sm leading-tight font-semibold group-data-[collapsible=icon]:hidden">
					{appBrand.name}
				</span>
				<SidebarTrigger className="ml-auto shrink-0 rounded-full group-data-[collapsible=icon]:ml-0! group-data-[collapsible=icon]:size-9" />
			</SidebarHeader>

			<SidebarContent>
				<SidebarViewTabs />
				{view === "assistant" ? (
					<AssistantSessionsSidebar />
				) : (
					<>
						<NavMain items={squadNavItems} groupLabel="" />
						<OrchestratorSquadsSidebar />
					</>
				)}
			</SidebarContent>
			<SidebarFooter className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-4 [@media(max-height:800px)]:gap-0 [@media(max-height:800px)]:py-0 [@media(max-height:800px)]:pb-1">
				<ModeSwitcher />
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
};
