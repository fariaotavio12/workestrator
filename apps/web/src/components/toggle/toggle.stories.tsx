import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, Bold } from "lucide-react";
import { Toggle } from "./toggle";

const Example = () => (
	<div className="flex items-center gap-3">
		<Toggle aria-label="Alternar negrito" pressed>
			<Bold className="size-4" />
		</Toggle>
		<Toggle variant="outline" aria-label="Alternar alertas">
			<Bell className="size-4" />
			Alertas
		</Toggle>
		<Toggle disabled>Inativo</Toggle>
	</div>
);

const meta = {
	title: "Components/Toggle",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Estados: Story = {};
