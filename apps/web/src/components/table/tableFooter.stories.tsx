import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { TableFooter } from "./tableFooter";

const TableFooterExample = () => {
	const [page, setPage] = useState(1);
	const [size, setSize] = useState(10);

	return (
		<div className="w-[640px] rounded-lg border">
			<TableFooter
				pagination={{
					page,
					size,
					totalElements: 86,
					totalPages: 9,
				}}
				onPageChange={setPage}
				onSizeChange={setSize}
			/>
		</div>
	);
};

const meta = {
	title: "Components/Table/Footer",
	component: TableFooter,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof TableFooter>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <TableFooterExample />,
};

export const FirstPage: Story = {
	args: {
		pagination: {
			page: 0,
			size: 25,
			totalElements: 86,
			totalPages: 4,
		},
		onPageChange: () => undefined,
		onSizeChange: () => undefined,
	},
	decorators: [
		(Story) => (
			<div className="w-[640px] rounded-lg border">
				<Story />
			</div>
		),
	],
};
