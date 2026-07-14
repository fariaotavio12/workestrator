import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileInput } from "./input";

const meta = {
	title: "Components/File/FileInput",
	component: FileInput,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof FileInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		label: "Anexos",
		placeholder: "Adicionar arquivo",
		helperText: "PDF, PNG ou JPG ate 5 MB.",
		acceptedFileTypes: [".pdf", ".png", ".jpg"],
		className: "w-96",
		onAddFiles: () => undefined,
	},
};

export const Multiple: Story = {
	args: {
		label: "Documentos",
		placeholder: "Adicionar documentos",
		multiple: true,
		maxFiles: 3,
		className: "w-96",
		onAddFiles: () => undefined,
	},
};

export const WithError: Story = {
	args: {
		label: "Contrato",
		placeholder: "Adicionar contrato",
		error: "Envie um arquivo PDF valido.",
		className: "w-96",
		onAddFiles: () => undefined,
	},
};
