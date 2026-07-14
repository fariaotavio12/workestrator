import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

const Example = () => (
	<div className="flex items-center gap-3">
		<Avatar>
			<AvatarImage src="https://github.com/shadcn.png" alt="Usuário" />
			<AvatarFallback>OF</AvatarFallback>
		</Avatar>
		<Avatar>
			<AvatarFallback>PT</AvatarFallback>
		</Avatar>
	</div>
);
const meta = {
	title: "Components/Avatar",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Padrao: Story = {};
