import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlignCenter, AlignLeft, AlignRight, List, Table2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const Example = () => (
	<div className="flex flex-col gap-4">
		<ToggleGroup type="single" defaultValue="lista" variant="outline">
			<ToggleGroupItem value="lista" aria-label="Visualizar em lista">
				<List className="size-4" />
				Lista
			</ToggleGroupItem>
			<ToggleGroupItem value="tabela" aria-label="Visualizar em tabela">
				<Table2 className="size-4" />
				Tabela
			</ToggleGroupItem>
		</ToggleGroup>
		<ToggleGroup type="multiple" defaultValue={["esquerda"]} size="sm" spacing={2}>
			<ToggleGroupItem value="esquerda" aria-label="Alinhar a esquerda">
				<AlignLeft className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="centro" aria-label="Alinhar ao centro">
				<AlignCenter className="size-4" />
			</ToggleGroupItem>
			<ToggleGroupItem value="direita" aria-label="Alinhar a direita">
				<AlignRight className="size-4" />
			</ToggleGroupItem>
		</ToggleGroup>
	</div>
);

const meta = {
	title: "Components/ToggleGroup",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};
