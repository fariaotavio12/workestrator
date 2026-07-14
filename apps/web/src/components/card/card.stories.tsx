import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const Example = () => (
	<Card className="w-80">
		<CardHeader>
			<CardTitle>Plano ativo</CardTitle>
			<CardDescription>Renovacao em 12 dias</CardDescription>
			<CardAction>
				<Button size="sm" variant="outline">
					Editar
				</Button>
			</CardAction>
		</CardHeader>
		<CardContent>
			<p className="text-sm">Uso atual dentro do limite contratado.</p>
		</CardContent>
		<CardFooter>
			<span className="text-muted-foreground text-sm">Atualizado agora</span>
		</CardFooter>
	</Card>
);
const meta = {
	title: "Components/Card",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Padrao: Story = {};
