import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { SortableTH, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "./table";

type Customer = {
	name: string;
	status: string;
	total: string;
};

const rows: Customer[] = [
	{ name: "Ana Silva", status: "Ativo", total: "R$ 2.450" },
	{ name: "Bruno Costa", status: "Pendente", total: "R$ 860" },
	{ name: "Carla Souza", status: "Ativo", total: "R$ 1.290" },
];

const SortableHeaderExample = () => {
	const [sort, setSort] = useState<{ by: keyof Customer; direction: "asc" | "desc" }>();

	return (
		<div className="w-64 rounded-lg border p-4">
			<SortableTH<Customer> sortField="name" value={sort} onSortChange={setSort}>
				Cliente
			</SortableTH>
			<p className="text-muted-foreground mt-3 text-xs">
				Ordenacao: {sort ? `${sort.by} ${sort.direction}` : "sem ordenacao"}
			</p>
		</div>
	);
};

const meta = {
	title: "Components/Table/Primitives",
	component: Table,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className="w-[620px] rounded-lg border">
			<Table>
				<TableCaption>Resumo de clientes recentes</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead>Cliente</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Total</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row) => (
						<TableRow key={row.name}>
							<TableCell>{row.name}</TableCell>
							<TableCell>{row.status}</TableCell>
							<TableCell className="text-right">{row.total}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	),
};

export const SortableHeader: Story = {
	render: () => <SortableHeaderExample />,
};
