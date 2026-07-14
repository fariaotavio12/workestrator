import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const Example = () => (
	<Select defaultValue="ativo">
		<SelectTrigger className="w-56">
			<SelectValue placeholder="Status" />
		</SelectTrigger>
		<SelectContent>
			<SelectItem value="ativo">Ativo</SelectItem>
			<SelectItem value="pendente">Pendente</SelectItem>
			<SelectItem value="inativo">Inativo</SelectItem>
		</SelectContent>
	</Select>
);
const meta = {
	title: "Components/Select",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Padrao: Story = {};
