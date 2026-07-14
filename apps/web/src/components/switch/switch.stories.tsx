import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./switch";

const Example = () => (
	<Switch label="Receber notificações" description="Enviar avisos importantes por email." defaultChecked />
);
const meta = {
	title: "Components/Switch",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ligado: Story = {};
