import type { Meta, StoryObj } from "@storybook/react-vite";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

const Example = () => (
	<Accordion type="single" collapsible className="w-80">
		<AccordionItem value="item-1">
			<AccordionTrigger>Como funciona?</AccordionTrigger>
			<AccordionContent>Organiza conteudos em secoes expansivas.</AccordionContent>
		</AccordionItem>
		<AccordionItem value="item-2">
			<AccordionTrigger>Quando usar?</AccordionTrigger>
			<AccordionContent>Use para perguntas frequentes e blocos secundarios.</AccordionContent>
		</AccordionItem>
	</Accordion>
);
const meta = {
	title: "Components/Accordion",
	component: Example,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
} satisfies Meta<typeof Example>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Padrao: Story = {};
