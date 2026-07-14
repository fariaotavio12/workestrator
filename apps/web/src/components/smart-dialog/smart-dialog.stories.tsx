import { OverlayPreferenceProvider } from "@/app/providers/ui-overlay-preference";
import { Button } from "@/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info } from "lucide-react";
import { SmartOverlay } from "./smart-dialog";

const meta = {
	title: "Components/SmartOverlay",
	component: SmartOverlay,
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<OverlayPreferenceProvider>
				<Story />
			</OverlayPreferenceProvider>
		),
	],
	tags: ["autodocs"],
} satisfies Meta<typeof SmartOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {} as any,
	render: () => (
		<SmartOverlay
			title="SmartOverlay"
			description="Overlay padrao com escolha entre centro e lateral."
			headerIcon={<Info className="size-5" />}
			trigger={<Button type="button">Abrir overlay</Button>}
		>
			<p className="text-muted-foreground text-sm">Conteudo do fluxo contextual.</p>
		</SmartOverlay>
	),
};

export const ForcedSidebar: Story = {
	args: {} as any,
	render: () => (
		<SmartOverlay
			title="Painel lateral"
			description="Exemplo com posicionamento forçado."
			forcePlacement="right"
			trigger={
				<Button type="button" variant="outline">
					Abrir lateral
				</Button>
			}
		>
			<div className="flex flex-col gap-3 text-sm">
				<p className="text-muted-foreground">Use para formularios e detalhes sem sair da pagina.</p>
			</div>
		</SmartOverlay>
	),
};
