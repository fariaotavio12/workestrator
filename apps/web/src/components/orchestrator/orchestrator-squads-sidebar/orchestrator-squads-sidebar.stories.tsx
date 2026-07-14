import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { OrchestratorSquadsSidebar } from "./orchestrator-squads-sidebar";

const meta = {
	title: "Components/Orchestrator/OrchestratorSquadsSidebar",
	component: OrchestratorSquadsSidebar,
	decorators: [
		(Story) => (
			<MemoryRouter>
				<div className="bg-sidebar text-sidebar-foreground w-72 border-r p-2">
					<Story />
				</div>
			</MemoryRouter>
		),
	],
} satisfies Meta<typeof OrchestratorSquadsSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
