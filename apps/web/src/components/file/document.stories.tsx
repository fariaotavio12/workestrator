import type { Meta, StoryObj } from "@storybook/react-vite";

import { DocumentComponent } from "./document";

const sampleFile = new File(["relatorio"], "relatorio-financeiro.pdf", {
	type: "application/pdf",
	lastModified: new Date("2026-05-01T12:00:00Z").getTime(),
});

const meta = {
	title: "Components/File/Document",
	component: DocumentComponent,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof DocumentComponent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LocalFile: Story = {
	args: {
		id: "local",
		file: sampleFile,
		onViewPreview: true,
		onViewDownload: true,
		onViewRemove: true,
		onRemove: () => undefined,
		className: "w-[520px]",
	},
};

export const PublicUrl: Story = {
	args: {
		id: "url",
		url: "https://example.com/files/contrato.pdf",
		onViewPreview: true,
		onViewCopyLink: true,
		onViewDownload: true,
		className: "w-[520px]",
	},
};
