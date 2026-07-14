import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DatePicker } from "./date-picker";

const meta = {
	title: "Components/DatePicker",
	component: DatePicker,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		const [date, setDate] = useState<Date | undefined>(new Date());

		return (
			<div className="w-72">
				<DatePicker label="Data" selectedDate={date} onDateChange={setDate} />
			</div>
		);
	},
};

export const WithConfirmation: Story = {
	render: () => {
		const [date, setDate] = useState<Date | undefined>();

		return (
			<div className="w-72">
				<DatePicker label="Data com confirmação" selectedDate={date} onDateChange={setDate} requiresConfirmation />
			</div>
		);
	},
};
