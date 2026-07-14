import { ThemeProvider } from "@/app/providers/useThemeContext";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ModeSwitcher } from "./mode-switcher";
import { ThemeSwitcher } from "./themeSwitcher";

const meta = {
	title: "Components/Theme",
	component: ThemeSwitcher,
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<ThemeProvider>
				<Story />
			</ThemeProvider>
		),
	],
	tags: ["autodocs"],
} satisfies Meta<typeof ThemeSwitcher>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Switcher: Story = {
	render: () => <ThemeSwitcher />,
};

export const SidebarMode: Story = {
	render: () => (
		<div className="bg-sidebar w-56 rounded-lg border p-2">
			<ModeSwitcher />
		</div>
	),
};
