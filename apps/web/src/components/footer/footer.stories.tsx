import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { FooterLanding } from "./index";

const Example = () => (
	<MemoryRouter>
		<FooterLanding />
	</MemoryRouter>
);

const meta = {
	title: "Components/Footer",
	component: Example,
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Landing: Story = {};
