import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, TabsContent, TabsContents, TabsList, TabsTrigger } from "./tabs";

const Example = () => (
	<Tabs defaultValue="resumo" className="w-96">
		<TabsList>
			<TabsTrigger value="resumo">Resumo</TabsTrigger>
			<TabsTrigger value="historico">Histórico</TabsTrigger>
			<TabsTrigger value="ajustes">Ajustes</TabsTrigger>
		</TabsList>
		<TabsContents className="border-border bg-card text-card-foreground mt-3 rounded-lg border p-4">
			<TabsContent value="resumo">
				<p className="text-muted-foreground text-sm">Indicadores principais consolidados.</p>
			</TabsContent>
			<TabsContent value="historico">
				<p className="text-muted-foreground text-sm">Últimas interações registradas.</p>
			</TabsContent>
			<TabsContent value="ajustes">
				<p className="text-muted-foreground text-sm">Preferencias do modulo.</p>
			</TabsContent>
		</TabsContents>
	</Tabs>
);

const UnderlineExample = () => (
	<Tabs defaultValue="ativos" className="w-96">
		<TabsList variant="underline">
			<TabsTrigger value="ativos">Ativos</TabsTrigger>
			<TabsTrigger value="pausados">Pausados</TabsTrigger>
			<TabsTrigger value="todos">Todos</TabsTrigger>
		</TabsList>
		<TabsContents className="text-muted-foreground mt-3 text-sm">
			<TabsContent value="ativos">Projetos em andamento.</TabsContent>
			<TabsContent value="pausados">Projetos sem atividade recente.</TabsContent>
			<TabsContent value="todos">Lista completa de projetos.</TabsContent>
		</TabsContents>
	</Tabs>
);

const meta = {
	title: "Components/Tabs",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Sublinhado: Story = {
	render: () => <UnderlineExample />,
};
