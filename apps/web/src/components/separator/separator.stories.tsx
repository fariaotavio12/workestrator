import type { Meta, StoryObj } from "@storybook/react-vite";
import { Separator } from "./separator";

const Example = () => (
	<div className="w-80 space-y-3">
		<p className="text-sm">Dados principais</p>
		<Separator />
		<p className="text-muted-foreground text-sm">Dados secundarios</p>
	</div>
);
const meta = {
	title: "Components/Separator",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Horizontal: Story = {};
