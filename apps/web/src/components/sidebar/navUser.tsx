"use client";

import { ChevronsUpDown, LogOut } from "lucide-react";

import { useAuth } from "@/app/providers/authProvider";
import { cn } from "@/app/utils/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/avatar/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/dropdown";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/sidebar";
import { userMenuNavItems } from "@/components/sidebar/variables";
import { Typography } from "@/components/typography";
import { useNavigate } from "react-router-dom";

export const NavUser = () => {
	const { isMobile } = useSidebar();
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const initials = user?.name?.substring(0, 2).toUpperCase() || "CN";

	if (user == undefined) return null;
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
						>
							<Avatar className="h-7 w-7 shrink-0 rounded-lg group-data-[collapsible=icon]:size-4">
								<AvatarImage src={user?.img} alt={user?.name || "Avatar"} />
								<AvatarFallback className="rounded-lg text-[10px] group-data-[collapsible=icon]:text-[8px]">
									{user?.name?.substring(0, 2).toUpperCase() || "CN"}
								</AvatarFallback>
							</Avatar>
							<span className="min-w-0 flex-1 truncate text-left text-sm font-medium group-data-[collapsible=icon]:hidden">
								{user?.name}
							</span>
							<ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-72 rounded-xl p-2"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={8}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="bg-muted/40 flex items-center gap-3 rounded-lg px-3 py-3 text-left">
								<Avatar className="size-10 rounded-lg">
									<AvatarImage src={user?.img} alt={user?.name || "Avatar"} />
									<AvatarFallback className="rounded-lg text-xs font-semibold">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="grid min-w-0 flex-1 gap-0.5 text-left">
									<Typography variant="body-sm" className="truncate font-medium">
										{user.name}
									</Typography>
									<Typography variant="caption" className="text-muted-foreground truncate font-normal">
										{user.email}
									</Typography>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator className="my-2" />

						{userMenuNavItems.map((item) => (
							<DropdownMenuItem
								key={item.url}
								className="flex min-h-10 cursor-pointer gap-3 rounded-lg px-3 py-2"
								onClick={() => navigate(item.url)}
							>
								{item.icon ? <item.icon className="text-muted-foreground size-4" /> : null}
								<Typography variant="body-sm" as="span">
									{item.title}
								</Typography>
							</DropdownMenuItem>
						))}

						<DropdownMenuSeparator className="my-2" />

						<DropdownMenuItem
							className={cn(
								"flex min-h-10 cursor-pointer gap-3 rounded-lg px-3 py-2",
								"text-muted-foreground focus:text-foreground",
							)}
							onClick={() => logout()}
						>
							<LogOut className="size-4" />
							<Typography variant="body-sm" as="span">
								Sair
							</Typography>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
};
