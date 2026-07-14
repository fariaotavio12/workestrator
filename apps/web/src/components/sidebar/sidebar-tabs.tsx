import { cn } from "@/app/utils/cn";
import { useSidebarViewStore, type SidebarView } from "@/features/security/orchestrator-shared/model";
import { Bot, Boxes } from "lucide-react";

const TABS: { value: SidebarView; label: string; icon: typeof Bot }[] = [
	{ value: "assistant", label: "Assistente", icon: Bot },
	{ value: "squad", label: "Squad", icon: Boxes },
];

/** Alternador Assistente / Squad no topo da sidebar — some no modo colapsado (só ícones). */
export const SidebarViewTabs = () => {
	const view = useSidebarViewStore((state) => state.view);
	const setView = useSidebarViewStore((state) => state.setView);

	return (
		<div className="bg-muted text-muted-foreground mx-2 mt-2 grid grid-cols-2 gap-1 rounded-lg p-1 group-data-[collapsible=icon]:hidden">
			{TABS.map((tab) => {
				const isActive = view === tab.value;
				const Icon = tab.icon;
				return (
					<button
						key={tab.value}
						type="button"
						onClick={() => setView(tab.value)}
						aria-pressed={isActive}
						className={cn(
							"flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors",
							isActive
								? "bg-background text-foreground shadow-sm"
								: "hover:text-foreground cursor-pointer",
						)}
					>
						<Icon className="size-4" />
						{tab.label}
					</button>
				);
			})}
		</div>
	);
};
