import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConfirmDialog } from "./confirm-dialog";

const meta = {
	title: "Components/Orchestrator/ConfirmDialog",
	component: ConfirmDialog,
	args: {
		open: true,
		onOpenChange: () => undefined,
		title: "Excluir squad?",
		description: "Esta acao remove o squad permanentemente.",
		confirmLabel: "Excluir",
		destructive: true,
		onConfirm: () => undefined,
	},
} satisfies Meta<typeof ConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Destructive: Story = {};
