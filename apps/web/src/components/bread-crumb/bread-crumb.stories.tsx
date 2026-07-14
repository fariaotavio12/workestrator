import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { BreadCrumbComponent } from "./bread-crumb";

const Example = () => (
	<MemoryRouter initialEntries={["/dashboard/settings"]}>
		<BreadCrumbComponent />
	</MemoryRouter>
);

const meta = {
	title: "Components/BreadCrumb",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};
