import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./skeleton";

const Example = () => (
	<div className="grid w-80 gap-3">
		<Skeleton className="h-4 w-3/4" />
		<Skeleton className="h-4 w-full" />
		<Skeleton className="h-10 w-full" />
	</div>
);
const meta = {
	title: "Components/Skeleton",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Carregando: Story = {};
