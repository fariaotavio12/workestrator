import type { Meta, StoryObj } from "@storybook/react-vite";
import { AgentAvatar } from "./agent-avatar";

const meta = {
	title: "Components/Orchestrator/AgentAvatar",
	component: AgentAvatar,
	args: {
		character: "Male1",
		accentColor: "#4f46e5",
		size: 72,
	},
} satisfies Meta<typeof AgentAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
