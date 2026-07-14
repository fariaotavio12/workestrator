"use client";

import { ChevronRight, Loader2, type LucideIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/sidebar";
import { Link, useLocation } from "react-router-dom";

type NavSubItem = {
	title: string;
	url: string;
};

type NavItem = {
	title: string;
	url: string;
	icon?: LucideIcon;
	isActive?: boolean;
	items?: NavSubItem[];
	/** Desabilita o item (ex: recurso sem permissão). Não navega, sem foco por tab. */
	disabled?: boolean;
	/** Troca o ícone por um spinner e bloqueia interação (ex: aguardando dados do item). */
	isLoading?: boolean;
};

export const NavMain = ({ items, groupLabel = "Platform" }: { groupLabel?: string; items?: NavItem[] }) => {
	const { pathname } = useLocation();

	if (!items?.length) return null;

	return (
		<SidebarGroup>
			{groupLabel ? <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel> : null}

			<SidebarMenu>
				{items.map((item) => {
					const hasSubItems = (item.items?.length ?? 0) > 0;

					// Sem subitens: vira link direto (sem Collapsible)
					if (!hasSubItems) {
						const isActive = pathname === item.url;
						const isDisabled = item.disabled || item.isLoading;

						if (isDisabled) {
							return (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										type="button"
										tooltip={item.title}
										disabled={item.disabled}
										aria-disabled={isDisabled}
										aria-busy={item.isLoading}
									>
										{item.isLoading ? <Loader2 className="animate-spin" /> : item.icon ? <item.icon /> : null}
										<span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						}

						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
									<Link to={item.url} aria-current={isActive ? "page" : undefined}>
										{item.icon ? <item.icon /> : null}
										<span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					}

					// Com subitens: Collapsible
					const hasActiveChild = item.items!.some((subItem) => pathname === subItem.url);

					return (
						<Collapsible key={item.title} asChild defaultOpen={item.isActive || hasActiveChild} className="group/collapsible">
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton tooltip={item.title} isActive={hasActiveChild}>
										{item.icon ? <item.icon /> : null}
										<span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
										<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>

								<CollapsibleContent>
									<SidebarMenuSub>
										{item.items!.map((subItem) => {
											const isSubActive = pathname === subItem.url;

											return (
												<SidebarMenuSubItem key={subItem.title} className="w-full items-center">
													<SidebarMenuSubButton asChild isActive={isSubActive}>
														<Link to={subItem.url} aria-current={isSubActive ? "page" : undefined}>
															<span>{subItem.title}</span>
														</Link>
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											);
										})}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
};
