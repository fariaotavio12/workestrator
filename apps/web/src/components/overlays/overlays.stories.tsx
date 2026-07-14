import { OverlayPreferenceProvider } from "@/app/providers/ui-overlay-preference";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { DialogSubscriptionError } from "./subscriptionError";
import { DialogSubscriptionSucess } from "./subscriptionSucess";

const meta = {
	title: "Components/Overlays",
	component: DialogSubscriptionSucess,
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => (
			<MemoryRouter initialEntries={["/?modal=payment-success"]}>
				<OverlayPreferenceProvider>
					<Story />
				</OverlayPreferenceProvider>
			</MemoryRouter>
		),
	],
	tags: ["autodocs"],
} satisfies Meta<typeof DialogSubscriptionSucess>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PaymentSuccess: Story = {
	render: () => <DialogSubscriptionSucess />,
};

export const PaymentError: Story = {
	decorators: [
		(Story) => (
			<MemoryRouter initialEntries={["/?modal=payment-error"]}>
				<OverlayPreferenceProvider>
					<Story />
				</OverlayPreferenceProvider>
			</MemoryRouter>
		),
	],
	render: () => <DialogSubscriptionError />,
};
