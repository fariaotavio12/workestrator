import type { Meta, StoryObj } from "@storybook/react-vite";
import { seedSquads } from "@/features/security/orchestrator-shared/data/seeds";
import { RunDialog } from "./run-dialog";

const [sampleSquad] = seedSquads();

const meta = {
	title: "Components/Orchestrator/RunDialog",
	component: RunDialog,
	args: {
		open: true,
		onOpenChange: () => undefined,
		squad: sampleSquad,
	},
} satisfies Meta<typeof RunDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
