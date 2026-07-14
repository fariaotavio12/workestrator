import { SidebarProvider } from "@/components/sidebar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { HeaderDashboardDesktop, HeaderDashboardMobile } from "./headerDashboard";

const meta = {
	title: "Components/Navbar",
	component: HeaderDashboardDesktop,
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<MemoryRouter initialEntries={["/dashboard"]}>
				<SidebarProvider>
					<Story />
				</SidebarProvider>
			</MemoryRouter>
		),
	],
	tags: ["autodocs"],
} satisfies Meta<typeof HeaderDashboardDesktop>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DashboardDesktop: Story = {
	render: () => <HeaderDashboardDesktop />,
};

export const DashboardMobile: Story = {
	render: () => <HeaderDashboardMobile />,
};
