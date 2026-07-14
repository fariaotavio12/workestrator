import type { Meta, StoryObj } from "@storybook/react-vite";
import { Faq } from "./faq";

const meta = {
	title: "Components/Faq",
	component: Faq,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: {
		items: [
			{ q: "Como acompanho minha assinatura?", a: "Acesse o painel e abra a area de assinatura." },
			{ q: "Posso alterar meus dados depois?", a: "Sim. As informações podem ser editadas nas configurações." },
		],
	},
} satisfies Meta<typeof Faq>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};

export const Vazio: Story = {
	args: {
		items: [],
	},
};
