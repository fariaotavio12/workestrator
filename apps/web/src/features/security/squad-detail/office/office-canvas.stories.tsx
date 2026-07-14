import type { Meta, StoryObj } from "@storybook/react-vite";
import { seedSquads } from "@/features/security/orchestrator-shared/data/seeds";
import type { Runtime, Squad } from "@/features/security/orchestrator-shared/types";
import { OfficeCanvas, type OfficeSeatView } from "./office-canvas";

const [baseSquad] = seedSquads();

const seatsViewOf = (squad: Squad): OfficeSeatView[] =>
	squad.seats.map((seat) => {
		const agent = seat.agentId ? squad.agents.find((a) => a.id === seat.agentId) : null;
		return {
			seatId: seat.id,
			agent: agent
				? {
						name: agent.name,
						role: agent.role,
						character: agent.character,
						accentColor: agent.accentColor,
						model: agent.modelRef.model,
					}
				: null,
			status: squad.runtime.perAgentStatus[seat.id] ?? "idle",
		};
	});

const withRuntime = (patch: Partial<Runtime>): Squad => ({
	...baseSquad,
	runtime: { ...baseSquad.runtime, ...patch },
});

const meta = {
	title: "Components/Orchestrator/OfficeCanvas",
	component: OfficeCanvas,
	args: {
		coordinator: { model: "claude-sonnet-5", maxSteps: 12 },
		onCoordinatorClick: () => undefined,
		onSeatClick: () => undefined,
		onAnswerQuestion: () => undefined,
		onApproveCheckpoint: () => undefined,
		onRejectCheckpoint: () => undefined,
	},
	render: (args) => <OfficeCanvas {...args} className="h-[36rem]" />,
} satisfies Meta<typeof OfficeCanvas>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Squad ocioso — modo config: sentar/editar agentes, sem coreografia de execução. */
export const Config: Story = {
	args: { squad: baseSquad, seats: seatsViewOf(baseSquad) },
};

/** Coordenador decidindo o próximo passo — spotlight + balão "decidindo…" na mesa central. */
export const CoordinatorThinking: Story = {
	args: (() => {
		const squad = withRuntime({ status: "running", coordinatorThinking: true });
		return { squad, seats: seatsViewOf(squad) };
	})(),
};

/** Um agente trabalhando: caminhou até o ponto de ação, streaming no balão de fala. */
export const AgentWorking: Story = {
	args: (() => {
		const seatId = baseSquad.seats.find((s) => s.agentId)?.id ?? "seat-1";
		const squad = withRuntime({
			status: "running",
			pendingSeatId: seatId,
			perAgentStatus: { [seatId]: "working" },
			streamingText: "Levantando as fontes mais relevantes sobre o tema pedido no briefing...",
		});
		return { squad, seats: seatsViewOf(squad) };
	})(),
};

/** Checkpoint pendente: aprovar/rejeitar antes do agente seguir. */
export const Checkpoint: Story = {
	args: (() => {
		const seatId = baseSquad.seats.find((s) => s.agentId)?.id ?? "seat-1";
		const squad = withRuntime({
			status: "checkpoint",
			pendingSeatId: seatId,
			pendingCheckpointKind: "before",
			perAgentStatus: { [seatId]: "checkpoint" },
		});
		return { squad, seats: seatsViewOf(squad) };
	})(),
};

/** Agent perguntou algo no meio do turno — balão interativo com opções. */
export const AgentQuestion: Story = {
	args: (() => {
		const seatId = baseSquad.seats.find((s) => s.agentId)?.id ?? "seat-1";
		const squad = withRuntime({
			status: "awaiting_input",
			pendingSeatId: seatId,
			perAgentStatus: { [seatId]: "checkpoint" },
			pendingQuestion: {
				seatId,
				question: "Priorizo velocidade de entrega ou qualidade do texto final?",
				options: ["Velocidade", "Qualidade"],
			},
		});
		return { squad, seats: seatsViewOf(squad) };
	})(),
};
