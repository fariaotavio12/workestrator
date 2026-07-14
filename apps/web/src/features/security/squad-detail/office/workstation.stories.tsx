import type { Meta, StoryObj } from "@storybook/react-vite";
import { Workstation } from "./workstation";

const meta = {
	title: "Components/Orchestrator/Workstation",
	component: Workstation,
	args: { position: { x: 50, y: 50 }, personKey: "02_orange-yellow", status: "idle", accentColor: "#f59e0b" },
	render: () => (
		<div className="relative h-[30rem] w-full overflow-hidden rounded-xl border" style={{ backgroundColor: "#7c5230" }}>
			<Workstation
				position={{ x: 30, y: 50 }}
				personKey="02_orange-yellow"
				status="idle"
				accentColor="#f59e0b"
				name="Fábio Fonte"
				role="Pesquisador"
			/>
			<Workstation position={{ x: 70, y: 50 }} personKey={null} status="idle" accentColor="#6366f1" />
		</div>
	),
} satisfies Meta<typeof Workstation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bancada: Story = {};
