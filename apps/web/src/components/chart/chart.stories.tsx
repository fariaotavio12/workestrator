import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "./chart";

const data = [
	{ month: "Jan", receita: 186, custos: 80 },
	{ month: "Fev", receita: 305, custos: 200 },
	{ month: "Mar", receita: 237, custos: 120 },
	{ month: "Abr", receita: 273, custos: 190 },
	{ month: "Mai", receita: 209, custos: 130 },
	{ month: "Jun", receita: 214, custos: 140 },
];

const chartConfig = {
	receita: {
		label: "Receita",
		color: "var(--primary)",
	},
	custos: {
		label: "Custos",
		color: "var(--muted-foreground)",
	},
} satisfies ChartConfig;

const meta = {
	title: "Components/Chart",
	component: ChartContainer,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof ChartContainer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BarComparison: Story = {
	args: {} as any,
	render: () => (
		<div className="w-[560px] max-w-full">
			<ChartContainer config={chartConfig}>
				<BarChart accessibilityLayer data={data}>
					<CartesianGrid vertical={false} />
					<XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
					<ChartTooltip content={<ChartTooltipContent />} />
					<ChartLegend content={<ChartLegendContent />} />
					<Bar dataKey="receita" fill="var(--color-receita)" radius={4} />
					<Bar dataKey="custos" fill="var(--color-custos)" radius={4} />
				</BarChart>
			</ChartContainer>
		</div>
	),
};
