import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "./date-picker-range";

const meta = {
	title: "Components/DateRangePicker",
	component: DateRangePicker,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof DateRangePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		const [range, setRange] = useState<DateRange | undefined>({
			from: new Date(),
			to: new Date(),
		});

		return (
			<div className="w-80">
				<DateRangePicker label="Periodo" selectedRange={range} onRangeChange={setRange} />
			</div>
		);
	},
};

export const WithQuickSelection: Story = {
	render: () => {
		const [range, setRange] = useState<DateRange | undefined>();

		return (
			<div className="w-80">
				<DateRangePicker
					label="Periodo com atalhos"
					selectedRange={range}
					onRangeChange={setRange}
					showQuickSelection
				/>
			</div>
		);
	},
};
