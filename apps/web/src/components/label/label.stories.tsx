import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";

const Example = () => <Label htmlFor="campo">Nome completo</Label>;
const meta = {
	title: "Components/Label",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Padrao: Story = {};
