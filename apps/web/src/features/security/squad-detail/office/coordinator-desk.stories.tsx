import type { Meta, StoryObj } from "@storybook/react-vite";
import { CoordinatorDesk } from "./coordinator-desk";

const meta = {
	title: "Components/Orchestrator/CoordinatorDesk",
	component: CoordinatorDesk,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		model: "claude-sonnet-5",
		onClick: () => undefined,
	},
	render: (args) => (
		<div
			className="bg-layout relative h-[28rem] w-full overflow-hidden rounded-xl border"
			style={{
				backgroundImage:
					"linear-gradient(90deg, color-mix(in oklch, var(--border) 48%, transparent) 1px, transparent 1px), linear-gradient(color-mix(in oklch, var(--border) 48%, transparent) 1px, transparent 1px)",
				backgroundSize: "48px 48px",
			}}
		>
			<CoordinatorDesk {...args} />
		</div>
	),
} satisfies Meta<typeof CoordinatorDesk>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
	args: {
		scene: { thinking: false },
	},
};

export const Thinking: Story = {
	args: {
		scene: { thinking: true },
	},
};
