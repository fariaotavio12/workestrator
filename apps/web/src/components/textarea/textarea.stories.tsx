import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./textarea";

const Example = () => (
	<Textarea
		className="min-h-24"
		containerClassName="w-80"
		label="Observacao"
		placeholder="Descreva o contexto"
		description="Use uma descrição curta."
	/>
);
const meta = {
	title: "Components/Textarea",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Padrao: Story = {};
