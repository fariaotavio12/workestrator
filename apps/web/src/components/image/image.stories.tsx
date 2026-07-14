import type { Meta, StoryObj } from "@storybook/react-vite";
import { MotionEffect } from "./effects/motion-effect";
import { MdxImage } from "./mdxImage";

const meta = {
	title: "Components/Image",
	component: MdxImage,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof MdxImage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Mdx: Story = {
	args: {
		src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=900&auto=format&fit=crop",
		alt: "Mesa de trabalho com notebook",
		caption: "Imagem com legenda para conteudo MDX.",
	},
};

export const Motion: Story = {
	args: {} as any,
	render: () => (
		<MotionEffect fade slide={{ direction: "up", offset: 16 }} className="w-72 rounded-lg border bg-card p-4">
			<p className="text-sm font-medium">Bloco animado</p>
			<p className="text-muted-foreground mt-1 text-sm">Exemplo usando MotionEffect.</p>
		</MotionEffect>
	),
};
