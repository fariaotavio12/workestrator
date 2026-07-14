import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const Example = () => (
	<Popover defaultOpen>
		<PopoverTrigger asChild>
			<Button variant="outline">Filtros</Button>
		</PopoverTrigger>
		<PopoverContent className="w-64">
			<p className="text-sm">Ajuste os filtros da listagem.</p>
		</PopoverContent>
	</Popover>
);
const meta = {
	title: "Components/Popover",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Aberto: Story = {};
