import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Combobox } from "./combobox";

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
	title: "Components/Combobox",
	component: Combobox,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Combobox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {} as any,
	render: () => {
		const [value, setValue] = useState<DemoOption | undefined>(options[0]);

		return (
			<div className="w-72">
				<Combobox
					label="Area"
					options={options}
					value={value}
					onChange={setValue}
					onClear={() => setValue(undefined)}
					getOptionKey={(option) => option.id}
					getOptionLabel={(option) => option.label}
					placeholder="Selecione uma area"
				/>
			</div>
		);
	},
};

export const Loading: Story = {
	args: {} as any,
	render: () => (
		<div className="w-72">
			<Combobox
				label="Area"
				options={options}
				getOptionKey={(option) => option.id}
				getOptionLabel={(option) => option.label}
				loading
			/>
		</div>
	),
};
