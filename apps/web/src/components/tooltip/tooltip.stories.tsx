import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const Example = () => (
	<TooltipProvider>
		<Tooltip defaultOpen>
			<TooltipTrigger asChild>
				<Button variant="outline">Ver status</Button>
			</TooltipTrigger>
			<TooltipContent>Atualizado agora</TooltipContent>
		</Tooltip>
	</TooltipProvider>
);
const meta = {
	title: "Components/Tooltip",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Aberto: Story = {};
