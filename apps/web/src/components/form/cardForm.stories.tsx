import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { UserRound } from "lucide-react";
import { CardForm } from "./cardForm";

const Example = () => (
	<div className="bg-card w-full max-w-3xl rounded-lg border">
		<CardForm
			title="Dados do perfil"
			caption="Informações usadas para identificar o usuário no painel."
			icon={<UserRound className="size-4" />}
			isFirst
			isLast
			buttons={
				<div className="ml-auto flex gap-2">
					<Button type="button" variant="outline">
						Cancelar
					</Button>
					<Button type="button">Salvar</Button>
				</div>
			}
		>
			<Input label="Nome" value="Maria Santos" readOnly />
			<Input label="Email" value="maria@empresa.com" readOnly />
		</CardForm>
	</div>
);

const meta = {
	title: "Components/Form/CardForm",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};
