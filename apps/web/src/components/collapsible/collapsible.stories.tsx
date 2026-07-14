import type { Meta, StoryObj } from "@storybook/react-vite";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

const Example = () => (
	<Collapsible defaultOpen className="border-border bg-card text-card-foreground w-80 rounded-lg border p-4">
		<CollapsibleTrigger className="text-foreground text-sm font-semibold">Resumo do atendimento</CollapsibleTrigger>
		<CollapsibleContent className="text-muted-foreground pt-3 text-sm">
			Cliente com cadastro validado e proxima etapa pendente.
		</CollapsibleContent>
	</Collapsible>
);

const meta = {
	title: "Components/Collapsible",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Aberto: Story = {};
