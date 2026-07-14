import type { Meta, StoryObj } from "@storybook/react-vite";
import { FieldWrapper } from "./field-wrapper";

const Example = () => (
	<FieldWrapper className="w-80" label="Nome" description="Campo obrigatorio" showCharCounter length={8} maxLength={40}>
		<div className="border-input rounded-md border px-3 py-2 text-sm">Cliente A</div>
	</FieldWrapper>
);
const meta = {
	title: "Components/FieldWrapper",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Padrao: Story = {};
