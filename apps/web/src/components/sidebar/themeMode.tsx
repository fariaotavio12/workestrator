import { useHotkey } from "@/app/hooks/useHotkey";
import { useTheme } from "@/app/providers/useThemeContext";
import { Kbd } from "@/components/kbd";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";
import { Moon, Sun } from "lucide-react";
import * as React from "react";

export const DARK_MODE_FORWARD_TYPE = "dark-mode-forward";

/** Toggle de tema — mesma linha quieta dos outros itens da sidebar, sem switch colorido. */
export const ModeSwitcher = () => {
	const { setTheme, theme } = useTheme();

	const toggleTheme = React.useCallback(() => {
		setTheme(theme === "dark" ? "light" : "dark");
	}, [theme, setTheme]);

	useHotkey({ key: ["d", "D"], ctrl: false, meta: false }, toggleTheme);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<TooltipProvider delayDuration={0}>
					<Tooltip>
						<TooltipTrigger asChild>
							<SidebarMenuButton type="button" tooltip="Tema" onClick={toggleTheme}>
								{theme === "dark" ? <Moon /> : <Sun />}
								<span className="group-data-[collapsible=icon]:hidden">Tema</span>
							</SidebarMenuButton>
						</TooltipTrigger>
						<TooltipContent className="flex items-center gap-2 pr-1">
							Alternar tema <Kbd>D</Kbd>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</SidebarMenuItem>
		</SidebarMenu>
	);
};
