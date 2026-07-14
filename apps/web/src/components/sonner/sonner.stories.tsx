import { Button } from "@/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { Toaster } from "./sonner";

const meta = {
	title: "Components/Sonner",
	component: Toaster,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<>
			<Button type="button" onClick={() => toast.success("Toast exibido com sucesso")}>
				Mostrar toast
			</Button>
			<Toaster />
		</>
	),
};
