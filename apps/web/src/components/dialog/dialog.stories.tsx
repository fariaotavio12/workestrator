import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./dialog";

const Example = () => (
	<Dialog defaultOpen>
		<DialogTrigger asChild>
			<Button>Abrir</Button>
		</DialogTrigger>
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Confirmar alteracao</DialogTitle>
				<DialogDescription>Revise os dados antes de continuar.</DialogDescription>
			</DialogHeader>
			<DialogFooter>
				<Button variant="outline">Cancelar</Button>
				<Button>Confirmar</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
);
const meta = {
	title: "Components/Dialog",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Aberto: Story = {};
