import { appBrand } from "@/app/config/branding";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarChart3, Settings, Users } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "./sidebar";

const meta = {
	title: "Components/Sidebar",
	component: Sidebar,
	parameters: {
		layout: "fullscreen",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<SidebarProvider>
			<Sidebar collapsible="none">
				<SidebarHeader className="p-4 text-sm font-semibold">{appBrand.shortName}</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Gestao</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{[
									{ label: "Painel", icon: BarChart3, active: true },
									{ label: "Clientes", icon: Users },
									{ label: "Configurações", icon: Settings },
								].map((item) => (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton isActive={item.active}>
											<item.icon />
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
		</SidebarProvider>
	),
};
