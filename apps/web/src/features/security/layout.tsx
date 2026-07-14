import { HeaderDashboardMobile } from "@/components/navbar/headerDashboard";
import { GlobalRunDialog, GlobalSquadHistoryDialog, OrchestratorScheduler } from "@/components/orchestrator";
import { DialogSubscriptionError } from "@/components/overlays/subscriptionError";
import { DialogSubscriptionSucess } from "@/components/overlays/subscriptionSucess";
import { AppSidebar } from "@/components/sidebar/index";
import { SidebarInset } from "@/components/sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/app/utils/cn";
import { Rotas } from "@/app/routing/variables";

export const LayoutDashboard = () => {
	const { pathname } = useLocation();
	const isAssistantRoute = pathname.startsWith(Rotas.protegidas.orchestrator.assistant);

	return (
		<>
			<AppSidebar id="sideBarLayout" />
			<SidebarInset
				className={cn("min-w-0 overflow-x-hidden", isAssistantRoute && "max-h-svh min-h-0 overflow-hidden")}
			>
				<HeaderDashboardMobile />
				<div className={cn("flex flex-1 flex-col pb-18 lg:pb-0", isAssistantRoute && "min-h-0 overflow-hidden")}>
					<Outlet />
				</div>
				<DialogSubscriptionSucess />
				<DialogSubscriptionError />
				<GlobalRunDialog />
				<GlobalSquadHistoryDialog />
				<OrchestratorScheduler />
			</SidebarInset>
		</>
	);
};
