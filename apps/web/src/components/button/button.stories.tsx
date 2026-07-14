import type { Meta, StoryObj } from "@storybook/react-vite";
import { Save, Trash2 } from "lucide-react";
import { Button } from "./button";

const Example = () => (
	<div className="flex flex-wrap items-center gap-3">
		<Button>
			<Save className="size-4" />
			Salvar
		</Button>
		<Button variant="secondary">Secundario</Button>
		<Button variant="outline">Cancelar</Button>
		<Button variant="destructive">
			<Trash2 className="size-4" />
			Excluir
		</Button>
		<Button disabled>Indisponível</Button>
	</div>
);
const meta = {
	title: "Components/Button",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Padrao: Story = {};
