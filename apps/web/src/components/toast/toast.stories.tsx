import type { Meta, StoryObj } from "@storybook/react-vite";

import { Toast } from "./toast";

const meta = {
	title: "Components/Toast",
	component: Toast,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Toast>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Success: Story = {
	args: {
		type: "success",
		title: "Alteracoes salvas",
		message: "As informações foram atualizadas com sucesso.",
		onClose: () => undefined,
	},
};

export const Error: Story = {
	args: {
		type: "error",
		title: "Não foi possível salvar",
		message: "Revise os campos destacados e tente novamente.",
		onClose: () => undefined,
	},
};

export const Info: Story = {
	args: {
		type: "info",
		message: "A sincronização será concluída em alguns instantes.",
		onClose: () => undefined,
	},
};
