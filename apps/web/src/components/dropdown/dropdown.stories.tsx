import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./dropdown";

const Example = () => (
	<DropdownMenu defaultOpen>
		<DropdownMenuTrigger asChild>
			<Button variant="outline">Ações</Button>
		</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuLabel>Cliente</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuItem>Editar</DropdownMenuItem>
			<DropdownMenuItem variant="destructive">Excluir</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
);
const meta = {
	title: "Components/Dropdown",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Aberto: Story = {};
