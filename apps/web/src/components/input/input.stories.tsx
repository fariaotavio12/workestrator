import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mail, Search } from "lucide-react";
import { Input } from "./input";

const Example = () => (
	<div className="grid w-80 gap-4">
		<Input label="Email" placeholder="nome@empresa.com" iconLeft={<Mail className="size-4" />} />
		<Input label="Busca" placeholder="Buscar cliente" iconRight={<Search className="size-4" />} />
		<Input label="Código" value="ABC-123" readOnly />
		<Input label="Documento" error="Informe um documento valido" />
	</div>
);
const meta = {
	title: "Components/Input",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Estados: Story = {};
