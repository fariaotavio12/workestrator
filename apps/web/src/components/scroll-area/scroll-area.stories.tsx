import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollArea } from "./scroll-area";

const Example = () => (
	<ScrollArea className="h-40 w-72 rounded-md border p-4">
		<div className="space-y-3">
			{Array.from({ length: 12 }, (_, index) => (
				<p key={index} className="text-sm">
					Registro {index + 1}
				</p>
			))}
		</div>
	</ScrollArea>
);
const meta = {
	title: "Components/ScrollArea",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Lista: Story = {};
