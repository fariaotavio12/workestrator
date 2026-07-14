import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { FooterButton } from "./footerForm";

const Example = () => (
	<MemoryRouter>
		<div className="w-80">
			<FooterButton isCreateMode isSubmitting={false} onCancel={() => undefined} />
		</div>
	</MemoryRouter>
);

const meta = {
	title: "Components/Form/FooterButton",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Criacao: Story = {};

export const Salvando: Story = {
	render: () => (
		<MemoryRouter>
			<div className="w-80">
				<FooterButton isCreateMode={false} isSubmitting onCancel={() => undefined} />
			</div>
		</MemoryRouter>
	),
};
