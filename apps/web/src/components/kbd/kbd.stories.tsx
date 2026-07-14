import type { Meta, StoryObj } from "@storybook/react-vite";
import { Kbd, KbdGroup } from "./kbd";

const Example = () => (
	<KbdGroup>
		<Kbd>Ctrl</Kbd>
		<Kbd>K</Kbd>
	</KbdGroup>
);
const meta = {
	title: "Components/Kbd",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Atalho: Story = {};
