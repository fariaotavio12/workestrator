import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MultiCombobox } from "./multi-combobox";

type DemoOption = {
	id: string;
	label: string;
};

const options: DemoOption[] = [
	{ id: "dashboard", label: "Dashboard" },
	{ id: "clientes", label: "Clientes" },
	{ id: "relatorios", label: "Relatorios" },
	{ id: "configuracoes", label: "Configurações" },
];

const meta = {
	title: "Components/MultiCombobox",
	component: MultiCombobox,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof MultiCombobox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {} as any,
	render: () => {
		const [values, setValues] = useState<DemoOption[]>(options.slice(0, 2));

		return (
			<div className="w-80">
				<MultiCombobox
					label="Areas"
					options={options}
					values={values}
					onChange={setValues}
					getOptionKey={(option) => option.id}
					getOptionLabel={(option) => option.label}
					maxVisibleValues={2}
					showSelectAllOption
					showClearAllOption
				/>
			</div>
		);
	},
};
