import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "./drawer";

const Example = () => (
	<Drawer open>
		<DrawerTrigger asChild>
			<Button>Abrir painel</Button>
		</DrawerTrigger>
		<DrawerContent>
			<DrawerHeader>
				<DrawerTitle>Resumo</DrawerTitle>
				<DrawerDescription>Informações adicionais do registro.</DrawerDescription>
			</DrawerHeader>
		</DrawerContent>
	</Drawer>
);
const meta = {
	title: "Components/Drawer",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Aberto: Story = {};
