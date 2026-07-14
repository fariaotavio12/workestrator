import type { Meta, StoryObj } from "@storybook/react-vite";
import { ptBR } from "date-fns/locale";
import { Calendar } from "./calendar";

const meta = {
	title: "Components/Calendar",
	component: Calendar,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		mode: "single",
		selected: new Date(),
		locale: ptBR,
		fixedWeeks: true,
	},
};

export const DropdownCaption: Story = {
	args: {
		mode: "single",
		captionLayout: "dropdown",
		selected: new Date(),
		locale: ptBR,
		fixedWeeks: true,
	},
};
