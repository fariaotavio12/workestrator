import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Search, Settings } from "lucide-react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "./command";

const Example = () => (
	<Command className="border-border w-96 rounded-lg border shadow-sm">
		<CommandInput placeholder="Buscar acao..." />
		<CommandList>
			<CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
			<CommandGroup heading="Ações">
				<CommandItem>
					<Search className="size-4" />
					Buscar cliente
					<CommandShortcut>Ctrl K</CommandShortcut>
				</CommandItem>
				<CommandItem>
					<FileText className="size-4" />
					Gerar relatorio
				</CommandItem>
			</CommandGroup>
			<CommandSeparator />
			<CommandGroup heading="Sistema">
				<CommandItem>
					<Settings className="size-4" />
					Abrir configurações
				</CommandItem>
			</CommandGroup>
		</CommandList>
	</Command>
);

const meta = {
	title: "Components/Command",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};
