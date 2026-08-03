import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/button";
import { AppSheet, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";

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

export const Redimensionavel: Story = {
	render: () => (
		<AppSheet
			open
			onOpenChange={() => undefined}
			resizable
			widthKey="storybook-demo"
			title="Painel redimensionavel"
			description="Arraste a borda esquerda, use as setas com o handle focado ou maximize pelo botao do cabecalho."
			showFooter={false}
		>
			<pre className="bg-muted overflow-x-auto rounded-lg p-3 font-mono text-xs">
				{`{ "campo": "${"conteudo bem largo ".repeat(12)}" }`}
			</pre>
		</AppSheet>
	),
};
