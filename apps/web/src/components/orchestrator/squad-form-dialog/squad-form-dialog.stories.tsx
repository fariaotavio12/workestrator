import type { Meta, StoryObj } from "@storybook/react-vite";
import { seedSquads } from "@/features/security/orchestrator-shared/data/seeds";
import { SquadFormDialog } from "./squad-form-dialog";

const [sampleSquad] = seedSquads();

const meta = {
	title: "Components/Orchestrator/SquadFormDialog",
	component: SquadFormDialog,
	args: {
		open: true,
		onOpenChange: () => undefined,
	},
} satisfies Meta<typeof SquadFormDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Create: Story = {};

export const Edit: Story = {
	args: {
		squad: sampleSquad,
	},
};
