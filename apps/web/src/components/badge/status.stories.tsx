import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusProject } from "./status";

const Example = () => (
	<div className="flex flex-wrap gap-2">
		<StatusProject status="EM_ANDAMENTO" />
		<StatusProject status="FINALIZADO" />
		<StatusProject status="RECUSADO" />
		<StatusProject status="PENDENTE" />
		<StatusProject status="ATIVO" mode="icon" />
	</div>
);
const meta = {
	title: "Components/Status",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Estados: Story = {};
