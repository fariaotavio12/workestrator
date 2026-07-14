import type { Meta, StoryObj } from "@storybook/react-vite";
import { Progress } from "./progress-bar";

const Example = () => (
	<div className="w-80">
		<Progress value={62} />
	</div>
);
const meta = {
	title: "Components/Progress",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Parcial: Story = {};
