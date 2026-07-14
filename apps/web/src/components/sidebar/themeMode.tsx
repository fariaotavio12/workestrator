import { useHotkey } from "@/app/hooks/useHotkey";
import { useTheme } from "@/app/providers/useThemeContext";
import { Kbd } from "@/components/kbd";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/sidebar";
import { Switch } from "@/components/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/tooltip";
import { SunMoon } from "lucide-react";
import * as React from "react";

export const DARK_MODE_FORWARD_TYPE = "dark-mode-forward";

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
							{/* asChild + div: Switch já renderiza seu próprio <button role="switch">, então o
							    controle externo não pode ser <button> (aninhar button em button é HTML inválido
							    e cria ambiguidade de ativação por teclado). */}
							<SidebarMenuButton
								asChild
								size="default"
								tooltip="Tema"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
							>
								<div
									role="button"
									tabIndex={0}
									onClick={toggleTheme}
									onKeyDown={(event) => {
										if (event.key !== "Enter" && event.key !== " ") return;
										event.preventDefault();
										toggleTheme();
									}}
								>
									<SunMoon />
									<span className="group-data-[collapsible=icon]:hidden">Tema</span>
									<Switch
										checked={theme == "dark"}
										className="ml-auto group-data-[collapsible=icon]:hidden"
										size="sm"
										tabIndex={-1}
									/>
								</div>
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
}
