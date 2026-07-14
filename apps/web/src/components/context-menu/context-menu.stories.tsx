import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "./context-menu";

const Example = () => (
	<ContextMenu>
		<ContextMenuTrigger className="border-border bg-card text-muted-foreground flex h-32 w-72 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm">
			Clique com o botao direito para abrir o menu
		</ContextMenuTrigger>
		<ContextMenuContent>
			<ContextMenuLabel>Cliente</ContextMenuLabel>
			<ContextMenuSeparator />
			<ContextMenuItem>
				Editar
				<ContextMenuShortcut>Ctrl E</ContextMenuShortcut>
			</ContextMenuItem>
			<ContextMenuItem>Duplicar</ContextMenuItem>
			<ContextMenuCheckboxItem checked>Receber alertas</ContextMenuCheckboxItem>
			<ContextMenuSeparator />
			<ContextMenuItem disabled>Arquivar</ContextMenuItem>
		</ContextMenuContent>
	</ContextMenu>
);

const meta = {
	title: "Components/ContextMenu",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Interativo: Story = {};
