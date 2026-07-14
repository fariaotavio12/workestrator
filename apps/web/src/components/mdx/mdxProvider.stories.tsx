import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { components, MdxProvider } from "./mdxProvider";

const H1 = components.h1;
const Paragraph = components.p;
const Blockquote = components.blockquote;
const FaqExample = components.Faq;

const Example = () => (
	<MemoryRouter>
		<MdxProvider>
			<article className="text-foreground max-w-2xl">
				<H1>Guia rapido</H1>
				<Paragraph>Conteudo de ajuda renderizado com componentes compartilhados de MDX.</Paragraph>
				<Blockquote>Use exemplos curtos para manter a leitura objetiva.</Blockquote>
				<FaqExample items={[{ q: "Onde encontro suporte?", a: "Acesse a central de ajuda pelo menu principal." }]} />
			</article>
		</MdxProvider>
	</MemoryRouter>
);

const meta = {
	title: "Components/MdxProvider",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Padrao: Story = {};
