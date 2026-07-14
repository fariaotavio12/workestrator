import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";

const Example = () => (
	<div className="flex flex-wrap gap-2">
		<Badge>Novo</Badge>
		<Badge variant="secondary">Interno</Badge>
		<Badge variant="success">Ativo</Badge>
		<Badge variant="warning">Pendente</Badge>
		<Badge variant="destructive">Erro</Badge>
		<Badge variant="outline">Rascunho</Badge>
	</div>
);
const meta = {
	title: "Components/Badge",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Variantes: Story = {};
