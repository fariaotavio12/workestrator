import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { CustomLink } from "./link";

const Example = () => (
	<MemoryRouter>
		<div className="flex flex-wrap items-center gap-3">
			<CustomLink to="/dashboard" variant="default">
				Acessar painel
			</CustomLink>
			<CustomLink to="/help-center/introducao" variant="outline">
				Central de ajuda
			</CustomLink>
			<CustomLink to="/politica-de-privacidade" variant="link" size="link">
				Política de privacidade
			</CustomLink>
		</div>
	</MemoryRouter>
);

const meta = {
	title: "Components/Link",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Variantes: Story = {};
