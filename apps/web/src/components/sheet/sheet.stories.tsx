import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";

const Example = () => (
	<Sheet defaultOpen>
		<SheetTrigger asChild>
			<Button>Abrir lateral</Button>
		</SheetTrigger>
		<SheetContent>
			<SheetHeader>
				<SheetTitle>Detalhes</SheetTitle>
				<SheetDescription>Resumo rapido do item selecionado.</SheetDescription>
			</SheetHeader>
		</SheetContent>
	</Sheet>
);
const meta = {
	title: "Components/Sheet",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Aberto: Story = {};
