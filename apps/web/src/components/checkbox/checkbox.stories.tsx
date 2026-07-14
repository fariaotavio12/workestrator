import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "@/components/label";
import { Checkbox } from "./checkbox";

const Example = () => (
	<div className="flex items-center gap-2">
		<Checkbox id="terms" defaultChecked />
		<Label htmlFor="terms">Aceitar termos</Label>
	</div>
);
const meta = {
	title: "Components/Checkbox",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Marcado: Story = {};
