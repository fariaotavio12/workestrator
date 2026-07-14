import type { Meta, StoryObj } from "@storybook/react-vite";

import { IconFile } from "./iconFile";

const meta = {
	title: "Components/File/IconFile",
	component: IconFile,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof IconFile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		type: "application/pdf",
		size: "md",
	},
};

export const FileTypes: Story = {
	render: () => (
		<div className="grid grid-cols-4 gap-4">
			{["application/pdf", "image/png", "text/csv", "application/zip"].map((type) => (
				<div key={type} className="flex flex-col items-center gap-2">
					<IconFile type={type} size="lg" />
					<span className="text-muted-foreground text-xs">{type.split("/").pop()}</span>
				</div>
			))}
		</div>
	),
};
