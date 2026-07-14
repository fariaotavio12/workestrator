import type { Meta, StoryObj } from "@storybook/react-vite";
import type { AgentStatus } from "@/features/security/orchestrator-shared/types";
import { Workstation } from "./workstation";

const demoAgents: {
	name: string;
	role: string;
	personKey: NonNullable<Parameters<typeof Workstation>[0]["personKey"]>;
	status: AgentStatus;
	x: number;
	y: number;
}[] = [
	{ name: "Ana Contexto", role: "Pesquisa", personKey: "02_orange-yellow", status: "idle", x: 22, y: 47 },
	{ name: "Bruno Build", role: "Implementacao", personKey: "03_dark-purple", status: "working", x: 42, y: 47 },
	{ name: "Clara QA", role: "Revisao", personKey: "04_brown-green", status: "checkpoint", x: 62, y: 47 },
	{ name: "Diego Docs", role: "Entrega", personKey: "06_blond-blue", status: "done", x: 82, y: 47 },
];

const meta = {
	title: "Components/Orchestrator/Workstation",
	component: Workstation,
	parameters: {
		layout: "fullscreen",
	},
	args: { position: { x: 50, y: 50 }, personKey: "02_orange-yellow", status: "idle", accentColor: "var(--warning)" },
	render: () => (
		<div
			className="bg-layout relative h-[32rem] w-full overflow-hidden rounded-xl border"
			style={{
				backgroundImage:
					"linear-gradient(90deg, color-mix(in oklch, var(--border) 48%, transparent) 1px, transparent 1px), linear-gradient(color-mix(in oklch, var(--border) 48%, transparent) 1px, transparent 1px)",
				backgroundSize: "48px 48px",
			}}
		>
			{demoAgents.map((agent) => (
				<Workstation
					key={agent.name}
					position={{ x: agent.x, y: agent.y }}
					personKey={agent.personKey}
					status={agent.status}
					accentColor="var(--primary)"
					name={agent.name}
					role={agent.role}
				/>
			))}
			<Workstation position={{ x: 50, y: 79 }} personKey={null} status="idle" accentColor="var(--muted-foreground)" />
		</div>
	),
} satisfies Meta<typeof Workstation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllStates: Story = {};

export const WithStreamingBubble: Story = {
	render: () => (
		<div className="bg-layout relative h-[26rem] w-full overflow-hidden rounded-xl border">
			<Workstation
				position={{ x: 50, y: 62 }}
				personKey="03_dark-purple"
				status="working"
				accentColor="var(--primary)"
				name="Bruno Build"
				role="Implementacao"
				bubble={{
					tone: "neutral",
					kind: "speech",
					text: "Estou ajustando o canvas e validando o estado visual da bancada.",
					toolLabel: "Storybook",
					streaming: true,
				}}
			/>
		</div>
	),
};

export const EmptySeat: Story = {
	render: () => (
		<div className="bg-layout relative h-[24rem] w-full overflow-hidden rounded-xl border">
			<Workstation position={{ x: 50, y: 55 }} personKey={null} status="idle" accentColor="var(--muted-foreground)" />
		</div>
	),
};
